import { Resend } from 'resend';
import logger from '../../core/logging';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({
    to,
    subject,
    text
}: {
    to: string,
    subject: string,
    text: string
}) {
    const { data, error } = await resend.emails.send({
        from: 'Circlo <onboarding@resend.dev>',
        to: to,
        subject,
        text
    })

    if (error) {
        console.log(error);
        logger.error(`[sendEmail] Unable to send the message, error: ${error}`)
        throw new Error("Failed to send email") //replace by error instance
    }

    return data;
}

export { sendEmail }