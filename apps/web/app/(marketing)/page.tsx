import Link from "next/link";
import {
  Lightning,
  Kanban,
  CodeBlock,
  RocketLaunch,
} from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const features = [
  {
    icon: Lightning,
    title: "AI PRD Generation",
    description:
      "Submit a feature request. Get a structured PRD in seconds.",
  },
  {
    icon: Kanban,
    title: "Task Breakdown",
    description:
      "AI breaks your PRD into actionable engineering tasks on a Kanban board.",
  },
  {
    icon: CodeBlock,
    title: "AI Code Review",
    description:
      "Every PR gets reviewed against your PRD, acceptance criteria, and edge cases.",
  },
  {
    icon: RocketLaunch,
    title: "Human Approval",
    description:
      "Ship with confidence. Human approvers have final say before release.",
  },
];

const steps = [
  "Submit a feature request",
  "AI generates a PRD",
  "Tasks appear on your Kanban board",
  "Code → AI Review → Fix → Re-review",
  "Human approves → Shipped",
];

export default function MarketingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pt-24 pb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
          Ship features from idea{" "}
          <span className="text-primary">to production</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
          AI-powered PRDs, automated task breakdown, intelligent code review,
          and human-gated releases — all in one platform.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/register"
            className={buttonVariants({ size: "lg", className: "active:scale-[0.96] transition-transform" })}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg", className: "active:scale-[0.96] transition-transform" })}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight text-foreground text-balance">
          Everything you need to ship
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/50 bg-card/50 transition-colors hover:bg-card"
            >
              <CardHeader>
                <feature.icon
                  className="mb-2 size-6 text-primary"
                  weight="duotone"
                />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight text-foreground text-balance">
          How it works
        </h2>
        <ol className="relative space-y-6 border-l border-border/60 pl-8">
          {steps.map((step, index) => (
            <li key={step} className="relative">
              <span className="absolute -left-11 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
                {index + 1}
              </span>
              <p className="text-base text-foreground text-pretty">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
          Ready to ship?
        </h2>
        <p className="text-muted-foreground text-pretty">
          Start building with AI-powered workflows today.
        </p>
        <Link
          href="/register"
          className={buttonVariants({ size: "lg", className: "mt-2 active:scale-[0.96] transition-transform" })}
        >
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
