import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in — Shelved" };

export default function Page() {
  return (
    <div className="flex justify-center py-12">
      <SignIn />
    </div>
  );
}
