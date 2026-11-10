const nodemailer = require('nodemailer')

async function sendEmail(subject, message) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: subject,
    text: message,
  })

  console.log('Email sent successfully!')
}

module.exports = sendEmail
