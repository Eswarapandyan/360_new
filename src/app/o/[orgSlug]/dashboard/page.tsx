import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/org";
import type { OrgMember, ReviewCycle } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteForm } from "./invite-form";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { org, member } = await requireOrgMember(supabase, orgSlug);

  const [{ data: members }, { data: cycles }] = await Promise.all([
    supabase
      .from("org_members")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("review_cycles")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false }),
  ]);

  const isAdmin = member.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {member.display_name} ({member.role})
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm orgSlug={orgSlug} orgId={org.id} orgName={org.name} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {(members as OrgMember[] | null)?.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>
                  {m.display_name}{" "}
                  <span className="text-muted-foreground">({m.email})</span>
                </span>
                <Badge variant="secondary">{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Review cycles</CardTitle>
          {isAdmin && (
            <Link
              href={`/o/${orgSlug}/cycles/new`}
              className={buttonVariants({ size: "sm" })}
            >
              New cycle
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!cycles?.length ? (
            <p className="text-sm text-muted-foreground">
              No review cycles yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {(cycles as ReviewCycle[]).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/o/${orgSlug}/cycles/${c.id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
                  >
                    <span>{c.name}</span>
                    <Badge variant="outline">{c.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
