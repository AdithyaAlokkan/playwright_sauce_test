const nodemailer = require('nodemailer')

async function sendEmail(subject, message) {
  try {
    console.log('Connecting to Gmail SMTP...')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    // Verify SMTP connection and credentials
    await transporter.verify()
    console.log('SMTP connection successful.')

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject,
      text: message,
    })

    console.log('Email sent:', info.messageId)
  } catch (error) {
    console.error('Email sending failed:', error)
    throw error
  }
}

module.exports = sendEmail
