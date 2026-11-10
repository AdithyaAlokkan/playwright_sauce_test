const nodemailer = require('nodemailer')

async function sendEmail(subject, message) {
  try {
    console.log('Connecting to Gmail SMTP...')

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },

      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    console.log('Verifying SMTP connection...')

    await transporter.verify()

    console.log('SMTP connection successful!')

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject,
      text: message,
    })

    console.log('Email sent successfully!')
    console.log('Message ID:', info.messageId)
  } catch (error) {
    console.error('Email sending failed!')
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    throw error
  }
}

module.exports = sendEmail
