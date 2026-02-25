// server.js - main entry
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const booksRoutes = require('./routes/books')
const requestsRoutes = require('./routes/requests')
const adminRoutes = require('./routes/admin')
const uploadRoutes = require('./routes/uploads')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(bodyParser.json())

app.use('/api/auth', authRoutes)
app.use('/api/books', booksRoutes)
app.use('/api/requests', requestsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', uploadRoutes)

app.get('/', (req, res) => res.send('Instant Library Backend is running'))

app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on http://0.0.0.0:${PORT}`))
