const { docClient } = require("../aws");
const { PutCommand, ScanCommand, UpdateCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE = "Requests";

async function addRequest(request) {
    await docClient.send(new PutCommand({
        TableName: TABLE,
        Item: request,
    }));
}

async function getRequests() {
    const data = await docClient.send(new ScanCommand({
        TableName: TABLE,
    }));
    return data.Items || [];
}

async function getRequestById(id) {
    const data = await docClient.send(new GetCommand({
        TableName: TABLE,
        Key: { id },
    }));
    return data.Item || null;
}

async function updateRequestStatus(id, status) {
    await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: "set #s = :s",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": status },
    }));
}

// Admin only: clear all requests
async function clearRequests() {
    const requests = await getRequests();
    if (requests.length === 0) return;

    // Delete items one by one (batch write is better for large DBs, but this is fine for this app)
    const promises = requests.map(r =>
        docClient.send(new DeleteCommand({
            TableName: TABLE,
            Key: { id: r.id }
        }))
    );
    await Promise.all(promises);
}

module.exports = { addRequest, getRequests, getRequestById, updateRequestStatus, clearRequests };