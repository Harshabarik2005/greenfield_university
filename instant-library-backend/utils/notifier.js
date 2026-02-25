// notifier.js - simulated notifications (stand-in for SNS)
// In production replace with AWS SNS publish or email service integration.
require('dotenv').config()

async function notifyByEmail(toEmail, subject, message) {
    // stub: in real use you'd call SES or SNS or 3rd party provider
    console.log('--- NOTIFICATION (EMAIL) ---')
    console.log('From:', process.env.NOTIFY_FROM)
    console.log('To:', toEmail)
    console.log('Subject:', subject)
    console.log('Message:', message)
    console.log('---------------------------')
    // simulate success
    return { success: true }
}

async function notifyUserContact(user, subject, message) {
    if (!user) return
    // prefer email; we have only email in this MVP
    await notifyByEmail(user.email, subject, message)
}

module.exports = { notifyUserContact, notifyByEmail }
