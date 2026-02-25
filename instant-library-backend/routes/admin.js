// routes/admin.js - DynamoDB version
const express = require("express");
const router = express.Router();
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { nanoid } = require("nanoid");
const { sendNotification } = require("../services/notificationService");
// DynamoDB services
const { getRequests, getRequestById, updateRequestStatus, clearRequests } = require("../services/requestsService");
const { addBook, deleteBook, decrementCopies, getBooks } = require("../services/booksService");
const db = require("../db");


// 📥 Get all requests (Admin) – enriched with user name & book title
router.get("/requests", authMiddleware, adminOnly, async (req, res) => {
    try {
        const [requests, books] = await Promise.all([getRequests(), getBooks()]);
        const users = db.get("users").value();

        // Build lookup maps
        const bookMap = {};
        books.forEach(b => { bookMap[b.id] = b.title; });
        const userMap = {};
        users.forEach(u => { userMap[u.id] = u.name; });

        const enriched = requests.map(r => ({
            ...r,
            bookTitle: bookMap[r.bookId] || "Unknown Book",
            userName: userMap[r.userId] || "Unknown User",
        }));

        res.json({ requests: enriched });
    } catch (err) {
        console.error("Admin fetch requests error:", err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// 🗑️ Clear all requests
router.delete("/requests/clear", authMiddleware, adminOnly, async (req, res) => {
    try {
        await clearRequests();
        res.json({ message: "Requests log cleared successfully" });
    } catch (err) {
        console.error("Admin clear requests error:", err);
        res.status(500).json({ error: "Failed to clear requests" });
    }
});


// ✅ Approve / reject request
router.put("/requests/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { status } = req.body;

        // If approving, decrement the book's available copies
        if (status === "approved") {
            const request = await getRequestById(requestId);
            if (request && request.bookId) {
                await decrementCopies(request.bookId);
            }
        }

        await updateRequestStatus(requestId, status);

        await sendNotification(
            "Request Updated",
            `Request ${requestId} status changed to ${status}`
        );

        res.json({ message: "Request updated", requestId, status });
    } catch (err) {
        console.error("Admin update request error:", err);
        res.status(500).json({ error: "Failed to update request" });
    }
});


// ➕ Add book (Admin)
router.post("/books", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { title, authors, subjects, isbn, copiesTotal, coverUrl, ebookKey } = req.body;

        if (!title || !copiesTotal) {
            return res.status(400).json({ error: "title and copiesTotal required" });
        }

        const book = {
            id: nanoid(),
            title,
            authors: authors || [],
            subjects: subjects || [],
            isbn: isbn || null,
            copiesTotal: Number(copiesTotal),
            copiesAvailable: Number(copiesTotal),
            coverUrl: coverUrl || "",
            ebookKey: ebookKey || null,
            createdAt: new Date().toISOString(),
        };

        await addBook(book);

        res.json({ book });
    } catch (err) {
        console.error("Admin add book error:", err);
        res.status(500).json({ error: "Failed to add book" });
    }
});


// 🗑️ Delete book (Admin)
router.delete("/books/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
        await deleteBook(req.params.id);
        res.json({ message: "Book deleted", bookId: req.params.id });
    } catch (err) {
        console.error("Admin delete book error:", err);
        res.status(500).json({ error: "Failed to delete book" });
    }
});

module.exports = router;