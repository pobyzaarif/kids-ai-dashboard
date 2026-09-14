import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Log in — Kids AI Console" };

export default function LoginPage() {
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
          <h1 className="mb-1 text-2xl font-black uppercase">Log in</h1>
          <p className="mb-6 text-sm font-medium text-gray-600">
            Welcome back to the console.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-6 border-t-2 border-dashed border-ink pt-4 text-sm font-medium">
            No account yet?{" "}
            <Link href="/signup" className="font-bold underline">
              Sign up
            </Link>
          </p>
        </Card>
        <p className="mt-4 border-2 border-dashed border-ink bg-white/70 px-3 py-2 text-xs font-medium text-gray-600">
          Demo accounts — admin: <b>admin@kids-ai.local / admin123</b>, user:{" "}
          <b>user@kids-ai.local / user123</b>
        </p>
      </div>
    </div>
  );
}
