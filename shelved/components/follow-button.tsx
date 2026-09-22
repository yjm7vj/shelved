"use client";

import { useState, useTransition } from "react";
import { UserCheck, UserPlus } from "lucide-react";

import { toggleFollow } from "@/lib/actions";
import { Button } from "@/components/ui";

export function FollowButton({
  username,
  initiallyFollowing,
}: {
  username: string;
  initiallyFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setFollowing((value) => !value);
          const result = await toggleFollow(username);
          if (!result.ok) setFollowing((value) => !value);
        })
      }
    >
      {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
