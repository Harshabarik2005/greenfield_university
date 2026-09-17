# services/email_service.py - transactional email (OTP codes) via AWS SES, SMTP, or console
#
# EMAIL_PROVIDER=ses      -> Amazon SES (NOTIFY_FROM must be a verified SES identity)
# EMAIL_PROVIDER=smtp     -> any SMTP server, e.g. Gmail with an app password
# EMAIL_PROVIDER=console  -> print the email to the server log (default, for local development)
import os
import smtplib
from email.message import EmailMessage

import boto3

from utils.notifier import notify_by_email

_ses_client = None


def _ses():
    global _ses_client
    if _ses_client is None:
        region = os.getenv("SES_REGION") or os.getenv("AWS_REGION") or "ap-south-1"
        _ses_client = boto3.client("ses", region_name=region)
    return _ses_client


def _sender():
    return os.getenv("NOTIFY_FROM") or os.getenv("SMTP_USER")


def _send_ses(to_email, subject, text, html):
    body = {"Text": {"Data": text, "Charset": "UTF-8"}}
    if html:
        body["Html"] = {"Data": html, "Charset": "UTF-8"}
    _ses().send_email(
        Source=_sender(),
        Destination={"ToAddresses": [to_email]},
        Message={"Subject": {"Data": subject, "Charset": "UTF-8"}, "Body": body},
    )


def _send_smtp(to_email, subject, text, html):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = _sender()
    msg["To"] = to_email
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    host = os.getenv("SMTP_HOST") or "smtp.gmail.com"
    port = int(os.getenv("SMTP_PORT") or 587)
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
    with server:
        if port != 465:
            server.starttls()
        if user and password:
            server.login(user, password)
        server.send_message(msg)


def send_email(to_email, subject, text, html=None):
    """Send an email with the configured provider. Raises on delivery failure."""
    provider = (os.getenv("EMAIL_PROVIDER") or "console").strip().lower()
    if provider == "ses":
        _send_ses(to_email, subject, text, html)
    elif provider == "smtp":
        _send_smtp(to_email, subject, text, html)
    else:
        notify_by_email(to_email, subject, text)
