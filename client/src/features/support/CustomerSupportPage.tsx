"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HeadphonesIcon,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Ticket,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Footer } from "@/components/common/Footer";
import {
  createSupportTicketId,
  getAutoSupportPriority,
  getSupportTickets,
  getSupportTimestamp,
  saveSupportTickets,
  type SupportTicket,
  type SupportTicketCategory,
} from "@/lib/supportTickets";

type CustomerIssueOption = {
  label: string;
  category: SupportTicketCategory;
  helper: string;
};

const SUPPORT_COLORS = {
  primary: "#EC1B72",
  secondary: "#6626B9",
  accent: "#F6C453",
  success: "#16A34A",
  danger: "#EF4444",
  ink: "#101828",
  muted: "#667085",
  surface: "#FFFFFF",
  subtle: "#F4F6FB",
  border: "#E6E9F2",
} as const;

const customerIssueOptions: CustomerIssueOption[] = [
  {
    label: "Refund Request",
    category: "Refund Request",
    helper: "Use this when payment was successful but you need refund support.",
  },
  {
    label: "Payment Failed",
    category: "Payment Failed",
    helper: "Use this when money was deducted, UPI/card failed, or payment is stuck.",
  },
  {
    label: "Booking Issue",
    category: "Booking Issue",
    helper: "Use this when booking confirmation, event, venue, date, or slot has a problem.",
  },
  {
    label: "Ticket QR Issue",
    category: "Ticket QR Issue",
    helper: "Use this when QR is not opening, invalid, or scanner is not accepting it.",
  },
  {
    label: "Ticket Not Received",
    category: "Ticket Not Received",
    helper: "Use this when ticket email, WhatsApp, or profile ticket is missing.",
  },
  {
    label: "Seat Issue",
    category: "Seat Issue",
    helper: "Use this when selected seat, section, gate, or ticket block is wrong.",
  },
  {
    label: "Other",
    category: "Other",
    helper: "Use this for anything not covered above.",
  },
];

const supportFaqs = [
  {
    question: "How do I get my ticket after booking?",
    answer:
      "After successful booking, your ticket is available on the success page and inside your Profile > Tickets. In production, ticket delivery will also use email and WhatsApp when enabled.",
  },
  {
    question: "What should I do if payment failed but money was deducted?",
    answer:
      "Create a Payment Failed support ticket with your booking ID, payment reference, UPI/card transaction ID, and screenshot details. Admin/Super Admin can review it from the support queue.",
  },
  {
    question: "How can I request a refund?",
    answer:
      "Create a Refund Request ticket and mention booking ID, ticket ID, event name, reason, and payment reference. Refund approval depends on the event refund policy and admin review.",
  },
  {
    question: "My QR code is not working at the venue. What should I do?",
    answer:
      "Create a Ticket QR Issue ticket and also contact venue gate support. Admin/Organizer can verify ticket validity, duplicate scan status, cancellation, and check-in logs.",
  },
  {
    question: "Can I change my seat, date, or time slot?",
    answer:
      "Seat/date/time changes depend on event policy and seat availability. Create a Seat Issue or Booking Issue ticket with exact booking and ticket details.",
  },
  {
    question: "Where can I track my support ticket?",
    answer:
      "For the frontend MVP, the ticket is sent to the Admin/Super Admin support queue. Backend integration will add customer ticket tracking, email updates, and ticket history.",
  },
];

const supportProcess = [
  {
    title: "Submit ticket",
    detail: "Customer fills issue details with booking or ticket reference.",
    icon: Send,
  },
  {
    title: "Admin review",
    detail: "Admin/Super Admin checks the ticket in the support dashboard.",
    icon: ShieldCheck,
  },
  {
    title: "Resolution",
    detail: "Support team updates status, reply, refund action, or technical fix.",
    icon: CheckCircle2,
  },
];

export function CustomerSupportPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    bookingId: "",
    ticketId: "",
    issueCategory: customerIssueOptions[0].label,
    subject: "",
    description: "",
  });

  const [message, setMessage] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [submittedFileNames, setSubmittedFileNames] = useState<string[]>([]);

  const selectedIssue = useMemo(
    () =>
      customerIssueOptions.find((option) => option.label === form.issueCategory) ??
      customerIssueOptions[0],
    [form.issueCategory],
  );

  const canSubmit = Boolean(
    form.name.trim() &&
    form.email.trim() &&
    form.subject.trim() &&
    form.description.trim(),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("bookingId") ?? "";
    const ticketId = params.get("ticketId") ?? "";
    const subject = params.get("subject") ?? "";

    if (bookingId || ticketId || subject) {
      setForm((current) => ({
        ...current,
        bookingId,
        ticketId,
        subject,
      }));
    }
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      whatsapp: "",
      bookingId: "",
      ticketId: "",
      issueCategory: customerIssueOptions[0].label,
      subject: "",
      description: "",
    });
    setMessage("");
    setSubmittedTicket(null);
    setSupportFiles([]);
    setSubmittedFileNames([]);
  };

  const submitTicket = async () => {
    if (!canSubmit) {
      setMessage("Name, email, subject, and description are required.");
      return;
    }

    const now = getSupportTimestamp();
    const attachmentNames = supportFiles.map((file) => file.name);

    const references = [
      "Source: Public Customer Support",
      `Issue category: ${form.issueCategory}`,
      form.whatsapp.trim() ? `WhatsApp: ${form.whatsapp.trim()}` : "",
      form.bookingId.trim() ? `Booking ID: ${form.bookingId.trim()}` : "",
      form.ticketId.trim() ? `Ticket ID: ${form.ticketId.trim()}` : "",
      attachmentNames.length ? `Reference attachments: ${attachmentNames.join(", ")}` : "",
    ].filter(Boolean);

    const ticket: SupportTicket = {
      id: createSupportTicketId(),
      sourceType: "User",
      requesterName: form.name.trim(),
      requesterEmail: form.email.trim(),
      subject: form.subject.trim(),
      description: `${form.description.trim()}\n\n${references.join("\n")}`,
      category: selectedIssue.category,
      priority: getAutoSupportPriority(selectedIssue.category),
      status: "Open",
      assignedTo: "Unassigned",
      createdAt: now,
      lastUpdated: now,
    };

    /*
      Backend integration later:
      await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticket),
      });

      For frontend MVP, we save in shared support storage so Admin/Super Admin
      support queue can read the same ticket.
    */

    saveSupportTickets([ticket, ...getSupportTickets()]);
    setSubmittedTicket(ticket);
    setSubmittedFileNames(attachmentNames);
    setSupportFiles([]);
    setMessage(`Support ticket ${ticket.id} created successfully.`);
    setForm({
      name: "",
      email: "",
      whatsapp: "",
      bookingId: "",
      ticketId: "",
      issueCategory: customerIssueOptions[0].label,
      subject: "",
      description: "",
    });
  };

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] px-4 py-6 text-[var(--app-foreground)] sm:px-6 sm:py-8 lg:px-8">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-6">
          <section className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:rounded-[2rem]">
            <div
              className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:p-8 xl:p-10"
              style={{
                background: `radial-gradient(circle at top right, ${SUPPORT_COLORS.primary}24, transparent 42%), radial-gradient(circle at bottom left, ${SUPPORT_COLORS.secondary}18, transparent 38%), linear-gradient(135deg, var(--app-elevated), var(--app-subtle))`,
              }}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--color-brand-primary)] sm:text-xs">
                    <LifeBuoy className="size-4" />
                    Buizz Help Center
                  </span>
                  <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)]/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--app-muted)] sm:text-xs">
                    Customer Support
                  </span>
                </div>

                <h1 className="mt-5 max-w-4xl text-[clamp(2rem,6vw,4.5rem)] font-black leading-[1.02] tracking-[-0.05em]">
                  Need help with your booking or ticket?
                </h1>

                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[var(--app-muted)] sm:text-base sm:leading-8">
                  Create a support ticket for refunds, failed payments, QR issues, missing tickets,
                  seat problems, or booking support. Your request goes to the Buizz Admin/Super Admin support queue.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Response", "Admin review queue"],
                    ["Priority", "Auto assigned"],
                    ["Status", "Open after submit"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)]/75 p-4 backdrop-blur"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                        {label}
                      </p>
                      <p className="mt-1 truncate text-sm font-black">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)]/75 p-3 backdrop-blur sm:p-4">
                <div className="grid gap-3">
                  {supportProcess.map(({ title, detail, icon: Icon }, index) => (
                    <div
                      key={title}
                      className="flex min-w-0 gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black">
                          {index + 1}. {title}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                          {detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-6 lg:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                    Create New Ticket
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                    Fill support details
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--app-muted)]">
                    Add accurate booking/ticket reference so support can resolve faster.
                  </p>
                </div>

                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                  <HeadphonesIcon className="size-5" />
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SupportField
                  label="Name *"
                  value={form.name}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  placeholder="Your full name"
                />

                <SupportField
                  label="Email *"
                  value={form.email}
                  onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                  placeholder="you@example.com"
                  type="email"
                />

                <SupportField
                  label="WhatsApp"
                  value={form.whatsapp}
                  onChange={(value) => setForm((current) => ({ ...current, whatsapp: value }))}
                  placeholder="Optional phone number"
                  type="tel"
                />

                <SupportField
                  label="Booking ID"
                  value={form.bookingId}
                  onChange={(value) => setForm((current) => ({ ...current, bookingId: value }))}
                  placeholder="Optional booking reference"
                />

                <SupportField
                  label="Ticket ID"
                  value={form.ticketId}
                  onChange={(value) => setForm((current) => ({ ...current, ticketId: value }))}
                  placeholder="Optional ticket reference"
                />

                <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
                  Issue Category *
                  <select
                    value={form.issueCategory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        issueCategory: event.target.value,
                      }))
                    }
                    className="min-h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black normal-case text-[var(--app-foreground)] outline-none transition focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
                  >
                    {customerIssueOptions.map((option) => (
                      <option key={option.label}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-4 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
                    <p className="text-sm font-semibold leading-6 text-[var(--app-muted)]">
                      {selectedIssue.helper} Priority will be assigned automatically based on issue type.
                    </p>
                  </div>
                </div>

                <label className="flex min-h-14 cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold text-[var(--app-muted)] transition hover:border-[var(--color-brand-primary)] sm:flex-row sm:items-center sm:justify-between md:col-span-2">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--app-elevated)] text-[var(--color-brand-primary)]">
                      <UploadCloud className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-black text-[var(--app-foreground)]">
                        {supportFiles.length
                          ? `${supportFiles.length} reference file${supportFiles.length > 1 ? "s" : ""} selected`
                          : "Attach reference optional"}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-[var(--app-muted)]">
                        Image, video, PDF, DOC, XLS, or TXT
                      </span>
                    </span>
                  </span>

                  <span className="inline-flex w-full shrink-0 justify-center rounded-xl bg-[var(--app-elevated)] px-4 py-2 text-xs font-black text-[var(--color-brand-primary)] sm:w-auto">
                    Choose File
                  </span>

                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setSupportFiles(files);
                    }}
                    className="sr-only"
                  />
                </label>

                {supportFiles.length ? (
                  <div className="flex min-w-0 flex-wrap gap-2 md:col-span-2">
                    {supportFiles.map((file) => (
                      <span
                        key={`${file.name}-${file.size}`}
                        className="max-w-full truncate rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-1 text-xs font-black text-[var(--app-muted)]"
                      >
                        {file.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="md:col-span-2">
                  <SupportField
                    label="Subject *"
                    value={form.subject}
                    onChange={(value) => setForm((current) => ({ ...current, subject: value }))}
                    placeholder="Short title of your issue"
                  />
                </div>

                <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)] md:col-span-2">
                  Description *
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Explain what happened. Add payment reference, event name, screenshots info, or any details support should know."
                    className="min-h-40 w-full resize-y rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-semibold normal-case leading-6 text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] sm:min-h-44"
                  />
                </label>
              </div>

              {message ? (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-black ${submittedTicket
                      ? "border-[#16A34A]/25 bg-[#16A34A]/10 text-[#16A34A]"
                      : "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                    }`}
                >
                  {message}
                </div>
              ) : null}

              {submittedTicket ? (
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
                        <Ticket className="size-4" />
                      </span>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                        Submitted Ticket
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <SupportInfo label="Ticket ID" value={submittedTicket.id} />
                      <SupportInfo label="Status" value={submittedTicket.status} />
                      <SupportInfo label="Priority" value={submittedTicket.priority} />
                    </div>
                  </div>

                  {submittedFileNames.length ? (
                    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
                        Reference Attachments
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {submittedFileNames.map((fileName) => (
                          <span
                            key={fileName}
                            className="max-w-full truncate rounded-full bg-[var(--app-subtle)] px-3 py-1 text-xs font-black text-[var(--app-muted)]"
                          >
                            {fileName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-12 w-full rounded-2xl border border-[var(--app-border)] px-5 text-sm font-black transition hover:bg-[var(--app-subtle)] sm:w-auto"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={submitTicket}
                  disabled={!canSubmit}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] px-6 text-sm font-black text-white shadow-[0_16px_36px_rgba(236,27,114,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_42px_rgba(236,27,114,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
                >
                  <Send className="size-4" />
                  Submit Ticket
                </button>
              </div>
            </section>

            <aside className="grid min-w-0 content-start gap-5 lg:sticky lg:top-24">
              <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                  Frequently Asked Questions
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight">Quick answers</h2>

                <div className="mt-4 grid gap-3">
                  {supportFaqs.map((faq) => (
                    <details
                      key={faq.question}
                      className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-black">
                        <span className="min-w-0 leading-5">{faq.question}</span>
                        <span className="shrink-0 text-lg leading-5 text-[var(--app-muted)] transition group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                  Contact Options
                </p>

                <div className="mt-4 grid gap-3">
                  <ContactRow icon={Mail} label="Email support" value="support@buizz.local" />
                  <ContactRow icon={Phone} label="Phone support" value="Backend team will configure" />
                  <ContactRow icon={MessageCircle} label="WhatsApp updates" value="Available after integration" />
                  <ContactRow icon={Clock} label="Support hours" value="10 AM - 7 PM IST" />
                </div>
              </section>

              <section className="rounded-3xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 p-4 sm:rounded-[2rem] sm:p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--color-brand-secondary)]" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-[var(--color-brand-secondary)]">
                      Backend-ready support flow
                    </h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--app-muted)]">
                      This form currently saves to the shared frontend support ticket system.
                      Later, replace local save with the API call in submitTicket().
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}

function SupportField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-muted)]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-semibold normal-case text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)]"
      />
    </label>
  );
}

function SupportInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black">{label}</p>
        <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--app-muted)]">
          {value}
        </p>
      </div>
    </div>
  );
}