import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Sign up — Shelved" };

export default function Page() {
  return (
    <div className="flex justify-center py-12">
      <SignUp />
    </div>
  );
}
