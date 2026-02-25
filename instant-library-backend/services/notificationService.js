const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const sns = new SNSClient({
    region: "ap-south-1",
});

const TOPIC_ARN = "arn:aws:sns:ap-south-1:288195034980:library-notifications";

async function sendNotification(subject, message) {
    await sns.send(
        new PublishCommand({
            TopicArn: TOPIC_ARN,
            Subject: subject,
            Message: message,
        })
    );
}

module.exports = { sendNotification };