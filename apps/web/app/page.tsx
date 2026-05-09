import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Tag01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default async function LandingPage() {
  const { user } = await withAuth();
  if (user) {
    redirect("/inbox");
  }

  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full">
            <HugeiconsIcon icon={Tag01Icon} className="size-6" />
          </div>
          <CardTitle className="text-2xl">Welcome to Linelight</CardTitle>
          <CardDescription>
            A minimalist issue tracker for fast-moving teams. Sign in to start
            tracking work.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/sign-in">
              Sign in
              <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-up">Create an account</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
