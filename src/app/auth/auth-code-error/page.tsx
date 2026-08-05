import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">That link didn&apos;t work</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The sign-in link may have expired or already been used. Request a new
        one below.
      </p>
      <Link href="/login" className={buttonVariants()}>
        Back to sign in
      </Link>
    </div>
  );
}
