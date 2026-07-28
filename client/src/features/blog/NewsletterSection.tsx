"use client";

import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

export function NewsletterSection() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!email.trim()) {
            setStatus("error");
            setMessage("Please enter your email address.");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const response = await fetch("/api/newsletter", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus("error");
                setMessage(data.message || "Something went wrong.");
                return;
            }

            setStatus("success");
            setMessage(data.message || "You have subscribed successfully.");
            setEmail("");
        } catch {
            setStatus("error");
            setMessage("Network error. Please try again.");
        }
    }

    return (
        <section
            id="newsletter"
            className="px-4 py-20 sm:px-6 lg:px-8"
        >
            <div className="mx-auto max-w-7xl overflow-hidden rounded-[3rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
                <div className="grid lg:grid-cols-[1fr_0.9fr] lg:items-center">
                    <div className="p-8 sm:p-12">
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                            Stay Connected
                        </p>

                        <h2 className="mt-4 text-4xl font-black sm:text-5xl">
                            Never miss the next experience
                        </h2>

                        <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
                            Receive curated event guides, activity recommendations, family plans,
                            organizer insights, and the latest updates from Buizz.
                        </p>

                        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                className="h-14 flex-1 rounded-full border border-[var(--app-border)] bg-[var(--app-input)] px-6 outline-none focus:border-[var(--color-brand-primary)]"
                            />

                            <button className="rounded-full bg-[var(--color-brand-primary)] px-8 py-4 font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1">
                                Join Community
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-[var(--app-muted)]">
                            No spam. Only valuable stories and updates.
                        </p>
                    </div>

                    <div className="hidden lg:block">
                        <img
                            src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80"
                            className="h-full w-full object-cover"
                            alt=""
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}