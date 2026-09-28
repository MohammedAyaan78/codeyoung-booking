import nodemailer, { type Transporter } from 'nodemailer';

// ── Transporter (singleton) ───────────────────────────────────────────────────

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (process.env.EMAIL_ENABLED === 'false') {
    throw new Error('Email sending is disabled via EMAIL_ENABLED=false');
  }

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    const secure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('[EMAIL] Using Ethereal test account — preview URLs logged per send');
  }

  return _transporter;
}

/**
 * Verify the SMTP server connection and credentials safely.
 * Returns success boolean and safe status message without exposing secret credentials.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    console.log('[EMAIL] SMTP connection verified successfully.');
    return { success: true, message: 'SMTP connection verified successfully.' };
  } catch (err: any) {
    const rawMessage = err?.message || String(err);
    let safeMsg = 'SMTP connection failed';
    if (
      rawMessage.includes('Invalid login') ||
      rawMessage.includes('535') ||
      rawMessage.includes('Authentication failed') ||
      rawMessage.includes('Username and Password not accepted')
    ) {
      safeMsg = 'Gmail authentication failed: Invalid credentials or Gmail App Password required';
    } else if (
      rawMessage.includes('ECONNREFUSED') ||
      rawMessage.includes('ETIMEDOUT') ||
      rawMessage.includes('ENOTFOUND')
    ) {
      safeMsg = 'SMTP connection failed: Unable to connect to SMTP server';
    } else {
      safeMsg = `SMTP verification error: ${rawMessage}`;
    }
    console.error(`[EMAIL] SMTP verification error: ${safeMsg}`);
    return { success: false, message: safeMsg };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookingEmailData {
  bookingId: string;
  parentName: string;
  parentEmail: string;
  mentorName: string;
  mentorEmail: string;
  // Parent-local representations
  parentLocalDate: string;   // e.g. "Wednesday, October 1, 2026"
  parentLocalStart: string;  // e.g. "7:30 PM EDT"
  parentLocalEnd: string;    // e.g. "8:00 PM EDT"
  parentTimezone: string;    // IANA e.g. "America/New_York"
  // Mentor-local representations
  mentorLocalDate: string;   // e.g. "Thursday, October 2, 2026"
  mentorLocalStart: string;  // e.g. "5:00 AM IST"
  mentorLocalEnd: string;    // e.g. "5:30 AM IST"
  mentorTimezone: string;    // IANA e.g. "Asia/Kolkata"
  // Classroom link
  classroomUrl: string;
}

export type EmailDeliveryStatus = 'SENT' | 'FAILED';

export interface EmailSendResult {
  parent: EmailDeliveryStatus;
  mentor: EmailDeliveryStatus;
}

// ── Classroom URL helper ──────────────────────────────────────────────────────

export function buildClassroomUrl(bookingId: string): string {
  const base = (process.env.APP_BASE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/class/${bookingId}`;
}

// ── HTML templates ────────────────────────────────────────────────────────────

function parentEmailHtml(d: BookingEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trial Class Confirmed</title></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr><td style="background:#f97316;padding:28px 32px">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff">CodeYoung</p>
          <p style="margin:6px 0 0;font-size:14px;color:#fed7aa">Trial Class Booking</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1c1917">Your Trial Class is Confirmed 🎉</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#57534e">Hi ${d.parentName}, your trial coding class has been successfully booked.</p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;margin-bottom:24px">
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;width:40%">Mentor</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1c1917">${d.mentorName}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Your date</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1c1917;border-top:1px solid #e7e5e4">${d.parentLocalDate}</td>
            </tr>
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Your time</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1c1917;border-top:1px solid #e7e5e4">${d.parentLocalStart} — ${d.parentLocalEnd}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Your timezone</td>
              <td style="padding:12px 16px;font-size:14px;color:#44403c;border-top:1px solid #e7e5e4">${d.parentTimezone}</td>
            </tr>
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Mentor's time</td>
              <td style="padding:12px 16px;font-size:14px;color:#44403c;border-top:1px solid #e7e5e4">${d.mentorLocalDate}<br>${d.mentorLocalStart} — ${d.mentorLocalEnd}<br><span style="font-size:12px;color:#a8a29e">${d.mentorTimezone}</span></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Duration</td>
              <td style="padding:12px 16px;font-size:14px;color:#44403c;border-top:1px solid #e7e5e4">30 minutes</td>
            </tr>
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Booking ID</td>
              <td style="padding:12px 16px;font-size:12px;font-family:monospace;color:#78716c;border-top:1px solid #e7e5e4">${d.bookingId}</td>
            </tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td style="background:#f97316;border-radius:8px">
              <a href="${d.classroomUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Join Trial Class →</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#a8a29e">Please join a few minutes before the scheduled time. The classroom link requires you to be signed in.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#fafaf9;border-top:1px solid #e7e5e4">
          <p style="margin:0;font-size:12px;color:#a8a29e">© CodeYoung · This is a demo application. The classroom is simulated.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function parentEmailText(d: BookingEmailData): string {
  return `Your Codeyoung Trial Class is Confirmed!

Hi ${d.parentName},

Your trial coding class has been successfully booked.

Mentor: ${d.mentorName}
Your date: ${d.parentLocalDate}
Your time: ${d.parentLocalStart} — ${d.parentLocalEnd} (${d.parentTimezone})
Mentor's time: ${d.mentorLocalDate}, ${d.mentorLocalStart} — ${d.mentorLocalEnd} (${d.mentorTimezone})
Duration: 30 minutes
Booking ID: ${d.bookingId}

Join your class: ${d.classroomUrl}

Please join a few minutes before the scheduled time.

— CodeYoung`;
}

function mentorEmailHtml(d: BookingEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Trial Class Assigned</title></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr><td style="background:#f97316;padding:28px 32px">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff">CodeYoung</p>
          <p style="margin:6px 0 0;font-size:14px;color:#fed7aa">Mentor Notification</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1c1917">New Trial Class Assigned</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#57534e">Hi ${d.mentorName}, a new trial class has been assigned to you.</p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;margin-bottom:24px">
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;width:40%">Parent</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1c1917">${d.parentName}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Your date</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1c1917;border-top:1px solid #e7e5e4">${d.mentorLocalDate}</td>
            </tr>
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Your time</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1c1917;border-top:1px solid #e7e5e4">${d.mentorLocalStart} — ${d.mentorLocalEnd}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Your timezone</td>
              <td style="padding:12px 16px;font-size:14px;color:#44403c;border-top:1px solid #e7e5e4">${d.mentorTimezone}</td>
            </tr>
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Parent's time</td>
              <td style="padding:12px 16px;font-size:14px;color:#44403c;border-top:1px solid #e7e5e4">${d.parentLocalDate}<br>${d.parentLocalStart} — ${d.parentLocalEnd}<br><span style="font-size:12px;color:#a8a29e">${d.parentTimezone}</span></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Duration</td>
              <td style="padding:12px 16px;font-size:14px;color:#44403c;border-top:1px solid #e7e5e4">30 minutes</td>
            </tr>
            <tr style="background:#fafaf9">
              <td style="padding:12px 16px;font-size:13px;color:#78716c;border-top:1px solid #e7e5e4">Booking ID</td>
              <td style="padding:12px 16px;font-size:12px;font-family:monospace;color:#78716c;border-top:1px solid #e7e5e4">${d.bookingId}</td>
            </tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td style="background:#f97316;border-radius:8px">
              <a href="${d.classroomUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Join Trial Class →</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#a8a29e">The classroom link requires you to be signed in as a mentor.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#fafaf9;border-top:1px solid #e7e5e4">
          <p style="margin:0;font-size:12px;color:#a8a29e">© CodeYoung · This is a demo application. The classroom is simulated.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function mentorEmailText(d: BookingEmailData): string {
  return `New Codeyoung Trial Class Assigned

Hi ${d.mentorName},

A new trial class has been assigned to you.

Parent: ${d.parentName}
Your date: ${d.mentorLocalDate}
Your time: ${d.mentorLocalStart} — ${d.mentorLocalEnd} (${d.mentorTimezone})
Parent's time: ${d.parentLocalDate}, ${d.parentLocalStart} — ${d.parentLocalEnd} (${d.parentTimezone})
Duration: 30 minutes
Booking ID: ${d.bookingId}

Join your class: ${d.classroomUrl}

— CodeYoung`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send confirmation emails to both parent and mentor.
 *
 * - Never throws — email failure must not affect the booking.
 * - Returns per-recipient delivery status for tracking.
 * - Idempotency: callers should check existing email status before calling.
 */
export async function sendBookingConfirmationEmails(
  data: BookingEmailData
): Promise<EmailSendResult> {
  const from = process.env.EMAIL_FROM ?? '"CodeYoung" <noreply@codeyoung.demo>';
  const result: EmailSendResult = { parent: 'FAILED', mentor: 'FAILED' };

  let transport: Transporter;
  try {
    transport = await getTransporter();
  } catch (err) {
    console.error(`[EMAIL] Failed to initialise transporter bookingId=${data.bookingId}:`, err);
    return result;
  }

  // ── Parent email ──────────────────────────────────────────────────────────
  try {
    const info = await transport.sendMail({
      from,
      to: `${data.parentName} <${data.parentEmail}>`,
      subject: 'Your Codeyoung Trial Class is Confirmed 🎉',
      html: parentEmailHtml(data),
      text: parentEmailText(data),
    });
    result.parent = 'SENT';
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL] SENT recipient=parent bookingId=${data.bookingId} preview=${previewUrl}`);
    } else {
      console.log(`[EMAIL] SENT recipient=parent bookingId=${data.bookingId}`);
    }
  } catch (err) {
    result.parent = 'FAILED';
    console.error(`[EMAIL] FAILED recipient=parent bookingId=${data.bookingId}:`, err);
  }

  // ── Mentor email ──────────────────────────────────────────────────────────
  try {
    const info = await transport.sendMail({
      from,
      to: `${data.mentorName} <${data.mentorEmail}>`,
      subject: 'New Codeyoung Trial Class Assigned',
      html: mentorEmailHtml(data),
      text: mentorEmailText(data),
    });
    result.mentor = 'SENT';
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL] SENT recipient=mentor bookingId=${data.bookingId} preview=${previewUrl}`);
    } else {
      console.log(`[EMAIL] SENT recipient=mentor bookingId=${data.bookingId}`);
    }
  } catch (err) {
    result.mentor = 'FAILED';
    console.error(`[EMAIL] FAILED recipient=mentor bookingId=${data.bookingId}:`, err);
  }

  return result;
}

// Keep legacy export name so any other callers don't break
export { sendBookingConfirmationEmails as sendBookingEmails };
