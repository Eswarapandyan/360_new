import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InviteDetails {
  org_id: string;
  org_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_invite_by_token", { p_token: token })
    .maybeSingle();

  const invite = data as InviteDetails | null;

  if (!invite) {
    notFound();
  }

  const expired =
    invite.status === "expired" || new Date(invite.expires_at) < new Date();
  const alreadyUsed = invite.status === "accepted";

  const nextUrl = `/invite/${token}/accept`;
  const loginUrl = `/login?redirect=${encodeURIComponent(nextUrl)}&email=${encodeURIComponent(invite.email)}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {invite.org_name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as {invite.role} for {invite.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alreadyUsed ? (
            <p className="text-sm text-muted-foreground">
              This invite has already been used.
            </p>
          ) : expired ? (
            <p className="text-sm text-muted-foreground">
              This invite has expired. Ask your admin to resend it.
            </p>
          ) : (
            <Link href={loginUrl} className={buttonVariants({ className: "w-full" })}>
              Sign in with {invite.email} to accept
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
