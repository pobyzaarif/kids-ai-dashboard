import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: "🔌",
    title: "Devices",
    body: "Bind your kid's voice device (Kido Device-Id), track status and manage everything from one panel.",
    tone: "bg-brand-yellow",
  },
  {
    icon: "🎭",
    title: "Roles",
    body: "Give each device a personality — Storyteller, Tutor or your own custom role with its own system prompt, voice and temperature.",
    tone: "bg-brand-pink",
  },
  {
    icon: "🧠",
    title: "Memory",
    body: "See and edit what the companion remembers about your child. Add, correct or delete memories anytime.",
    tone: "bg-brand-cyan",
  },
  {
    icon: "⚡",
    title: "Features & MCP",
    body: "Activate capabilities per device. Admins register MCP endpoints so the companion can use external tools.",
    tone: "bg-brand-lime",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-16 flex items-center justify-between">
        <p className="border-2 border-ink bg-brand-lime px-3 py-1.5 text-sm font-black uppercase shadow-brutal-sm">
          🧸 Kids AI Console
        </p>
        <nav className="flex gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button>Open Console</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mb-16">
        <h1 className="text-5xl font-black leading-[1.05] md:text-7xl">
          The console for your kid&apos;s{" "}
          <span className="inline-block -rotate-2 border-4 border-ink bg-brand-yellow px-3 shadow-brutal">
            AI companion
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg font-medium text-gray-700">
          Management for AI voice devices: pair hardware, configure
          roles, curate long-term memory and flip features on and off, all in a
          dashboard that is as sturdy as it is playful.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href={user ? "/dashboard" : "/signup"}>
            <Button size="lg">
              {user ? "Go to Dashboard →" : "Create free account →"}
            </Button>
          </Link>
          {!user ? (
            <Link href="/login">
              <Button size="lg" variant="secondary">
                I already have one
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="p-5">
            <span
              className={`mb-3 inline-block border-2 border-ink px-2 py-1 text-xl ${feature.tone}`}
              aria-hidden
            >
              {feature.icon}
            </span>
            <h2 className="mb-1 text-lg font-black uppercase">{feature.title}</h2>
            <p className="text-sm font-medium text-gray-700">{feature.body}</p>
          </Card>
        ))}
      </section>

      <footer className="mt-16 border-t-2 border-ink pt-6 text-sm font-medium text-gray-600">
        Built with Next.js · PostgreSQL · a lot of thick black borders
      </footer>
    </div>
  );
}

