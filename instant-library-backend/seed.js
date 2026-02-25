// seed.js - create admin user and some sample books
require('dotenv').config()
const bcrypt = require('bcrypt')
const { db, initDB } = require('./db')
const { nanoid } = require('nanoid')

async function seed() {
    await initDB()

    // don't reseed if already seeded
    if (db.data.users.length > 0 || db.data.books.length > 0) {
        console.log("DB already has data — skipping seed.")
        return
    }

    const adminPass = await bcrypt.hash('admin123', 10)
    const studentPass = await bcrypt.hash('student123', 10)

    db.data.users.push(
        {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@greenfield.edu',
            passwordHash: adminPass,
            role: 'admin',
            phone: '9999999999'
        },
        {
            id: 'student-1',
            name: 'Test Student',
            email: 'student@greenfield.edu',
            passwordHash: studentPass,
            role: 'student',
            phone: '8888888888'
        }
    )

    const sampleBooks = [
        {
            id: nanoid(),
            title: 'Data Structures & Algorithms in Java',
            authors: ['Robert Lafore'],
            subjects: ['computer science', 'dsa'],
            isbn: '978-0-123456-47-2',
            copiesTotal: 5,
            copiesAvailable: 3,
            coverUrl: '',
            ebookKey: null // later map to S3 key
        },
        {
            id: nanoid(),
            title: 'Introduction to Electrical Engineering',
            authors: ['John Doe'],
            subjects: ['electrical engineering'],
            isbn: '978-0-987654-32-1',
            copiesTotal: 3,
            copiesAvailable: 1,
            coverUrl: '',
            ebookKey: null
        },
        {
            id: nanoid(),
            title: 'Cloud Computing Essentials',
            authors: ['Jane Smith'],
            subjects: ['cloud computing'],
            isbn: '978-0-111111-11-1',
            copiesTotal: 2,
            copiesAvailable: 2,
            coverUrl: '',
            ebookKey: null
        }
    ]

    db.data.books.push(...sampleBooks)

    await db.write()
    console.log('Seeded DB with admin/student and sample books.')
    console.log('Admin login: admin@greenfield.edu / admin123')
    console.log('Student login: student@greenfield.edu / student123')
}

seed().catch(err => console.error(err))
