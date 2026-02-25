// routes/auth.js
const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { nanoid } = require('nanoid')
require('dotenv').config()
const db = require('../db')

// ─── Password policy ──────────────────────────────────────────
// At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]:;"'<>,.?/\\|`~])[A-Za-z\d!@#$%^&*()_\-+={}[\]:;"'<>,.?/\\|`~]{8,}$/

function validatePassword(pw) {
    const errors = []
    if (pw.length < 8) errors.push('at least 8 characters')
    if (!/[a-z]/.test(pw)) errors.push('one lowercase letter')
    if (!/[A-Z]/.test(pw)) errors.push('one uppercase letter')
    if (!/\d/.test(pw)) errors.push('one digit')
    if (!/[!@#$%^&*()_\-+={}[\]:;"'<>,.?/\\|`~]/.test(pw)) errors.push('one special character')
    return errors
}

// ─── Student Registration ──────────────────────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password, phone } = req.body
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, password required' })
    }

    // Email must end with @greenfield.edu
    if (!email.toLowerCase().endsWith('@greenfield.edu')) {
        return res.status(400).json({ error: 'Email must end with @greenfield.edu' })
    }

    // Password policy
    const pwErrors = validatePassword(password)
    if (pwErrors.length > 0) {
        return res.status(400).json({
            error: `Password must contain: ${pwErrors.join(', ')}`
        })
    }

    const exists = db.get('users').find({ email: email.toLowerCase() }).value()
    if (exists) return res.status(400).json({ error: 'An account with this email already exists' })

    const hash = await bcrypt.hash(password, 10)
    const user = {
        id: nanoid(),
        name,
        email: email.toLowerCase(),
        passwordHash: hash,
        role: 'student',
        phone: phone || null
    }
    db.get('users').push(user).write()

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.TOKEN_EXPIRES_IN || '7d' }
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

// ─── Login (shared for student & admin) ────────────────────────
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email, password required' })

    const user = db.get('users').find({ email: email.toLowerCase() }).value()
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    // If a role hint is provided, validate it matches
    if (role && user.role !== role) {
        return res.status(401).json({
            error: role === 'admin'
                ? 'This account is not an admin account'
                : 'This account is not a student account. Use the admin login.'
        })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.TOKEN_EXPIRES_IN || '7d' }
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

module.exports = router
