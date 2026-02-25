// middleware/auth.js - JWT verification and role check
const jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../db')

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }
    const token = authHeader.split(' ')[1]
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        // attach user object (full user fetched from db)
        const user = db.get('users').find({ id: payload.id }).value()
        if (!user) return res.status(401).json({ error: 'User not found' })
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name }
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' })
    }
}

function adminOnly(req, res, next) {
    if (req.user && req.user.role === 'admin') return next()
    return res.status(403).json({ error: 'Admin access required' })
}

module.exports = { authMiddleware, adminOnly }
