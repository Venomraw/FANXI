"""
PIETRO — Quicksilver — Game Command Division

Prediction nudger.  Maximises prediction submission rate by identifying
users who haven't predicted upcoming matches and delivering in-app
notifications at the right moment.

Responsibilities:
  1. match_nudge       — detect matches kicking off within 60 min,
                         nudge users who haven't predicted yet.
  2. conversion_check  — track whether nudged users went on to predict.

Severity scale:
  Always 0 — PIETRO is informational, never critical.
  He nudges, he doesn't escalate.

Safety rules:
  - Max 1 nudge per user per match (NudgeLog dedup)
  - Never nudge users who already predicted
  - Never nudge for matches > 90 min away or already kicked off
  - Never write to approval_queue
"""
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select, func

from app.db import engine
from app.models import (
    AgentRun, User, MatchPrediction,
    NudgeLog, InAppNotification,
)

logger = logging.getLogger("fanxi.agents.pietro")


class Pietro:
    """Quicksilver — prediction nudger for Game Command."""

    AGENT = "PIETRO"
    DEPARTMENT = "game_command"

    # ----- public interface -----

    def run_match_nudge(self, match_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Nudge users who haven't predicted upcoming matches.
        If match_id is provided, nudge for that match only.
        Otherwise, nudge for all matches kicking off within 60 minutes.
        """
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        if match_id:
            matches = self._get_fixture_by_id(match_id)
        else:
            matches = self._get_upcoming_fixtures(minutes_ahead=60)

        if not matches:
            findings.append({
                "check": "no_imminent_matches",
                "severity": 0,
                "message": "No matches within 60 minutes — nothing to nudge",
            })
        else:
            with Session(engine) as session:
                # Pre-compute IQ threshold for top 20%
                iq_threshold = self._get_iq_threshold(session)

                for match in matches:
                    result = self._nudge_for_match(session, match, iq_threshold)
                    findings.append(result)
                    sent = result.get("nudges_sent", 0)
                    if sent > 0:
                        actions.append(
                            f"Sent {sent} in-app nudge(s) for "
                            f"{match['home_team']} vs {match['away_team']}"
                        )
                session.commit()

        severity = 0  # PIETRO is always informational
        result = self._build_result("match_nudge", severity, findings, actions)
        self._save_run(result)

        total_sent = sum(f.get("nudges_sent", 0) for f in findings)
        logger.info(
            "PIETRO_MATCH_NUDGE matches=%d nudges_sent=%d",
            len(matches), total_sent,
        )
        return result

    def run_conversion_check(self) -> Dict[str, Any]:
        """Check if nudged users went on to submit predictions."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []
        now = datetime.now(timezone.utc)

        with Session(engine) as session:
            # Get unconverted nudges for matches that have started (within last 6h)
            cutoff = now - timedelta(hours=6)
            unconverted = session.exec(
                select(NudgeLog).where(
                    NudgeLog.converted == False,  # noqa: E712
                    NudgeLog.sent_at >= cutoff,
                )
            ).all()

            if not unconverted:
                findings.append({
                    "check": "no_unconverted_nudges",
                    "severity": 0,
                    "message": "No unconverted nudges to check",
                })
            else:
                conversions = 0
                match_ids_checked = set()

                for nudge in unconverted:
                    match_ids_checked.add(nudge.match_id)
                    # Check if user submitted a prediction
                    prediction = session.exec(
                        select(MatchPrediction).where(
                            MatchPrediction.user_id == nudge.user_id,
                            MatchPrediction.match_id == nudge.match_id,
                        )
                    ).first()

                    if prediction:
                        nudge.converted = True
                        session.add(nudge)
                        conversions += 1

                session.commit()

                rate = round(conversions / len(unconverted) * 100, 1) if unconverted else 0
                findings.append({
                    "check": "conversion_results",
                    "severity": 0,
                    "nudges_checked": len(unconverted),
                    "conversions_found": conversions,
                    "conversion_rate": rate,
                    "matches_covered": sorted(match_ids_checked),
                    "message": (
                        f"Checked {len(unconverted)} nudge(s): "
                        f"{conversions} converted ({rate}%)"
                    ),
                })

        severity = 0
        result = self._build_result("conversion_check", severity, findings, actions)
        self._save_run(result)

        logger.info("PIETRO_CONVERSION_CHECK findings=%d", len(findings))
        return result

    def report(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the latest N runs for PIETRO."""
        with Session(engine) as session:
            runs = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [self._run_to_dict(r) for r in runs]

    # ----- nudge logic -----

    def _nudge_for_match(
        self,
        session: Session,
        match: Dict[str, Any],
        iq_threshold: int,
    ) -> Dict[str, Any]:
        """Build and send nudges for a single match."""
        match_id = match["id"]
        home = match["home_team"]
        away = match["away_team"]
        kickoff = match.get("_kickoff_dt")  # datetime, set by fixture helpers
        now = datetime.now(timezone.utc)

        # Minutes until kickoff (rounded to nearest 5)
        if kickoff:
            raw_mins = (kickoff - now).total_seconds() / 60
            mins_display = max(5, int(round(raw_mins / 5) * 5))
        else:
            mins_display = 60

        # Get all users
        all_users = session.exec(select(User)).all()

        # Get users who already predicted this match
        predicted_user_ids = set(
            uid for uid in session.exec(
                select(MatchPrediction.user_id).where(
                    MatchPrediction.match_id == match_id,
                )
            ).all() if uid is not None
        )

        # Get users already nudged for this match (dedup)
        nudged_user_ids = set(
            uid for uid in session.exec(
                select(NudgeLog.user_id).where(
                    NudgeLog.match_id == match_id,
                )
            ).all()
        )

        # Count total predictions per user (for new-user detection)
        user_prediction_counts: Dict[int, int] = {}
        for user in all_users:
            if user.id not in predicted_user_ids and user.id not in nudged_user_ids:
                count = session.exec(
                    select(func.count(MatchPrediction.id)).where(
                        MatchPrediction.user_id == user.id,
                    )
                ).one()
                user_prediction_counts[user.id] = count

        nudges_sent = 0
        nudges_skipped_dedup = 0

        for user in all_users:
            uid = user.id
            if uid is None:
                continue

            # Skip if already predicted
            if uid in predicted_user_ids:
                continue

            # Skip if already nudged (dedup)
            if uid in nudged_user_ids:
                nudges_skipped_dedup += 1
                continue

            # Pick template
            title, message = self._pick_template(
                user, home, away, mins_display,
                iq_threshold, user_prediction_counts.get(uid, 0),
            )

            # Write notification
            notification = InAppNotification(
                user_id=uid,
                title=title,
                message=message,
                action_url=f"/predict?match={match_id}",
                notification_type="prediction_nudge",
                expires_at=kickoff,
            )
            session.add(notification)

            # Write nudge log (dedup record)
            log = NudgeLog(
                user_id=uid,
                match_id=match_id,
                nudge_type="in_app",
                match_kickoff=kickoff,
            )
            session.add(log)
            nudges_sent += 1

        return {
            "check": "match_nudge",
            "severity": 0,
            "match_id": match_id,
            "match": f"{home} vs {away}",
            "time_until_kickoff_mins": mins_display,
            "total_users": len(all_users),
            "already_predicted": len(predicted_user_ids),
            "nudge_targets": len(all_users) - len(predicted_user_ids),
            "nudges_sent": nudges_sent,
            "nudges_skipped_dedup": nudges_skipped_dedup,
            "message": (
                f"Nudged {nudges_sent}/{len(all_users)} users for {home} vs {away} "
                f"({len(predicted_user_ids)} already predicted, {nudges_skipped_dedup} deduped)"
            ),
        }

    # ----- template selection -----

    def _pick_template(
        self,
        user: User,
        home: str,
        away: str,
        mins: int,
        iq_threshold: int,
        total_predictions: int,
    ) -> tuple:
        """Pick the best nudge message for this user.  Returns (title, message)."""

        # Priority 1: user's favorite nation is playing
        fav = user.favorite_nation or user.country_allegiance or ""
        if fav and (fav.lower() == home.lower() or fav.lower() == away.lower()):
            opponent = away if fav.lower() == home.lower() else home
            return (
                f"{fav} kicks off soon",
                f"{fav} vs {opponent} locks in {mins} minutes. You haven't predicted yet.",
            )

        # Priority 2: top 20% IQ (competitive angle)
        if iq_threshold > 0 and user.football_iq_points >= iq_threshold:
            return (
                "Protect your ranking",
                f"{home} vs {away} locks in {mins} min. Scouts above you have already predicted.",
            )

        # Priority 3: new user (< 3 predictions)
        if total_predictions < 3:
            return (
                "Your World Cup prediction awaits",
                f"{home} vs {away} kicks off soon. 2 minutes. Prove your tactical IQ.",
            )

        # Priority 4: default
        return (
            f"Match locks in {mins} minutes",
            f"{home} vs {away}. Lock your XI before kickoff.",
        )

    # ----- data helpers -----

    @staticmethod
    def _get_iq_threshold(session: Session) -> int:
        """Calculate the 80th percentile IQ threshold."""
        scores = session.exec(
            select(User.football_iq_points).order_by(User.football_iq_points.desc())
        ).all()
        if not scores or len(scores) < 5:
            return 0
        idx = max(0, int(len(scores) * 0.2) - 1)
        return scores[idx]

    def _get_upcoming_fixtures(self, minutes_ahead: int = 60) -> List[Dict[str, Any]]:
        """Get matches kicking off within N minutes."""
        try:
            from app.api.matches import _ALL_FIXTURES, _parse_kickoff
        except ImportError:
            return []

        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(minutes=minutes_ahead)
        upcoming = []
        for fix in _ALL_FIXTURES:
            try:
                kickoff = _parse_kickoff(fix["kickoff"]).astimezone(timezone.utc)
                if now < kickoff <= cutoff:
                    fix_copy = dict(fix)
                    fix_copy["_kickoff_dt"] = kickoff
                    upcoming.append(fix_copy)
            except (ValueError, KeyError):
                continue
        return upcoming

    def _get_fixture_by_id(self, match_id: int) -> List[Dict[str, Any]]:
        """Get a specific match by ID."""
        try:
            from app.api.matches import _ALL_FIXTURES, _parse_kickoff
        except ImportError:
            return []
        for fix in _ALL_FIXTURES:
            if fix.get("id") == match_id:
                fix_copy = dict(fix)
                try:
                    fix_copy["_kickoff_dt"] = _parse_kickoff(
                        fix["kickoff"]
                    ).astimezone(timezone.utc)
                except (ValueError, KeyError):
                    fix_copy["_kickoff_dt"] = None
                return [fix_copy]
        return []

    # ----- helpers (match NATASHA/RHODEY/VISION exactly) -----

    @staticmethod
    def _max_severity(findings: List[Dict[str, Any]]) -> int:
        if not findings:
            return 0
        return max(f.get("severity", 0) for f in findings)

    def _build_result(
        self,
        run_type: str,
        severity: int,
        findings: List[Dict[str, Any]],
        actions: List[str],
    ) -> Dict[str, Any]:
        escalated = severity >= 80
        if severity == 0:
            level = "ALL_CLEAR"
        elif severity < 40:
            level = "INFO"
        elif severity < 80:
            level = "WARNING"
        else:
            level = "CRITICAL"

        summary = (
            f"[{level}] {run_type}: {len(findings)} finding(s), "
            f"severity {severity}/100"
        )
        if actions:
            summary += f", {len(actions)} action(s)"

        return {
            "agent": self.AGENT,
            "department": self.DEPARTMENT,
            "run_type": run_type,
            "severity": severity,
            "findings": findings,
            "actions_taken": actions,
            "escalated_to_queue": escalated,
            "summary": summary,
        }

    def _save_run(self, result: Dict[str, Any]) -> None:
        with Session(engine) as session:
            run = AgentRun(
                agent=result["agent"],
                department=result["department"],
                run_type=result["run_type"],
                severity=result["severity"],
                findings=result["findings"],
                actions_taken=result["actions_taken"],
                escalated_to_queue=result["escalated_to_queue"],
                summary=result["summary"],
            )
            session.add(run)
            session.commit()

    @staticmethod
    def _run_to_dict(run: AgentRun) -> Dict[str, Any]:
        return {
            "id": run.id,
            "agent": run.agent,
            "department": run.department,
            "run_type": run.run_type,
            "severity": run.severity,
            "findings": run.findings,
            "actions_taken": run.actions_taken,
            "escalated_to_queue": run.escalated_to_queue,
            "summary": run.summary,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        }
