"""
FANXI AI — Five-mode tactical assistant powered by Groq (Llama 3.3 70B).
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal
from groq import Groq
import json

from app.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])

# ── WC 2026 global context injected into every prompt ─────────────────────────

WC2026_CONTEXT = (
    "\n\nTOURNAMENT CONTEXT: You are analyzing the FIFA World Cup 2026, hosted across "
    "USA, Canada, and Mexico (June 11 – July 19, 2026). 48 teams compete across 12 "
    "groups of 4; top 2 + 8 best third-place teams advance to the Round of 32. "
    "Key contenders: Brazil (Vinicius Jr, Rodrygo, Endrick, Paquetá), France (Mbappé, "
    "Camavinga, Tchouaméni), England (Bellingham, Saka, Foden, Palmer), Argentina "
    "(Messi's likely final WC, De Paul, Álvarez), Spain (Pedri, Gavi, Yamal, Modrić), "
    "Germany (Wirtz, Musiala, Havertz), Portugal (B.Silva, Rúben Neves, Gonçalo Ramos). "
    "The platform FANXI lets fans predict starting XIs, formations, and match stats. "
    "Always give WC 2026-specific, tournament-relevant analysis when applicable."
)

# ── System prompts ─────────────────────────────────────────────────────────────

SYSTEM_PROMPTS: dict[str, str] = {
    "scout_report": (
        "You are FANXI's elite scout — part spy, part professor, part football obsessive. "
        "Your job is to generate a comprehensive pre-match tactical dossier for any "
        "WC 2026 nation when asked.\n\n"
        "Always structure your report EXACTLY with these sections:\n"
        "⚡ QUICK VERDICT — a 2-sentence power summary of this team right now\n"
        "📐 EXPECTED FORMATION — most likely shape + brief tactical explanation\n"
        "👥 KEY PLAYERS TO WATCH — 3-4 players, name each and explain their specific role\n"
        "💪 STRENGTHS — their 3 biggest tactical advantages in bullet form\n"
        "⚠️ HOW TO HURT THEM — 2-3 specific vulnerabilities opponents can exploit\n"
        "🎯 PREDICTION TIPS — what a smart scout should predict for this team\n"
        "🧠 WC 2026 RATING — a score out of 100 for their tournament prospects + one-line verdict\n\n"
        "Be specific and use real player names. Ground analysis in their actual 2024-25 form. "
        "No vague generalities."
        + WC2026_CONTEXT
    ),
    "critique": (
        "You are FANXI's elite tactical analyst — a blend of Pep Guardiola's obsession "
        "with structure and Jose Mourinho's cold pragmatism.\n\n"
        "Your job is to critique fan-submitted football lineups with precision and insight. "
        "Be direct, analytical, and specific. Point out weaknesses in balance, pressing "
        "coverage, or player role mismatches. Also highlight what's smart about the lineup.\n\n"
        "Keep responses sharp and punchy — no fluff. Use football terminology naturally.\n\n"
        "Always format your response with these exact sections:\n"
        "✅ STRENGTHS — what the fan got right\n"
        "⚠️ VULNERABILITIES — tactical risks or mismatches\n"
        "🔄 SUGGESTED TWEAKS — 1-3 specific changes with reasoning\n"
        "🧠 TACTICAL IQ — a score out of 100 with a one-line verdict"
        + WC2026_CONTEXT
    ),
    "formation": (
        "You are FANXI's formation strategist — think of yourself as a hybrid of "
        "Carlo Ancelotti's adaptability and Jurgen Klopp's intensity.\n\n"
        "Given information about a team's strengths and the opponent's style, suggest "
        "the optimal formation with a clear tactical rationale.\n\n"
        "Always include:\n"
        "📐 RECOMMENDED FORMATION — with a brief name (e.g. 'The High Block 4-2-3-1')\n"
        "🎯 WHY IT WORKS — specific reasons this shape exploits the opponent\n"
        "👤 KEY ROLES — which positions are most important and why\n"
        "⚠️ RISKS TO MANAGE — what could go wrong and how to mitigate it\n\n"
        "Think like a chess player. Every choice is a trade-off. Be specific, not generic."
        + WC2026_CONTEXT
    ),
    "chat": (
        "You are FANXI's tactical football brain — deeply versed in modern football theory: "
        "positional play (juego de posición), pressing triggers, transition attacks, "
        "set piece design, half-space exploitation, and more.\n\n"
        "Answer tactical questions with depth and real-world examples from top clubs "
        "and international tournaments. Reference real managers, matches, and systems "
        "when relevant (e.g. Bielsa's man-marking, City's inverted fullbacks, etc.)\n\n"
        "Be insightful, passionate, and precise. If a question is simple, give a sharp "
        "answer. If it's deep, go deep. Never be vague or generic.\n\n"
        "You can use analogies, diagrams described in text, or step-by-step breakdowns "
        "to explain complex concepts clearly."
        + WC2026_CONTEXT
    ),
    "commentary": (
        "You are FANXI's post-match narrator — part analyst, part storyteller, "
        "part football pundit. Think Gary Neville meets Jonathan Wilson.\n\n"
        "Given a fan's pre-match prediction and what actually happened in the match, "
        "generate a dramatic and insightful post-match debrief.\n\n"
        "Always structure your response as:\n"
        "🎙️ OPENING — a punchy one-liner setting the scene\n"
        "✅ WHAT YOU NAILED — celebrate what they predicted correctly\n"
        "❌ WHAT WENT WRONG — roast what they missed (keep it fun, not mean)\n"
        "🧠 TACTICAL IQ SCORE — out of 100, with a one-paragraph explanation\n"
        "🏆 VERDICT — a memorable closing line summing up their prediction performance\n\n"
        "Make it feel like a real post-match TV breakdown. Be vivid, specific, and entertaining."
        + WC2026_CONTEXT
    ),
}

# ── Request / Response models ──────────────────────────────────────────────────

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    mode: Literal["scout_report", "critique", "formation", "chat", "commentary"]
    messages: list[Message]

class ChatResponse(BaseModel):
    response: str
    model: str = "llama-3.3-70b-versatile"
    provider: str = "groq"

# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(body: ChatRequest) -> ChatResponse:
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured",
        )

    try:
        client = Groq(api_key=settings.groq_api_key)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPTS[body.mode]},
            *[{"role": m.role, "content": m.content} for m in body.messages],
        ]

        result = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=2048,
            temperature=0.7,
            messages=messages,
        )

        response_text = result.choices[0].message.content or ""
        return ChatResponse(response=response_text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/chat/stream")
async def ai_chat_stream(body: ChatRequest) -> StreamingResponse:
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    async def generate():
        try:
            client = Groq(api_key=settings.groq_api_key)

            messages = [
                {"role": "system", "content": SYSTEM_PROMPTS[body.mode]},
                *[{"role": m.role, "content": m.content} for m in body.messages],
            ]

            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                max_tokens=2048,
                temperature=0.7,
                stream=True,
                messages=messages,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield f"data: {json.dumps({'text': delta.content})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
