"use client";

import { BarChart3, Building2, CheckCircle2, FileCheck2, Landmark, Megaphone, QrCode, ShieldCheck, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const benefits = [
  { label: "Ticketing", icon: Ticket },
  { label: "Discovery", icon: Megaphone },
  { label: "QR Entry", icon: QrCode },
  { label: "Analytics", icon: BarChart3 },
  { label: "Marketing", icon: Users },
];

export function OrganizerLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto max-w-[1200px]">
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-8">
          <p className="text-sm font-black text-[#1d9bf0]">Host with Buizz</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-none sm:text-6xl">List your event and reach the right audience.</h1>
          <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/72">A minimal organizer workspace for publishing events, selling tickets, scanning QR entry, and tracking revenue without operational clutter.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/organizer/signup" className="inline-flex min-h-11 items-center rounded-md bg-[#e50914] px-5 text-sm font-black !text-white transition hover:bg-[#ff2634]">List Your Event</Link>
            <Link href="/organizer/login" className="inline-flex min-h-11 items-center rounded-md border border-white/14 bg-white/10 px-5 text-sm font-black !text-white transition hover:bg-white/15">Organizer Login</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
              <Icon className="size-5 text-[#ff2634]" />
              <p className="mt-3 text-sm font-black">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function OrganizerAuthPage({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [orgName, setOrgName] = useState("Buizz Partner");
  const [email, setEmail] = useState("organizer@buizz.local");
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";

  const submit = () => {
    window.localStorage.setItem("buizz-organizer", JSON.stringify({ orgName, email, onboarded: !isSignup }));
    router.push(isSignup ? "/organizer/onboarding" : "/organizer/dashboard");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)]">
      <section className="w-full max-w-md rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.18)]">
        <Building2 className="size-9 text-[#e50914]" />
        <h1 className="mt-4 text-3xl font-black">{isSignup ? "Organizer Signup" : "Organizer Login"}</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Frontend-only organizer access for Buizz hosts.</p>
        <div className="mt-5 grid gap-3">
          {isSignup ? <OrganizerInput label="Organization name" value={orgName} onChange={setOrgName} /> : null}
          <OrganizerInput label="Email" value={email} onChange={setEmail} />
          <OrganizerInput label="Password" value={password} onChange={setPassword} type="password" />
        </div>
        <button type="button" onClick={submit} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white transition hover:bg-[#ff2634]">
          {isSignup ? "Create Organizer Account" : "Open Dashboard"}
        </button>
        <Link href={isSignup ? "/organizer/login" : "/organizer/signup"} className="mt-3 inline-flex w-full justify-center text-sm font-black text-[#e50914]">
          {isSignup ? "Already listed? Login" : "New organizer? Signup"}
        </Link>
      </section>
    </main>
  );
}

export function OrganizerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Organization Information", icon: Building2 },
    { title: "Documents Upload", icon: FileCheck2 },
    { title: "Bank Details", icon: Landmark },
    { title: "Agreement & Verification", icon: ShieldCheck },
  ];

  const next = () => {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    window.localStorage.setItem("buizz-organizer-onboarded", "true");
    router.push("/organizer/dashboard");
  };

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.16)]">
        <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Account Setup Wizard</p>
        <h1 className="mt-2 text-3xl font-black">Complete organizer setup</h1>
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {steps.map(({ title, icon: Icon }, index) => (
            <div key={title} className={`rounded-md border p-3 ${index <= step ? "border-[#e50914] bg-[#e50914]/12" : "border-[var(--app-border)] bg-[var(--app-subtle)]"}`}>
              <Icon className="size-5 text-[#ff2634]" />
              <p className="mt-2 text-xs font-black">{title}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <h2 className="text-xl font-black">{steps[step].title}</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Mock setup fields are accepted for this frontend prototype.</p>
          <input className="mt-4 min-h-11 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold outline-none focus:border-[#e50914]" placeholder="Enter details" />
        </div>
        <button type="button" onClick={next} className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white transition hover:bg-[#ff2634]">
          {step === steps.length - 1 ? "Open Dashboard" : "Continue"}
        </button>
      </section>
    </main>
  );
}

export function OrganizerDashboardHome() {
  const metrics = [
    ["Overview", "12 live events"],
    ["Tickets", "3,420 sold"],
    ["Revenue", "Rs. 18.4L"],
    ["Attendees", "2,980 checked in"],
    ["Payouts", "Rs. 6.2L pending"],
    ["Settings", "Profile complete"],
  ];

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
      <section className="mx-auto max-w-[1200px]">
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_18px_58px_rgba(0,0,0,0.12)]">
          <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Organizer Dashboard</p>
          <h1 className="mt-2 text-3xl font-black">Clean control for your Buizz events</h1>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
              <p className="text-xs font-black uppercase tracking-normal text-[var(--app-muted)]">{label}</p>
              <p className="mt-2 text-xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function OrganizerInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none focus:border-[#e50914]" />
    </label>
  );
}
