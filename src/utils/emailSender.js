// src/utils/emailSender.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an OTP verification email.
 *
 * @param {string} to       - Recipient email address
 * @param {string} otpCode  - The 6-digit OTP to include
 */
const sendOtpEmail = async (to, otpCode) => {
  const { error } = await resend.emails.send({
    from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to:      [to],
    subject: `${otpCode} is your Fanfare verification code`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Fanfare OTP</title>
        </head>
        <body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="padding:32px;text-align:center;">
                      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 8px;">🎭 Fanfare</h1>
                      <p style="color:#a0a0a0;font-size:14px;margin:0 0 32px;">Your verification code</p>
                      <div style="background:#252525;border-radius:12px;padding:24px;margin:0 0 24px;">
                        <span style="font-size:48px;font-weight:800;letter-spacing:12px;color:#ffffff;font-family:'Courier New',monospace;">
                          ${otpCode}
                        </span>
                      </div>
                      <p style="color:#a0a0a0;font-size:13px;margin:0 0 8px;">
                        This code expires in <strong style="color:#ffffff;">10 minutes</strong>.
                      </p>
                      <p style="color:#606060;font-size:12px;margin:0;">
                        If you didn't request this, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error('[Resend] Failed to send OTP email:', error);
    throw new Error('Failed to send verification email. Please try again.');
  }
};

module.exports = { sendOtpEmail };