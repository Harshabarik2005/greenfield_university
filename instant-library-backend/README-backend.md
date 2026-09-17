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

   (Keep a single Gunicorn worker: user accounts and pending OTP codes live in the local
   db.json, which each worker process loads into memory.)

Server runs on http://localhost:4000 by default

## Email OTP authentication

Sign-in is two steps for students and admins, and new accounts must verify their email:

1. `POST /api/auth/login` `{ email, password, role }` or `POST /api/auth/register` `{ name, email, password, phone }`
   -> `{ otpRequired: true, challengeId, purpose, email, expiresIn, resendIn, message }`
   (a 6-digit code is emailed; the response never contains the code unless `OTP_DEMO_MODE=true`, which adds `demoCode`)
2. `POST /api/auth/verify-otp` `{ challengeId, code }` -> `{ token, user }`
3. `POST /api/auth/resend-otp` `{ challengeId }` -> a new code (30 s cooldown)

Security rules: codes expire after `OTP_EXPIRES_MINUTES` (default 10), are stored only as HMAC-SHA256 hashes,
are single-use, allow 5 wrong attempts per challenge, and at most 5 emails per sign-in attempt.
Unverified accounts cannot use the API; accounts created before OTP was added count as verified.

Email delivery is chosen with `EMAIL_PROVIDER`:
- `console` (default): the email is printed in the server log - handy for local development
- `ses`: Amazon SES. `NOTIFY_FROM` must be a verified identity; the IAM role needs `ses:SendEmail`
- `smtp`: any SMTP server, e.g. Gmail (`SMTP_USER` + an App Password in `SMTP_PASSWORD`)

`@greenfield.edu` addresses can't receive real mail, so for the public demo set `OTP_DEMO_MODE=true`
to show the code on the sign-in screen.
