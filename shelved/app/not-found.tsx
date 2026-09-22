import Link from "next/link";

import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Not found</h1>
      <p className="text-muted">That page, game or profile doesn&apos;t exist.</p>
      <Link href="/">
        <Button>Back to your feed</Button>
      </Link>
    </div>
  );
}
