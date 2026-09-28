import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { verifySmtpConnection, sendBookingConfirmationEmails, buildClassroomUrl } from '../utils/email';

async function runSmtpTest() {
  console.log('========================================================');
  console.log('CODEYOUNG — GMAIL SMTP DIAGNOSTIC & VERIFICATION TEST');
  console.log('========================================================');

  console.log('Loading environment variables...');
  const host = process.env.SMTP_HOST || 'not set';
  const port = process.env.SMTP_PORT || 'not set';
  const secure = process.env.SMTP_SECURE || 'not set';
  const user = process.env.SMTP_USER || 'not set';
  const emailEnabled = process.env.EMAIL_ENABLED ?? 'not set';

  console.log(`- EMAIL_ENABLED: ${emailEnabled}`);
  console.log(`- SMTP_HOST:     ${host}`);
  console.log(`- SMTP_PORT:     ${port}`);
  console.log(`- SMTP_SECURE:   ${secure}`);
  console.log(`- SMTP_USER:     ${user}`);
  console.log(`- SMTP_PASS:     [HIDDEN]`);

  console.log('\nStep 1: Verifying SMTP Connection with Transporter...');
  const verifyResult = await verifySmtpConnection();
  console.log(`Result: ${verifyResult.success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log(`Message: ${verifyResult.message}`);

  if (!verifyResult.success) {
    console.error('\n❌ SMTP verification failed. Stopping test.');
    process.exit(1);
  }

  // Check if CLI target email passed or default to SMTP_USER
  const targetParentEmail = process.argv[2] || process.env.TEST_PARENT_EMAIL || process.env.SMTP_USER;
  const targetMentorEmail = process.argv[3] || process.env.TEST_MENTOR_EMAIL || process.env.SMTP_USER;

  if (!targetParentEmail || !targetMentorEmail) {
    console.log('\n⚠️ No target test recipient specified or found in SMTP_USER. Skipping email dispatch test.');
    process.exit(0);
  }

  console.log('\nStep 2: Sending Test Booking Confirmation Emails...');
  console.log(`- Parent Recipient: ${targetParentEmail}`);
  console.log(`- Mentor Recipient: ${targetMentorEmail}`);

  const sampleBookingId = `test-smtp-${Date.now()}`;
  const testData = {
    bookingId: sampleBookingId,
    parentName: 'Test Parent',
    parentEmail: targetParentEmail,
    mentorName: 'Test Mentor',
    mentorEmail: targetMentorEmail,
    parentLocalDate: 'Wednesday, October 1, 2026',
    parentLocalStart: '7:30 PM EDT',
    parentLocalEnd: '8:00 PM EDT',
    parentTimezone: 'America/New_York',
    mentorLocalDate: 'Thursday, October 2, 2026',
    mentorLocalStart: '5:00 AM IST',
    mentorLocalEnd: '5:30 AM IST',
    mentorTimezone: 'Asia/Kolkata',
    classroomUrl: buildClassroomUrl(sampleBookingId),
  };

  const result = await sendBookingConfirmationEmails(testData);

  console.log('\nStep 3: Delivery Status Summary:');
  console.log(`- Parent Confirmation Email: ${result.parent === 'SENT' ? 'SENT ✅' : 'FAILED ❌'}`);
  console.log(`- Mentor Confirmation Email: ${result.mentor === 'SENT' ? 'SENT ✅' : 'FAILED ❌'}`);

  if (result.parent === 'SENT' && result.mentor === 'SENT') {
    console.log('\n🎉 ALL REAL GMAIL SMTP TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\n❌ Email delivery test encountered failures.');
    process.exit(1);
  }
}

runSmtpTest().catch((err) => {
  console.error('Unhandled error in SMTP test:', err);
  process.exit(1);
});
