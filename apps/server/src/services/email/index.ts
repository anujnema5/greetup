import Mailjet from "node-mailjet";
import logger from "../../core/logging";
import config from "@/shared/config/config";

const mailjet = Mailjet.apiConnect(config.mailjetApiKey, config.mailjetApiSecret);

type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
};

async function sendEmail({ to, subject, text }: SendEmailArgs) {
  try {
    const response = await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: config.mailFromEmail,
            Name: config.mailFromName,
          },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
        },
      ],
    });

    const body = response.body as {
      Messages?: Array<{ Status?: string; Errors?: { ErrorMessage?: string }[] }>;
    };
    const first = body.Messages?.[0];
    const errs = first?.Errors;
    if (Array.isArray(errs) && errs.length > 0) {
      logger.error("[sendEmail] Mailjet rejected message", { body: response.body });
      throw new Error("Failed to send email");
    }
    if (first?.Status && first.Status !== "success") {
      logger.error("[sendEmail] Mailjet non-success status", { status: first.Status, body: response.body });
      throw new Error("Failed to send email");
    }

    return response.body;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown }; message?: string };
    const detail = axiosErr.response?.data ?? axiosErr.message ?? err;
    logger.error(`[sendEmail] Unable to send the message: ${JSON.stringify(detail)}`);
    throw new Error("Failed to send email");
  }
}

export { sendEmail };
