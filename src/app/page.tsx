import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">360° Reviews</h1>
        <p className="max-w-md text-muted-foreground">
          Run anonymous 360-degree feedback cycles for your team.
        </p>
      </div>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Get started
      </Link>
    </div>
  );
}
