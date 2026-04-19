require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');

const run = async () => {
  try {
    console.log('Sending test email...');
    await sendEmail({
      from: process.env.GOOGLE_USER,
      to: 'krishna_2401ai53@iitp.ac.in', // User's email from screenshot
      subject: 'Test Email Server',
      text: 'Trying to debug Nodemailer.',
    });
    console.log('Done!');
  } catch (err) {
    console.error('Fatal error wrapper:', err);
  }
};
run();
