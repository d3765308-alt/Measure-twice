import sgMail from "@sendgrid/mail";
import { env } from "./config";

type Mail = {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; type: string }[];
};

export async function sendEmail(m: Mail): Promise<void> {
  sgMail.setApiKey(env("SENDGRID_API_KEY"));
  await sgMail.send({
    to: m.to,
    from: env("SENDGRID_FROM"),
    subject: m.subject,
    text: m.text,
    attachments: m.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
      type: a.type,
      disposition: "attachment"
    }))
  });
}
