import { Resend } from "resend";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

export async function sendInviteEmail(params: {
  to: string;
  orgName: string;
  inviteUrl: string;
}) {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to: params.to,
    subject: `You've been invited to join ${params.orgName} on 360 Reviews`,
    html: `
      <p>You've been invited to join <strong>${params.orgName}</strong> for 360-degree feedback reviews.</p>
      <p><a href="${params.inviteUrl}">Accept your invite</a></p>
      <p>This link expires in 14 days.</p>
    `,
  });
}
