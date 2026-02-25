// routes/books.js - DynamoDB version
const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const { authMiddleware } = require('../middleware/auth');

// ✅ Import DynamoDB service
const { getBooks, addBook } = require('../services/booksService');


// 📚 GET all books
router.get('/', async (req, res) => {
    try {
        const { search, author, subject, available } = req.query;
        const books = await getBooks({ search, author, subject, available });
        res.json({ books });
    } catch (err) {
        console.error("Error fetching books:", err);
        res.status(500).json({ error: "Failed to fetch books" });
    }
});


// 📖 GET single book by ID
router.get('/:id', async (req, res) => {
    try {
        const books = await getBooks();
        const book = books.find(b => b.id === req.params.id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json({ book });
    } catch (err) {
        console.error("Error fetching book:", err);
        res.status(500).json({ error: "Failed to fetch book" });
    }
});


// ➕ ADD new book (authenticated)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, authors, subjects, isbn, copiesTotal, coverUrl, ebookKey } = req.body;

        if (!title || !copiesTotal) {
            return res.status(400).json({ error: 'title and copiesTotal required' });
        }

        const book = {
            id: nanoid(),
            title,
            authors: authors || [],
            subjects: subjects || [],
            isbn: isbn || null,
            copiesTotal: Number(copiesTotal),
            copiesAvailable: Number(copiesTotal),

            // S3 Integrations
            // If the client provides a pre-signed upload URL resolution (coverUrl) or the raw object key (ebookKey), 
            // we attach it directly. We fallback to empty strings or null to guarantee older frontends that simply 
            // omit these new S3 fields don't accidentally wipe existing DB structures or cause runtime crashes.
            coverUrl: coverUrl || '',
            ebookKey: ebookKey || null,

            createdAt: new Date().toISOString()
        };

        await addBook(book);

        res.json({ book });
    } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Failed to add book" });
    }
});

module.exports = router;