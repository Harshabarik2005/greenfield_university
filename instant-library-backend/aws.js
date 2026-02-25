const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { S3Client } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION || "ap-south-1";

const client = new DynamoDBClient({
    region: REGION,
});

const docClient = DynamoDBDocumentClient.from(client);

const s3Client = new S3Client({
    region: REGION,
});

module.exports = { docClient, s3Client };