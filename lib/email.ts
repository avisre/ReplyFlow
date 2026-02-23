import nodemailer from "nodemailer";

type NewReviewAlertInput = {
  to: string;
  businessName: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  locationName: string;
};

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || Number.isNaN(port)) {
    transporter = null;
    return transporter;
  }

  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

function buildStarString(rating: number) {
  const safeRating = Math.max(1, Math.min(5, rating));
  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}`;
}

export async function sendNewReviewAlertEmail(input: NewReviewAlertInput) {
  const smtpTransporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM_EMAIL;

  if (!smtpTransporter || !fromEmail) {
    return {
      sent: false,
      reason: "SMTP is not configured.",
    };
  }

  const reviewPreview = input.reviewText.length > 280
    ? `${input.reviewText.slice(0, 277)}...`
    : input.reviewText;
  const stars = buildStarString(input.rating);
  const subject = `New Google review (${input.rating}★) from ${input.reviewerName}`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">New review received in ReplyFlow</h2>
      <p style="margin: 0 0 10px;"><strong>Business:</strong> ${input.businessName}</p>
      <p style="margin: 0 0 10px;"><strong>Location:</strong> ${input.locationName}</p>
      <p style="margin: 0 0 10px;"><strong>Reviewer:</strong> ${input.reviewerName}</p>
      <p style="margin: 0 0 14px;"><strong>Rating:</strong> ${stars}</p>
      <blockquote style="margin: 0; padding: 12px 14px; border-left: 4px solid #4F46E5; background: #F9FAFB;">
        ${reviewPreview}
      </blockquote>
      <p style="margin: 14px 0 0;">Log in to ReplyFlow to generate and post your reply.</p>
    </div>
  `;

  const text = [
    "New review received in ReplyFlow",
    `Business: ${input.businessName}`,
    `Location: ${input.locationName}`,
    `Reviewer: ${input.reviewerName}`,
    `Rating: ${input.rating}/5`,
    "",
    reviewPreview,
    "",
    "Log in to ReplyFlow to generate and post your reply.",
  ].join("\n");

  await smtpTransporter.sendMail({
    from: fromEmail,
    to: input.to,
    subject,
    text,
    html,
  });

  return { sent: true };
}
