from aws import dynamodb, from_dynamo, to_dynamo

TABLE = "Books"
table = dynamodb.Table(TABLE)


def add_book(book):
    table.put_item(Item=to_dynamo(book))


def delete_book(book_id):
    table.delete_item(Key={"id": book_id})


# Decrement copiesAvailable by 1 (only if > 0)
def decrement_copies(book_id):
    table.update_item(
        Key={"id": book_id},
        UpdateExpression="SET copiesAvailable = copiesAvailable - :one",
        ConditionExpression="copiesAvailable > :zero",
        ExpressionAttributeValues={":one": 1, ":zero": 0},
    )


def get_books(filters=None):
    filters = filters or {}
    search = filters.get("search")
    author = filters.get("author")
    subject = filters.get("subject")
    available = filters.get("available")

    params = {}

    # We can still filter 'available' at the DB level
    if available == "true" or available is True:
        params["FilterExpression"] = "copiesAvailable > :zero"
        params["ExpressionAttributeValues"] = {":zero": 0}

    data = table.scan(**params)
    items = from_dynamo(data.get("Items", []))

    # Case-insensitive filtering for text fields
    if search:
        s = search.lower()
        items = [b for b in items if s in (b.get("title") or "").lower()]
    if author:
        a = author.lower()
        items = [b for b in items if any(a in auth.lower() for auth in (b.get("authors") or []))]
    if subject:
        sub = subject.lower()
        items = [b for b in items if any(sub in subj.lower() for subj in (b.get("subjects") or []))]

    return items
