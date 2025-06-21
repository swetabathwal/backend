const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Email Verification',
    text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
