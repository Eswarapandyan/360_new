import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/org";
import { NewCycleForm } from "./new-cycle-form";

export default async function NewCyclePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { org, member } = await requireOrgMember(supabase, orgSlug);

  if (member.role !== "admin") {
    redirect(`/o/${orgSlug}/dashboard`);
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <NewCycleForm orgSlug={orgSlug} orgId={org.id} />
    </div>
  );
}
