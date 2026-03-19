import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Boxes,
  CalendarRange,
  ChartColumnBig,
  Compass,
  Database,
  Gauge,
  Mail,
  MessageCircleMore,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About | BPI AeroPath",
  description:
    "Learn about BPI AeroPath, a solo-built operations platform for warehouse, packaging, and logistics workflows.",
};

const capabilityCards = [
  {
    title: "Operational Visibility",
    description:
      "Turn scattered warehouse updates into one readable workspace for decisions, handoffs, and follow-through.",
    icon: ScanSearch,
  },
  {
    title: "Packaging Intelligence",
    description:
      "Plan packaging logic, review cases, export packing details, and keep calculation flow traceable end-to-end.",
    icon: Boxes,
  },
  {
    title: "Decision Support",
    description:
      "Use reports, summaries, and workflow guardrails to reduce guesswork and make routine work more reliable.",
    icon: ChartColumnBig,
  },
];

const principles = [
  {
    title: "Built From Real Friction",
    description:
      "The system is designed around day-to-day operational pain points: duplicate data, unclear ownership, and manual follow-up loops.",
    icon: Compass,
  },
  {
    title: "Structured For Continuity",
    description:
      "Every page aims to make work easier to hand off, easier to review, and harder to lose when someone is unavailable.",
    icon: Workflow,
  },
  {
    title: "Practical Before Fancy",
    description:
      "Automation, reports, and UI details are added only when they make the work clearer, faster, or safer in practice.",
    icon: Gauge,
  },
  {
    title: "Safe By Default",
    description:
      "Validation, export controls, duplicate-prevention, and review checkpoints are treated as product features, not afterthoughts.",
    icon: ShieldCheck,
  },
];

const milestones = [
  "Packaging planning with editable review flow and packing detail export",
  "Packaging reports with filters, charts, CSV export, and package analysis",
  "Material control reporting and workflow visibility improvements",
  "Shared widgets for weather, exchange rates, oil prices, and world clocks",
];

const timeline = [
  {
    year: "2024",
    title: "Foundation & Workflow Mapping",
    description:
      "The first phase focused on understanding operational bottlenecks, defining the system direction, and shaping the information flow around real warehouse work.",
  },
  {
    year: "2025",
    title: "Packaging Console Takes Shape",
    description:
      "Core packaging logic, case review flow, export structure, and report-driven visibility became working parts of the platform.",
  },
  {
    year: "2026",
    title: "Refinement, Reporting, and Reliability",
    description:
      "The system expanded with cleaner dashboards, duplicate-save prevention, stronger review behavior, and more polished operational reporting.",
  },
];

const founderProfile = {
  name: "Vorrapat Weangdonko",
  title: "Founder & Solo Builder",
  email: "bksw007@gmail.com",
  lineId: "bksw0077",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden pt-16">
      <section className="relative border-b border-[#7E5C4A]/12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,170,125,0.2),transparent_34%),linear-gradient(180deg,rgba(246,237,222,0.82),rgba(246,237,222,0.26))]" />
        <div className="absolute left-[8%] top-20 h-40 w-40 rounded-full bg-[#9ACD32]/10 blur-3xl" />
        <div className="absolute right-[10%] top-32 h-52 w-52 rounded-full bg-[#D4AA7D]/18 blur-3xl" />

        <div className="container-custom relative z-10 py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7E5C4A]/15 bg-[#F6EDDE]/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-[#7E5C4A] shadow-[0_10px_30px_rgba(126,92,74,0.08)]">
                <Sparkles className="h-3.5 w-3.5" />
                About BPI AeroPath
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-[#272727] md:text-5xl lg:text-6xl">
                A solo-built operations system shaped for warehouse rhythm, packaging logic, and real working clarity.
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-[#7E5C4A] md:text-lg">
                BPI AeroPath is an internal work hub built to organize operational flow across material control,
                packaging, reporting, and daily execution. It was created by one builder with a simple goal:
                make fast-moving work easier to track, easier to review, and easier to trust.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/projects"
                  className="cta-primary group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold"
                >
                  Explore Modules
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-[#7E5C4A]/20 bg-[#F6EDDE]/70 px-6 py-3 text-base font-semibold text-[#7E5C4A] transition-all duration-300 hover:border-[#7E5C4A]/35 hover:bg-[#EFD09E]/55 hover:text-[#272727]"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-[#EEF2F6]/90 p-6 shadow-[12px_12px_30px_rgba(166,180,200,0.22),-10px_-10px_24px_rgba(255,255,255,0.84)]">
              <div className="rounded-[1.6rem] border border-[#D4AA7D]/18 bg-[#272727] p-6 text-[#F6EDDE] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#EFD09E]/70">Builder Note</p>
                <p className="mt-4 text-2xl font-black leading-tight">
                  No separate team. No agency layer. Just focused product-building from the workflow outward.
                </p>
                <p className="mt-4 text-sm leading-7 text-[#F6EDDE]/80">
                  That means the product decisions, interface details, edge-case fixes, and operational logic are all
                  shaped close to the actual work. The system evolves by removing friction, not by adding noise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container-custom">
          <div className="grid gap-5 md:grid-cols-3">
            {capabilityCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="group rounded-[1.75rem] border border-white/80 bg-[#EEF2F6]/94 p-6 shadow-[8px_8px_18px_rgba(166,180,200,0.22),-8px_-8px_18px_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[12px_12px_24px_rgba(166,180,200,0.26),-10px_-10px_24px_rgba(255,255,255,0.95)]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-[#9ACD32]/85 shadow-[4px_4px_10px_rgba(166,180,200,0.18),-2px_-2px_8px_rgba(255,255,255,0.82)]">
                    <Icon className="h-6 w-6 text-[#272727]" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-[#272727]">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#7E5C4A]">{card.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative py-6 md:py-10">
        <div className="container-custom">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
            <article className="rounded-[2rem] border border-white/80 bg-[#EEF2F6]/94 p-6 shadow-[10px_10px_24px_rgba(166,180,200,0.22),-8px_-8px_20px_rgba(255,255,255,0.88)] md:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7E5C4A]">Founder Profile</p>
              <div className="mt-6 rounded-[1.8rem] border border-[#D4AA7D]/18 bg-[linear-gradient(160deg,#1E1E1E_0%,#343434_42%,#5A4A41_100%)] p-6 text-[#F6EDDE] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="relative mx-auto h-[320px] w-full max-w-[260px] overflow-hidden rounded-[1.5rem] border border-white/10 shadow-[0_18px_34px_rgba(0,0,0,0.28)]">
                  <Image
                    src="/images/1773637031822(1).png"
                    alt="Vorrapat Weangdonko"
                    fill
                    priority
                    sizes="(max-width: 768px) 260px, 260px"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
                </div>
                <p className="mt-5 text-center text-xs leading-6 text-[#F6EDDE]/62">
                  Founder portrait of Vorrapat Weangdonko.
                </p>
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#7E5C4A]/14 bg-[#F6EDDE]/88 p-7 shadow-[10px_10px_24px_rgba(212,170,125,0.12),-6px_-6px_16px_rgba(255,255,255,0.75)]">
              <div className="flex items-center gap-3 text-[#7E5C4A]">
                <UserRound className="h-5 w-5" />
                <p className="text-[11px] font-bold uppercase tracking-[0.28em]">The Person Behind It</p>
              </div>

              <h2 className="mt-4 text-3xl font-black leading-tight text-[#272727]">
                {founderProfile.name}
              </h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#7E5C4A]">
                {founderProfile.title}
              </p>

              <div className="mt-6 space-y-4 text-sm leading-7 text-[#7E5C4A]">
                <p>
                  Vorrapat is the solo builder behind BPI AeroPath, shaping the product from workflow logic to
                  interface polish. The focus is simple: build tools that reduce operational friction and make daily
                  work easier to review, share, and trust.
                </p>
                <p>
                  The system continues to grow through practical iteration, with each improvement grounded in actual
                  warehouse, packaging, and reporting needs rather than generic software patterns.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[#D4AA7D]/20 bg-[#EEF2F6]/90 p-4">
                  <div className="flex items-center gap-2 text-[#7E5C4A]">
                    <Mail className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Email</span>
                  </div>
                  <p className="mt-3 break-all text-base font-bold text-[#272727]">{founderProfile.email}</p>
                </div>

                <div className="rounded-[1.4rem] border border-[#D4AA7D]/20 bg-[#EEF2F6]/90 p-4">
                  <div className="flex items-center gap-2 text-[#7E5C4A]">
                    <MessageCircleMore className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Line ID</span>
                  </div>
                  <p className="mt-3 text-base font-bold text-[#272727]">{founderProfile.lineId}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="relative py-6 md:py-10">
        <div className="container-custom">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-[#7E5C4A]/14 bg-[#F6EDDE]/88 p-7 shadow-[10px_10px_24px_rgba(212,170,125,0.12),-6px_-6px_16px_rgba(255,255,255,0.75)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7E5C4A]">The Story</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-[#272727]">
                Built to replace fragmented updates with one calm source of truth.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[#7E5C4A]">
                <p>
                  BPI AeroPath started from a familiar operations problem: too many moving parts, too many manual
                  checks, and too much knowledge living in people instead of process.
                </p>
                <p>
                  Rather than creating a broad generic dashboard, the product focuses on specific work moments that
                  matter: planning packaging, reviewing cases, exporting details, checking reports, and seeing where
                  work stands right now.
                </p>
                <p>
                  The result is a platform designed to feel less like software overhead and more like a dependable
                  working surface for logistics operations.
                </p>
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#272727]/10 bg-[#272727] p-7 text-[#F6EDDE] shadow-[12px_12px_28px_rgba(39,39,39,0.18)]">
              <div className="flex items-center gap-3 text-[#EFD09E]">
                <Database className="h-5 w-5" />
                <p className="text-[11px] font-bold uppercase tracking-[0.28em]">What Exists Today</p>
              </div>
              <ul className="mt-6 grid gap-4">
                {milestones.map((item) => (
                  <li
                    key={item}
                    className="rounded-[1.35rem] border border-white/8 bg-white/4 px-4 py-4 text-sm leading-7 text-[#F6EDDE]/86"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container-custom">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7E5C4A]">Operating Principles</p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#272727] md:text-4xl">
              A clear product point of view, even as a one-person build.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {principles.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[1.8rem] border border-white/85 bg-[#EEF2F6]/92 p-6 shadow-[8px_8px_18px_rgba(166,180,200,0.2),-8px_-8px_18px_rgba(255,255,255,0.9)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AA7D]/22 bg-[#F6EDDE]">
                      <Icon className="h-5 w-5 text-[#7E5C4A]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#272727]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#7E5C4A]">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative py-6 md:py-10">
        <div className="container-custom">
          <div className="rounded-[2.1rem] border border-white/75 bg-[#EEF2F6]/92 p-7 shadow-[10px_10px_24px_rgba(166,180,200,0.2),-8px_-8px_20px_rgba(255,255,255,0.88)] md:p-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-[#7E5C4A]">
                <CalendarRange className="h-5 w-5" />
                <p className="text-[11px] font-bold uppercase tracking-[0.28em]">Development Timeline</p>
              </div>
              <h2 className="mt-4 text-3xl font-black leading-tight text-[#272727] md:text-4xl">
                A steady build, shaped year by year around operational use.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {timeline.map((item, index) => (
                <article key={item.year} className="relative rounded-[1.7rem] border border-[#D4AA7D]/20 bg-[#F6EDDE]/84 p-6 shadow-[6px_6px_16px_rgba(212,170,125,0.12),-4px_-4px_12px_rgba(255,255,255,0.7)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#272727] text-sm font-black text-[#EFD09E]">
                      {index + 1}
                    </div>
                    <span className="text-2xl font-black tracking-tight text-[#272727]">{item.year}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-[#272727]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#7E5C4A]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative pb-20 pt-4 md:pb-24">
        <div className="container-custom">
          <div className="rounded-[2.2rem] border border-[#7E5C4A]/12 bg-[linear-gradient(135deg,#272727_0%,#3A302A_60%,#7E5C4A_100%)] p-8 text-[#F6EDDE] shadow-[16px_16px_32px_rgba(39,39,39,0.18)] md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#EFD09E]/76">Mission</p>
                <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
                  Build operations software that makes complex work feel coordinated, visible, and easier to trust.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#F6EDDE]/82">
                  BPI AeroPath is still growing, but its direction is already clear: fewer disconnected tools, fewer
                  manual blind spots, and better workflow confidence from planning through reporting.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  href="/projects/packaging"
                  className="group rounded-[1.6rem] border border-white/12 bg-white/6 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
                >
                  <Boxes className="h-6 w-6 text-[#EFD09E]" />
                  <p className="mt-4 text-lg font-bold">Packaging Console</p>
                  <p className="mt-2 text-sm leading-6 text-[#F6EDDE]/72">
                    See planning, reports, and export workflows already live in the product.
                  </p>
                </Link>
                <Link
                  href="/projects/material-control"
                  className="group rounded-[1.6rem] border border-white/12 bg-white/6 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
                >
                  <ArrowRight className="h-6 w-6 text-[#EFD09E]" />
                  <p className="mt-4 text-lg font-bold">Open The Workspace</p>
                  <p className="mt-2 text-sm leading-6 text-[#F6EDDE]/72">
                    Continue into the modules and explore the current working system.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
