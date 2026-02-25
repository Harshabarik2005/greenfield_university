const { docClient } = require("../aws");
const { PutCommand, ScanCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE = "Books";

async function addBook(book) {
    await docClient.send(
        new PutCommand({
            TableName: TABLE,
            Item: book,
        })
    );
}

async function deleteBook(id) {
    await docClient.send(
        new DeleteCommand({
            TableName: TABLE,
            Key: { id },
        })
    );
}

// Decrement copiesAvailable by 1 (only if > 0)
async function decrementCopies(bookId) {
    await docClient.send(
        new UpdateCommand({
            TableName: TABLE,
            Key: { id: bookId },
            UpdateExpression: "SET copiesAvailable = copiesAvailable - :one",
            ConditionExpression: "copiesAvailable > :zero",
            ExpressionAttributeValues: { ":one": 1, ":zero": 0 },
        })
    );
}

async function getBooks(filters = {}) {
    const { search, author, subject, available } = filters;

    const params = {
        TableName: TABLE,
    };

    // We can still filter 'available' at the DB level
    if (available === "true" || available === true) {
        params.FilterExpression = "copiesAvailable > :zero";
        params.ExpressionAttributeValues = { ":zero": 0 };
    }

    const data = await docClient.send(new ScanCommand(params));
    let items = data.Items || [];

    // Case-insensitive JS filtering for text fields
    if (search) {
        const s = search.toLowerCase();
        items = items.filter(b => b.title?.toLowerCase().includes(s));
    }
    if (author) {
        const a = author.toLowerCase();
        items = items.filter(b => b.authors?.some(auth => auth.toLowerCase().includes(a)));
    }
    if (subject) {
        const sub = subject.toLowerCase();
        items = items.filter(b => b.subjects?.some(subj => subj.toLowerCase().includes(sub)));
    }

    return items;
}

module.exports = { addBook, deleteBook, decrementCopies, getBooks };