"use client";

import { BuizzTicketCard } from "./BuizzTicketCard";
import type { BuizzTicketData, TicketMode } from "./ticketTypes";

type TicketTemplateProps = {
  ticketData: BuizzTicketData;
  mode?: TicketMode;
  showActions?: boolean;
  backHref?: string;
};

export function TicketTemplate({
  ticketData,
  mode = "customer",
  showActions = true,
  backHref = "/profile/tickets",
}: TicketTemplateProps) {
  return (
    <section className="buizz-ticket-print-area min-w-0">
      <BuizzTicketCard
        ticket={ticketData}
        mode={mode}
        showActions={showActions}
        viewHref={backHref}
      />
    </section>
  );
}
