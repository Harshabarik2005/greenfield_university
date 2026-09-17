import json
import urllib.error
import urllib.request

data = json.dumps({
    "name": "Test User",
    "email": "test3@test.com",
    "password": "password",
}).encode("utf-8")

req = urllib.request.Request(
    "http://localhost:4000/api/auth/register",
    data=data,
    method="POST",
    headers={
        "Content-Type": "application/json",
        "Content-Length": str(len(data)),
    },
)

try:
    with urllib.request.urlopen(req) as res:
        print("Response:", res.read().decode("utf-8"))
except urllib.error.HTTPError as err:
    print("Response:", err.read().decode("utf-8"))
except urllib.error.URLError as err:
    print(err)
