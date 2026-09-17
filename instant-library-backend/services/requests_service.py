from aws import dynamodb, from_dynamo, to_dynamo

TABLE = "Requests"
table = dynamodb.Table(TABLE)


def add_request(request):
    table.put_item(Item=to_dynamo(request))


def get_requests():
    data = table.scan()
    return from_dynamo(data.get("Items", []))


def get_request_by_id(request_id):
    data = table.get_item(Key={"id": request_id})
    item = data.get("Item")
    return from_dynamo(item) if item else None


def update_request_status(request_id, status):
    table.update_item(
        Key={"id": request_id},
        UpdateExpression="set #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": status},
    )


# Admin only: clear all requests
def clear_requests():
    all_requests = get_requests()
    if not all_requests:
        return

    # Delete items one by one (batch write is better for large DBs, but this is fine for this app)
    for r in all_requests:
        table.delete_item(Key={"id": r["id"]})
