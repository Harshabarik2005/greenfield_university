import boto3

sns = boto3.client("sns", region_name="ap-south-1")

TOPIC_ARN = "arn:aws:sns:ap-south-1:288195034980:library-notifications"


def send_notification(subject, message):
    sns.publish(
        TopicArn=TOPIC_ARN,
        Subject=subject,
        Message=message,
    )
