"use client";

const agreementItems = [
  "Organizer is responsible for event authenticity.",
  "Organizer agrees to follow local laws and regulations.",
  "Ticket refunds and cancellations are organizer responsibilities.",
  "Buizz acts only as a platform provider.",
  "Fraudulent activities can lead to account suspension.",
  "Buizz may review and verify submitted information.",
  "Organizers agree to the Terms of Service and Privacy Policy.",
];

export function AgreementCard() {
  return (
    <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_18px_50px_rgba(17,24,39,0.06)] sm:p-6">
      <h2 className="text-xl font-black text-[var(--app-foreground)]">Buizz Organizer Agreement</h2>
      <div className="mt-5 max-h-[360px] overflow-y-auto rounded-[18px] border border-[var(--app-border)] bg-[var(--app-background)] p-4 pr-3">
        <div className="grid gap-3">
          {agreementItems.map((item, index) => (
            <article key={item} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
              <p className="text-sm font-black text-[var(--app-foreground)]">{index + 1}. {item}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
