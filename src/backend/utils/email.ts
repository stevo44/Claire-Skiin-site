import nodemailer from 'nodemailer';
import logger from './logger.ts';

export interface SendEmailResult {
  success: boolean;
  /** true when SMTP wasn't configured and this fell back to console logging (dev-mode, not a real send) */
  fellBackToConsole: boolean;
}

/**
 * @desc Sends an email using Nodemailer + Gmail SMTP, or falls back to console logger if credentials are not configured.
 * Returns a structured outcome rather than void so callers (NotificationService)
 * can record delivery status for auditability, without changing the
 * deliberate "never throw" behavior — email failures must never break
 * core auth/order flows.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<SendEmailResult> => {
  const smtpUser = process.env.SMTP_USER;
  const smtpAppPassword = process.env.SMTP_APP_PASSWORD;
  const smtpFromName = process.env.SMTP_FROM_NAME || 'Claire Skiin';

  // Fallback to console logs if credentials are not set
  if (!smtpUser || !smtpAppPassword) {
    logger.info(`📧 [EMAIL SENT (FALLBACK)] To: ${to}`);
    logger.info(`   Subject: ${subject}`);
    logger.info(`   Text Content: ${text}`);
    if (html) {
      logger.debug(`   HTML Content: ${html}`);
    }
    return { success: false, fellBackToConsole: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpAppPassword,
      },
    });

    const mailOptions = {
      from: `"${smtpFromName}" <${smtpUser}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`📧 [EMAIL SENT (SMTP)] To: ${to} | MessageId: ${info.messageId}`);
    return { success: true, fellBackToConsole: false };
  } catch (error: any) {
    // Log error, but DO NOT throw — keep core auth flows working.
    // This deliberate swallow-the-error behavior is unchanged; the caller
    // now gets a structured failure result to record, instead of the
    // failure being visible only in server logs.
    logger.error(`❌ [EMAIL SEND ERROR] Failed to send email to ${to}:`, error);
    return { success: false, fellBackToConsole: false };
  }
};
