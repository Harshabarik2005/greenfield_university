# notifier.py - simulated notifications (stand-in for SNS)
# In production replace with AWS SNS publish or email service integration.
import os


def notify_by_email(to_email, subject, message):
    # stub: in real use you'd call SES or SNS or 3rd party provider
    print("--- NOTIFICATION (EMAIL) ---")
    print("From:", os.getenv("NOTIFY_FROM"))
    print("To:", to_email)
    print("Subject:", subject)
    print("Message:", message)
    print("---------------------------")
    # simulate success
    return {"success": True}


def notify_user_contact(user, subject, message):
    if not user:
        return
    # prefer email; we have only email in this MVP
    notify_by_email(user.get("email"), subject, message)
