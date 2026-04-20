import { Resend } from 'resend';
import logger from '../../core/logging';
import config from '@/shared/config/config';

const resend = new Resend(config.resendApiKey);

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
        from: 'Greetup <onboarding@resend.dev>',
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