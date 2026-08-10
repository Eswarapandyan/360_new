"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/server/email";

export interface InviteState {
  error: string | null;
  success: string | null;
}

export async function inviteMember(
  orgSlug: string,
  orgId: string,
  orgName: string,
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") || "employee");

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }

  const supabase = await createClient();

  const { data: token, error } = await supabase.rpc("create_invite", {
    p_org_id: orgId,
    p_email: email,
    p_role: role,
  });

  if (error) {
    return { error: error.message, success: null };
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${token}`;

  try {
    await sendInviteEmail({ to: email, orgName, inviteUrl });
  } catch {
    return {
      error: null,
      success: `Invite created, but the email failed to send. Share this link directly: ${inviteUrl}`,
    };
  }

  revalidatePath(`/o/${orgSlug}/dashboard`);
  return { error: null, success: `Invite sent to ${email}.` };
}
