"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  AccessBlocked,
  Panel,
  ResponsiveFilterPanel,
  ResponsiveModalShell,
  ResponsiveStatCard,
  ResponsiveStatRow,
} from "./SharedDashboardComponents";

import {
  adminSupportAssignees,
  getSupportTickets,
  getSupportTimestamp,
  saveSupportTickets,
  supportTicketAssignees,
  supportTicketCategories,
  supportTicketPriorities,
  supportTicketStatuses,
  type SupportTicket,
  type SupportTicketAssignee,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/lib/supportTickets";
import {
  defaultAdminPermissions,
  usePermissionStore,
} from "@/store/permissionStore";

type SupportStatusFilter = "All Status" | SupportTicketStatus;
type SupportSourceFilter = "All Sources" | SupportTicket["sourceType"];
type SupportCategoryFilter = "All Categories" | SupportTicketCategory;
type SupportPriorityFilter = "All Priorities" | SupportTicketPriority;
type SupportAssigneeFilter = "All Assignees" | SupportTicketAssignee;

const supportInputClass =
  "min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold outline-none focus:border-[var(--color-brand-primary)]";

export function SuperAdminSupportView() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => getSupportTickets());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupportStatusFilter>("All Status");
  const [sourceFilter, setSourceFilter] = useState<SupportSourceFilter>("All Sources");
  const [categoryFilter, setCategoryFilter] = useState<SupportCategoryFilter>("All Categories");
  const [priorityFilter, setPriorityFilter] = useState<SupportPriorityFilter>("All Priorities");
  const [assigneeFilter, setAssigneeFilter] = useState<SupportAssigneeFilter>("All Assignees");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<SupportTicketAssignee>("Support Admin");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setSelectedAssignee(selectedTicket?.assignedTo === "Unassigned" ? "Support Admin" : selectedTicket?.assignedTo ?? "Support Admin");
  }, [selectedTicket]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const updateTicket = (id: string, patch: Partial<SupportTicket>) => {
    setTickets((current) => {
      const updated = current.map((ticket) =>
        ticket.id === id
          ? { ...ticket, ...patch, lastUpdated: getSupportTimestamp() }
          : ticket
      );
      setSelectedTicket((selected) =>
        selected?.id === id ? updated.find((ticket) => ticket.id === id) ?? null : selected
      );
      saveSupportTickets(updated);
      return updated;
    });
  };

  const updateTicketPriority = (id: string, priority: SupportTicketPriority) => {
    updateTicket(id, { priority });
    setToastMessage(`Priority updated to ${priority}.`);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const query = search.toLowerCase();
    const searchable = `${ticket.id} ${ticket.subject} ${ticket.requesterName} ${ticket.requesterEmail} ${ticket.description}`.toLowerCase();
    return (
      searchable.includes(query) &&
      (statusFilter === "All Status" || ticket.status === statusFilter) &&
      (sourceFilter === "All Sources" || ticket.sourceType === sourceFilter) &&
      (categoryFilter === "All Categories" || ticket.category === categoryFilter) &&
      (priorityFilter === "All Priorities" || ticket.priority === priorityFilter) &&
      (assigneeFilter === "All Assignees" || ticket.assignedTo === assigneeFilter)
    );
  });

  const openCount = tickets.filter((ticket) => ticket.status === "Open").length;
  const waitingOnBuizz = tickets.filter((ticket) => ticket.status === "Open" && ticket.assignedTo === "Unassigned").length;
  const inProgress = tickets.filter((ticket) => ticket.status === "In Progress").length;
  const resolved = tickets.filter((ticket) => ticket.status === "Resolved").length;

  return (
    <Panel
      title="Support Center"
      description="Organizer, user, or admin reported this issue from their dashboard/website. Super Admin can review it, assign it to an admin/support team member, track status, and close it after resolution."
    >
      <DashboardToast message={toastMessage} />
      <div className="grid gap-5">
        <ResponsiveStatRow className="md:grid-cols-3 xl:grid-cols-5">
          <ResponsiveStatCard title="Open Tickets" value={String(openCount)} detail="Waiting on Buizz" />
          <ResponsiveStatCard title="Waiting on Buizz" value={String(waitingOnBuizz)} detail="Unassigned" />
          <ResponsiveStatCard title="In Progress" value={String(inProgress)} detail="Assigned" />
          <ResponsiveStatCard title="Resolved This Month" value={String(resolved)} detail="Closed-loop" />
          <ResponsiveStatCard title="Avg Response Time" value="2h 15m" detail="Support SLA" />
        </ResponsiveStatRow>

        <SupportFilterBar
          search={search}
          onSearch={setSearch}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          sourceFilter={sourceFilter}
          onSourceFilter={setSourceFilter}
          categoryFilter={categoryFilter}
          onCategoryFilter={setCategoryFilter}
          priorityFilter={priorityFilter}
          onPriorityFilter={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeFilter={setAssigneeFilter}
        />

        <SupportTicketsTable
          tickets={filteredTickets}
          onView={setSelectedTicket}
          actions={(ticket) => (
            <>
              <SupportActionButton label="Assign" onClick={() => setSelectedTicket(ticket)} />
              <SupportActionButton
                label="In Progress"
                onClick={() => updateTicket(ticket.id, { status: "In Progress", assignedTo: ticket.assignedTo === "Unassigned" ? "Support Admin" : ticket.assignedTo })}
              />
              <SupportActionButton label="Resolve" tone="success" onClick={() => updateTicket(ticket.id, { status: "Resolved" })} />
              <SupportActionButton label="Close" tone="danger" onClick={() => updateTicket(ticket.id, { status: "Closed" })} />
              {ticket.status === "Closed" ? <SupportActionButton label="Reopen" onClick={() => updateTicket(ticket.id, { status: "Open" })} /> : null}
            </>
          )}
        />
      </div>

      {selectedTicket ? (
        <SupportTicketModal title="Support Ticket" ticket={selectedTicket} onClose={() => setSelectedTicket(null)}>
          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">Assignment</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select value={selectedAssignee} onChange={(event) => setSelectedAssignee(event.target.value as SupportTicketAssignee)} className={`${supportInputClass} flex-1`}>
                {supportTicketAssignees.filter((assignee) => assignee !== "Unassigned").map((assignee) => <option key={assignee}>{assignee}</option>)}
              </select>
              <button type="button" onClick={() => updateTicket(selectedTicket.id, { assignedTo: selectedAssignee })} className="min-h-10 rounded-md bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white">
                Save Assignment
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">Priority</p>
            <select value={selectedTicket.priority} onChange={(event) => updateTicketPriority(selectedTicket.id, event.target.value as SupportTicketPriority)} className={`${supportInputClass} mt-3 w-full`}>
              {supportTicketPriorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => updateTicket(selectedTicket.id, { status: "In Progress", assignedTo: selectedTicket.assignedTo === "Unassigned" ? "Support Admin" : selectedTicket.assignedTo })} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-xs font-black">
              Mark In Progress
            </button>
            <button type="button" onClick={() => updateTicket(selectedTicket.id, { status: "Resolved" })} className="min-h-10 rounded-md bg-[#22C55E] px-4 text-xs font-black text-white">
              Mark Resolved
            </button>
            <button type="button" onClick={() => updateTicket(selectedTicket.id, { status: "Closed" })} className="min-h-10 rounded-md bg-[var(--app-foreground)] px-4 text-xs font-black text-white">
              Close Ticket
            </button>
            <button type="button" onClick={() => updateTicket(selectedTicket.id, { status: "Open" })} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-xs font-black">
              Reopen Ticket
            </button>
          </div>
        </SupportTicketModal>
      ) : null}
    </Panel>
  );
}

export function AdminSupportTicketsView() {
  const storedPermissions = usePermissionStore((state) => state.adminPermissions["admin-ops"]);
  const permissions = { ...defaultAdminPermissions, ...(storedPermissions ?? {}) };
  const [tickets, setTickets] = useState<SupportTicket[]>(() => getSupportTickets());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupportStatusFilter>("All Status");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (!permissions.viewSupportTickets) return <AccessBlocked role="admin" />;

  const updateTicket = (id: string, patch: Partial<SupportTicket>) => {
    setTickets((current) => {
      const updated = current.map((ticket) =>
        ticket.id === id ? { ...ticket, ...patch, lastUpdated: getSupportTimestamp() } : ticket
      );
      setSelectedTicket((selected) =>
        selected?.id === id ? updated.find((ticket) => ticket.id === id) ?? null : selected
      );
      saveSupportTickets(updated);
      return updated;
    });
  };

  const updateTicketPriority = (id: string, priority: SupportTicketPriority) => {
    if (!permissions.changeTicketPriority) return;
    updateTicket(id, { priority });
    setToastMessage(`Priority updated to ${priority}.`);
  };

  const assignedTickets = tickets.filter((ticket) => adminSupportAssignees.includes(ticket.assignedTo));
  const filteredTickets = assignedTickets.filter((ticket) => {
    const query = search.toLowerCase();
    const searchable = `${ticket.id} ${ticket.subject} ${ticket.requesterName} ${ticket.requesterEmail} ${ticket.category}`.toLowerCase();
    return searchable.includes(query) && (statusFilter === "All Status" || ticket.status === statusFilter);
  });

  return (
    <Panel title="Support Tickets" description="Assigned support tickets for admin operations, finance, review, and support teams.">
      <DashboardToast message={toastMessage} />
      <div className="grid gap-5">
        <ResponsiveStatRow className="md:grid-cols-3">
          <ResponsiveStatCard title="Assigned Tickets" value={String(assignedTickets.length)} detail="Admin queue" />
          <ResponsiveStatCard title="In Progress" value={String(assignedTickets.filter((ticket) => ticket.status === "In Progress").length)} detail="Active handling" />
          <ResponsiveStatCard title="Resolved" value={String(assignedTickets.filter((ticket) => ticket.status === "Resolved").length)} detail="This month" />
        </ResponsiveStatRow>

        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assigned tickets..." className={`${supportInputClass} flex-1`} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SupportStatusFilter)} className={supportInputClass}>
            <option>All Status</option>
            {supportTicketStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        <SupportTicketsTable
          tickets={filteredTickets}
          onView={setSelectedTicket}
          actions={(ticket) => (
            <>
              {permissions.manageSupportTickets ? <SupportActionButton label="In Progress" onClick={() => updateTicket(ticket.id, { status: "In Progress", assignedTo: ticket.assignedTo === "Unassigned" ? "Support Admin" : ticket.assignedTo })} /> : null}
              {permissions.resolveSupportTickets ? <SupportActionButton label="Resolve" tone="success" onClick={() => updateTicket(ticket.id, { status: "Resolved" })} /> : null}
            </>
          )}
        />
      </div>

      {selectedTicket ? (
        <SupportTicketModal title="Assigned Ticket" ticket={selectedTicket} onClose={() => setSelectedTicket(null)}>
          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">Priority</p>
            <select disabled={!permissions.changeTicketPriority} value={selectedTicket.priority} onChange={(event) => updateTicketPriority(selectedTicket.id, event.target.value as SupportTicketPriority)} className={`${supportInputClass} mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60`}>
              {supportTicketPriorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
            {!permissions.changeTicketPriority ? (
              <p className="mt-2 text-xs font-bold text-[var(--app-muted)]">Only Super Admin or permitted Support Admin can change priority.</p>
            ) : null}
          </div>
          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">Internal Note Placeholder</p>
            <textarea className="mt-3 min-h-24 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-2 text-sm font-semibold outline-none" placeholder="Internal notes will save here when backend support APIs are connected." />
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {permissions.manageSupportTickets ? <button type="button" onClick={() => updateTicket(selectedTicket.id, { status: "In Progress", assignedTo: selectedTicket.assignedTo === "Unassigned" ? "Support Admin" : selectedTicket.assignedTo })} className="min-h-10 rounded-md border border-[var(--app-border)] px-4 text-xs font-black">Mark In Progress</button> : null}
            {permissions.resolveSupportTickets ? <button type="button" onClick={() => updateTicket(selectedTicket.id, { status: "Resolved" })} className="min-h-10 rounded-md bg-[#22C55E] px-4 text-xs font-black text-white">Mark Resolved</button> : null}
          </div>
        </SupportTicketModal>
      ) : null}
    </Panel>
  );
}

function SupportFilterBar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  sourceFilter,
  onSourceFilter,
  categoryFilter,
  onCategoryFilter,
  priorityFilter,
  onPriorityFilter,
  assigneeFilter,
  onAssigneeFilter,
}: {
  search: string;
  onSearch: (value: string) => void;
  statusFilter: SupportStatusFilter;
  onStatusFilter: (value: SupportStatusFilter) => void;
  sourceFilter: SupportSourceFilter;
  onSourceFilter: (value: SupportSourceFilter) => void;
  categoryFilter: SupportCategoryFilter;
  onCategoryFilter: (value: SupportCategoryFilter) => void;
  priorityFilter: SupportPriorityFilter;
  onPriorityFilter: (value: SupportPriorityFilter) => void;
  assigneeFilter: SupportAssigneeFilter;
  onAssigneeFilter: (value: SupportAssigneeFilter) => void;
}) {
  return (
    <ResponsiveFilterPanel className="md:grid-cols-2 lg:grid-cols-6">
      <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search tickets..." className={`${supportInputClass} lg:col-span-2`} />
      <select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value as SupportStatusFilter)} className={supportInputClass}><option>All Status</option>{supportTicketStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      <select value={sourceFilter} onChange={(event) => onSourceFilter(event.target.value as SupportSourceFilter)} className={supportInputClass}><option>All Sources</option><option>Organizer</option><option>User</option><option>Admin</option></select>
      <select value={categoryFilter} onChange={(event) => onCategoryFilter(event.target.value as SupportCategoryFilter)} className={supportInputClass}><option>All Categories</option>{supportTicketCategories.map((category) => <option key={category}>{category}</option>)}</select>
      <select value={priorityFilter} onChange={(event) => onPriorityFilter(event.target.value as SupportPriorityFilter)} className={supportInputClass}><option>All Priorities</option>{supportTicketPriorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
      <select value={assigneeFilter} onChange={(event) => onAssigneeFilter(event.target.value as SupportAssigneeFilter)} className={supportInputClass}><option>All Assignees</option>{supportTicketAssignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select>
    </ResponsiveFilterPanel>
  );
}

function SupportTicketsTable({
  tickets,
  onView,
  actions,
  compact = false,
}: {
  tickets: SupportTicket[];
  onView: (ticket: SupportTicket) => void;
  actions: (ticket: SupportTicket) => ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="grid gap-3 lg:hidden">
        {tickets.map((ticket) => (
          <article
            key={`mobile-${ticket.id}`}
            className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-base font-black text-[var(--app-foreground)]">
                  {ticket.subject}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                  {ticket.id} - {ticket.lastUpdated}
                </p>
              </div>
              <SupportStatusBadge status={ticket.status} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SupportDetailBox label="Requester" value={`${ticket.requesterName} / ${ticket.requesterEmail}`} />
              <SupportDetailBox label="Source" value={<SupportSourceBadge sourceType={ticket.sourceType} />} />
              <SupportDetailBox label="Category" value={<SupportCategoryBadge category={ticket.category} />} />
              <SupportDetailBox label="Priority" value={<SupportPriorityBadge priority={ticket.priority} />} />
              <SupportDetailBox label="Assigned To" value={ticket.assignedTo} />
              <SupportDetailBox label="Created" value={ticket.createdAt} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <SupportActionButton label="View" onClick={() => onView(ticket)} />
              {actions(ticket)}
            </div>
          </article>
        ))}
        {!tickets.length ? (
          <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center text-sm font-black text-[var(--app-muted)]">
            No support tickets match this view.
          </p>
        ) : null}
      </div>

    <div className="hidden min-w-0 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] lg:block">
      <table className={`w-full text-left text-sm ${compact ? "min-w-[860px]" : "min-w-[1180px]"}`}>
        <thead>
          <tr className="border-b border-[var(--app-border)] text-xs font-black uppercase text-[var(--app-muted)]">
            <th className="px-4 py-4">Ticket</th>
            <th className="px-4 py-4">Requester</th>
            <th className="px-4 py-4">Category</th>
            <th className="px-4 py-4">Priority</th>
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4">Assigned To</th>
            <th className="px-4 py-4">Last Updated</th>
            <th className="px-4 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-[var(--app-border)] last:border-0">
              <td className="px-4 py-4 align-top"><p className="max-w-xs font-black">{ticket.subject}</p><p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{ticket.id} - {ticket.createdAt}</p></td>
              <td className="px-4 py-4 align-top"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{ticket.requesterName}</p><SupportSourceBadge sourceType={ticket.sourceType} /></div><p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{ticket.requesterEmail}</p></td>
              <td className="px-4 py-4 align-top"><SupportCategoryBadge category={ticket.category} /></td>
              <td className="px-4 py-4 align-top"><SupportPriorityBadge priority={ticket.priority} /></td>
              <td className="px-4 py-4 align-top"><SupportStatusBadge status={ticket.status} /></td>
              <td className="px-4 py-4 align-top font-semibold">{ticket.assignedTo}</td>
              <td className="px-4 py-4 align-top font-semibold">{ticket.lastUpdated}</td>
              <td className="px-4 py-4 align-top"><div className="flex flex-wrap gap-2"><SupportActionButton label="View" onClick={() => onView(ticket)} />{actions(ticket)}</div></td>
            </tr>
          ))}
          {!tickets.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm font-black text-[var(--app-muted)]">No support tickets match this view.</td></tr> : null}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function SupportTicketModal({
  title,
  ticket,
  onClose,
  children,
}: {
  title: string;
  ticket: SupportTicket;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ResponsiveModalShell
      title={ticket.subject}
      subtitle={`${title} - ${ticket.id} - ${ticket.createdAt}`}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <SupportDetailBox label="Source Type" value={ticket.sourceType} />
          <SupportDetailBox label="Requester" value={ticket.requesterName} />
          <SupportDetailBox label="Email" value={ticket.requesterEmail} />
          <SupportDetailBox label="Category" value={ticket.category} />
          <SupportDetailBox label="Priority" value={ticket.priority} />
          <SupportDetailBox label="Status" value={ticket.status} />
          <SupportDetailBox label="Assigned To" value={ticket.assignedTo} />
          <SupportDetailBox label="Last Updated" value={ticket.lastUpdated} />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <p className="text-xs font-black uppercase text-[var(--app-muted)]">Description</p>
          <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">{ticket.description}</p>
        </div>
        {children}
    </ResponsiveModalShell>
  );
}

function SupportStatCard({
  title,
  value,
  change,
  positive,
}: {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className={`mt-1 text-xs font-black ${positive ? "text-[#22C55E]" : "text-[var(--app-muted)]"}`}>{change}</p>
    </div>
  );
}

function SupportDetailBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function SupportActionButton({
  label,
  onClick,
  tone = "neutral",
}: {
  label: string;
  onClick: () => void;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#22C55E]/30 bg-[#22C55E] text-white"
      : tone === "danger"
        ? "border-[var(--app-foreground)] bg-[var(--app-foreground)] text-white"
        : "border-[var(--app-border)] bg-[var(--app-elevated)]";
  return <button type="button" onClick={onClick} className={`rounded-md border px-3 py-2 text-xs font-black ${toneClass}`}>{label}</button>;
}

function SupportCategoryBadge({ category }: { category: SupportTicketCategory }) {
  const toneByCategory: Record<SupportTicketCategory, string> = {
    "Refund Request": "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]",
    "Booking Issue": "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]",
    "Payment Failed": "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]",
    "Ticket QR Issue": "bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]",
    "Ticket Not Received": "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]",
    "Seat Issue": "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]",
    "Seat Map Issue": "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]",
    "Settlement Issue": "bg-[#22C55E]/15 text-[#22C55E]",
    "Event Approval": "bg-[#0891b2]/15 text-[#0891b2]",
    "Entry Gate Scanner Issue": "bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]",
    "Technical Issue": "bg-[var(--app-muted)]/15 text-[var(--app-muted)]",
    "Profile Update": "bg-[#22C55E]/15 text-[#22C55E]",
    "General Query": "bg-[var(--app-muted)]/15 text-[var(--app-muted)]",
    Refund: "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]",
    Payment: "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]",
    Booking: "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]",
    "Seat Map": "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]",
    Settlement: "bg-[#22C55E]/15 text-[#22C55E]",
    "Ticket Scanner": "bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]",
    Technical: "bg-[var(--app-muted)]/15 text-[var(--app-muted)]",
    Other: "bg-[var(--app-muted)]/15 text-[var(--app-muted)]",
  };
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${toneByCategory[category]}`}>{category}</span>;
}

function SupportPriorityBadge({ priority }: { priority: SupportTicketPriority }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${getPriorityTone(priority)}`}>
      {priority}
    </span>
  );
}

function SupportStatusBadge({ status }: { status: SupportTicketStatus }) {
  const tone = status === "Open" ? "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]" : status === "In Progress" ? "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]" : status === "Resolved" ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-[var(--app-foreground)]/10 text-[var(--app-foreground)]";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${tone}`}>{status}</span>;
}

function SupportSourceBadge({ sourceType }: { sourceType: SupportTicket["sourceType"] }) {
  const tone = sourceType === "Organizer" ? "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]" : sourceType === "Admin" ? "bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]" : "bg-[var(--color-brand-secondary)]/15 text-[var(--color-brand-secondary)]";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${tone}`}>{sourceType}</span>;
}

function DashboardToast({ message }: { message: string }) {
  return (
    <div className="fixed right-5 top-5 z-[60]">
      {message ? (
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E] px-4 py-3 text-sm font-black text-white shadow-2xl">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function getPriorityTone(priority: SupportTicketPriority) {
  if (priority === "Critical") return "bg-[#581c87]/15 text-[#581c87]";
  if (priority === "High") return "bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)]";
  if (priority === "Medium") return "bg-[var(--color-brand-accent)]/15 text-[var(--color-brand-accent)]";
  return "bg-[#22C55E]/15 text-[#22C55E]";
}
