import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings

logger = logging.getLogger(__name__)

async def send_approval_email(to_email: str, vendor_name: str, login_url: str) -> None:
    subject = "Your ProxiMart vendor application has been approved ðŸŽ‰"
    html_content = f"""
    <p>Hi {vendor_name},</p>
    <p>Congratulations! Your vendor application has been approved.</p>
    <p>You can now log in and start adding your products.</p>
    <a href="{login_url}" style="padding:10px;background:blue;color:white;text-decoration:none;">Log In Now</a>
    <p>Footer: ProxiMart Team</p>
    """
    try:
        if settings.SENDGRID_API_KEY:
            message = Mail(
                from_email=settings.SENDGRID_FROM_EMAIL,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            sg.send(message)
    except Exception as e:
        logger.error(f"Failed to send approval email: {e}")

async def send_rejection_email(to_email: str, vendor_name: str, reason: str) -> None:
    subject = "Update on your ProxiMart vendor application"
    html_content = f"""
    <p>Hi {vendor_name},</p>
    <p>Thank you for applying to ProxiMart.</p>
    <p>Unfortunately your application was not approved at this time.</p>
    <div style="padding:10px;border:1px solid red;background:#ffe6e6;">Reason: {reason}</div>
    <p>You may resubmit with updated documents.</p>
    <p>Footer: ProxiMart Team</p>
    """
    try:
        if settings.SENDGRID_API_KEY:
            message = Mail(
                from_email=settings.SENDGRID_FROM_EMAIL,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            sg.send(message)
    except Exception as e:
        logger.error(f"Failed to send rejection email: {e}")
