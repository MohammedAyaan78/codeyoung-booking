import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create a nodemailer transporter.
 * - If SMTP_HOST is configured in .env, uses real SMTP.
 * - Otherwise creates an Ethereal test account automatically.
 *   Emails are captured at https://ethereal.email — preview URL logged to console.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // TLS on 465, STARTTLS on 587
      requireTLS: port !== 465, // enforce STARTTLS upgrade on 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Auto-create a free Ethereal test account — no config needed
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,       // Ethereal uses STARTTLS on 587
      requireTLS: true,    // enforce TLS upgrade
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[EMAIL] Ethereal test account ready');
  }

  return transporter;
}

export interface BookingEmailData {
  parentName: string;
  parentEmail: string;
  mentorName: string;
  mentorEmail: string;
  parentLocalStart: string;
  parentLocalEnd: string;
  parentTimezone: string;
  parentLocalDate: string;
  mentorLocalStart: string;
  mentorLocalEnd: string;
  mentorTimezone: string;
  mentorLocalDate: string;
  meetingUrl: string;
  bookingId: string;
}

export async function sendBookingEmails(data: BookingEmailData): Promise<void> {
  try {
    const transport = await getTransporter();

    // ── Email to parent ───────────────────────────────────────────────────────
    const parentInfo = await transport.sendMail({
      from: '"CodeYoung" <noreply@codeyoung.com>',
      to: `${data.parentName} <${data.parentEmail}>`,
      subject: 'Your CodeYoung trial class is confirmed!',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#f97316">CodeYoung Trial Class Confirmed 🎉</h2>
          <p>Hi ${data.parentName},</p>
          <p>Your trial coding class has been confirmed. Here are your details:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#666">Date</td><td style="padding:8px;font-weight:bold">${data.parentLocalDate}</td></tr>
            <tr style="background:#fafafa"><td style="padding:8px;color:#666">Time</td><td style="padding:8px;font-weight:bold">${data.parentLocalStart} — ${data.parentLocalEnd}</td></tr>
            <tr><td style="padding:8px;color:#666">Timezone</td><td style="padding:8px">${data.parentTimezone}</td></tr>
            <tr style="background:#fafafa"><td style="padding:8px;color:#666">Mentor</td><td style="padding:8px;font-weight:bold">${data.mentorName}</td></tr>
            <tr><td style="padding:8px;color:#666">Booking ID</td><td style="padding:8px;font-family:monospace;font-size:12px">${data.bookingId}</td></tr>
          </table>
          <a href="${data.meetingUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">
            Join Trial Class
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            This is a demo application. The meeting link is simulated.
          </p>
        </div>
      `,
    });

    // ── Email to mentor ───────────────────────────────────────────────────────
    const mentorInfo = await transport.sendMail({
      from: '"CodeYoung" <noreply@codeyoung.com>',
      to: `${data.mentorName} <${data.mentorEmail}>`,
      subject: 'New trial class assigned to you',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#f97316">New Trial Class Assigned</h2>
          <p>Hi ${data.mentorName},</p>
          <p>A new trial class has been assigned to you:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#666">Date</td><td style="padding:8px;font-weight:bold">${data.mentorLocalDate}</td></tr>
            <tr style="background:#fafafa"><td style="padding:8px;color:#666">Your time</td><td style="padding:8px;font-weight:bold">${data.mentorLocalStart} — ${data.mentorLocalEnd}</td></tr>
            <tr><td style="padding:8px;color:#666">Your timezone</td><td style="padding:8px">${data.mentorTimezone}</td></tr>
            <tr style="background:#fafafa"><td style="padding:8px;color:#666">Parent</td><td style="padding:8px;font-weight:bold">${data.parentName}</td></tr>
            <tr><td style="padding:8px;color:#666">Parent time</td><td style="padding:8px">${data.parentLocalStart} (${data.parentTimezone})</td></tr>
            <tr style="background:#fafafa"><td style="padding:8px;color:#666">Booking ID</td><td style="padding:8px;font-family:monospace;font-size:12px">${data.bookingId}</td></tr>
          </table>
          <a href="${data.meetingUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 0">
            Join Trial Class
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            This is a demo application. The meeting link is simulated.
          </p>
        </div>
      `,
    });

    // Log preview URLs — visible in backend terminal
    console.log(`[EMAIL] Parent email sent → ${nodemailer.getTestMessageUrl(parentInfo)}`);
    console.log(`[EMAIL] Mentor email sent → ${nodemailer.getTestMessageUrl(mentorInfo)}`);

  } catch (err) {
    // Email failure must never break the booking — log and continue
    console.error('[EMAIL] Failed to send booking emails:', err);
  }
}
