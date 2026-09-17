import os
from decimal import Decimal

import boto3
from botocore.config import Config

REGION = os.getenv("AWS_REGION", "ap-south-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)

# Regional endpoint + SigV4 so presigned URLs look like the ones the JS SDK produced
# (https://<bucket>.s3.<region>.amazonaws.com/...) and don't redirect during browser uploads
s3_client = boto3.client(
    "s3",
    region_name=REGION,
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)


def to_dynamo(value):
    """Convert floats to Decimal before writing - boto3 rejects Python floats."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: to_dynamo(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_dynamo(v) for v in value]
    return value


def from_dynamo(value):
    """Convert DynamoDB Decimals back to int/float so JSON responses match the JS DocumentClient."""
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {k: from_dynamo(v) for k, v in value.items()}
    if isinstance(value, (list, set)):
        return [from_dynamo(v) for v in value]
    return value
