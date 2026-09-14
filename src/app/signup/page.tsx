import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Sign up — Kids AI Console" };

export default function SignupPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-block border-2 border-ink bg-brand-lime px-3 py-1.5 text-sm font-black uppercase shadow-brutal-sm"
        >
          🧸 Kids AI Console
        </Link>
        <Card className="p-6">
          <h1 className="mb-1 text-2xl font-black uppercase">Sign up</h1>
          <p className="mb-6 text-sm font-medium text-gray-600">
            One account, all of your kid&apos;s devices.
          </p>
          <SignupForm />
          <p className="mt-6 border-t-2 border-dashed border-ink pt-4 text-sm font-medium">
            Already registered?{" "}
            <Link href="/login" className="font-bold underline">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
