// db.js - lowdb setup (v1 CommonJS)
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new FileSync(file);
const db = low(adapter);

// ✅ Provide default structure (IMPORTANT)
db.defaults({
    users: [],
    books: [],
    requests: [],
    audits: []
}).write();

module.exports = db;

