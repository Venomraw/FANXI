import httpx

from app.config import settings


def send_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password-reset email via the Resend HTTP API."""
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#060A06;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="480" cellpadding="0" cellspacing="0" border="0"
               style="background:#0D130D;border:1px solid #1E2D1E;border-radius:2px;max-width:480px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;border-bottom:1px solid #1E2D1E;">
              <span style="font-size:42px;font-weight:700;letter-spacing:-1px;color:#00E87C;">Fan</span><span style="font-size:42px;font-weight:700;color:#FFD23F;">XI</span>
              <p style="margin:6px 0 0;font-size:10px;letter-spacing:3px;color:#5A7A5A;text-transform:uppercase;">
                World Cup 2026 &middot; Tactical Hub
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 12px;font-size:13px;color:#E8F5E8;line-height:1.6;">
                You requested a password reset for your FanXI account.
              </p>
              <p style="margin:0 0 32px;font-size:13px;color:#5A7A5A;line-height:1.6;">
                This link expires in <strong style="color:#E8F5E8;">1 hour</strong>. If you didn't request this, you can safely ignore this email.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#00E87C;padding:14px 32px;">
                    <a href="{reset_url}"
                       style="color:#000;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;white-space:nowrap;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:11px;color:#5A7A5A;word-break:break-all;">
                Or paste this URL into your browser:<br/>
                <a href="{reset_url}" style="color:#00E87C;">{reset_url}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1E2D1E;">
              <p style="margin:0;font-size:10px;letter-spacing:2px;color:#5A7A5A;text-transform:uppercase;">
                FanXI &middot; Free to play &middot; No credit card required
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": "FanXI <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "FanXI — Reset Your Password",
            "html": html,
        },
        timeout=10,
    )
    response.raise_for_status()
