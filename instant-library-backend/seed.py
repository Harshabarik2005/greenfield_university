# seed.py - create admin user and some sample books
from dotenv import load_dotenv

load_dotenv()

import bcrypt  # noqa: E402
from nanoid import generate as nanoid  # noqa: E402

from db import db  # noqa: E402


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def seed():
    # don't reseed if already seeded
    if db.get("users") or db.get("books"):
        print("DB already has data - skipping seed.")
        return

    admin_pass = hash_password("admin123")
    student_pass = hash_password("student123")

    db.get("users").extend([
        {
            "id": "admin-1",
            "name": "Admin User",
            "email": "admin@greenfield.edu",
            "passwordHash": admin_pass,
            "role": "admin",
            "phone": "9999999999",
        },
        {
            "id": "student-1",
            "name": "Test Student",
            "email": "student@greenfield.edu",
            "passwordHash": student_pass,
            "role": "student",
            "phone": "8888888888",
        },
    ])

    sample_books = [
        {
            "id": nanoid(),
            "title": "Data Structures & Algorithms in Java",
            "authors": ["Robert Lafore"],
            "subjects": ["computer science", "dsa"],
            "isbn": "978-0-123456-47-2",
            "copiesTotal": 5,
            "copiesAvailable": 3,
            "coverUrl": "",
            "ebookKey": None,  # later map to S3 key
        },
        {
            "id": nanoid(),
            "title": "Introduction to Electrical Engineering",
            "authors": ["John Doe"],
            "subjects": ["electrical engineering"],
            "isbn": "978-0-987654-32-1",
            "copiesTotal": 3,
            "copiesAvailable": 1,
            "coverUrl": "",
            "ebookKey": None,
        },
        {
            "id": nanoid(),
            "title": "Cloud Computing Essentials",
            "authors": ["Jane Smith"],
            "subjects": ["cloud computing"],
            "isbn": "978-0-111111-11-1",
            "copiesTotal": 2,
            "copiesAvailable": 2,
            "coverUrl": "",
            "ebookKey": None,
        },
    ]

    db.get("books").extend(sample_books)

    db.write()
    print("Seeded DB with admin/student and sample books.")
    print("Admin login: admin@greenfield.edu / admin123")
    print("Student login: student@greenfield.edu / student123")


if __name__ == "__main__":
    seed()
