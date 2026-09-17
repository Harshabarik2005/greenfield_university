# Instant Library - Backend (Flask)

1. Install (Python 3.10+)
   python -m venv .venv
   source .venv/bin/activate        (Windows: .venv\Scripts\activate)
   pip install -r requirements.txt

2. Copy env
   cp .env.example .env
   edit .env and set JWT_SECRET (random long string)
   AWS credentials come from the standard AWS chain (env vars, ~/.aws/credentials, or the EC2 instance role)

3. Seed DB (creates admin and student)
   python seed.py

4. Start server
   python app.py
   or for dev with auto-reload:
   flask --app app run --debug --host 0.0.0.0 --port 4000
   or in production (e.g. on EC2):
   gunicorn -w 1 --threads 4 -b 0.0.0.0:4000 app:app

   (Keep a single Gunicorn worker: user accounts live in the local db.json, which each
   worker process loads into memory.)

Server runs on http://localhost:4000 by default
