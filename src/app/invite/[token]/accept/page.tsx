import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/invite/${token}/accept`)}`,
    );
  }

  const { data: orgId, error } = await supabase.rpc("accept_invite", {
    p_token: token,
  });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Couldn&apos;t accept invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Link
              href="/onboarding"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Back home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .maybeSingle();

  redirect(`/o/${org?.slug}/dashboard`);
}
