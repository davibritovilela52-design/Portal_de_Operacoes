const defaultAppBaseUrl = process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3002';

type AuthEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function buildVerificationUrl(token: string): string {
  const url = new URL('/verify-email', defaultAppBaseUrl);
  url.searchParams.set('token', token);

  return url.toString();
}

export function buildPasswordResetUrl(token: string): string {
  const url = new URL('/reset-password', defaultAppBaseUrl);
  url.searchParams.set('token', token);

  return url.toString();
}

export async function sendAuthEmail(message: AuthEmailMessage): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.AUTH_EMAIL_FROM;

  if (resendApiKey && resendFrom) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: resendFrom,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send auth email: ${response.status} ${errorText}`);
    }

    return;
  }

  console.info('[auth-email]', {
    to: message.to,
    subject: message.subject,
    text: message.text
  });
}
