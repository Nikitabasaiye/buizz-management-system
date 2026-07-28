"use client";

import { Check, Eye, Plus, Save, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TicketTemplate } from "./TicketTemplate";
import {
  loadTicketThemeRequests,
  loadTicketThemes,
  saveTicketThemeRequests,
  saveTicketThemes,
} from "./ticketMockData";
import { createBlankTicketPreview } from "./ticketPreviewData";
import type { TicketThemeConfig } from "./ticketThemes";
import type { TicketLayoutType, TicketQrPosition, TicketThemeRequest } from "./ticketTypes";

export function TicketThemeManager({ mode }: { mode: "super-admin" | "admin-review" }) {
  return mode === "super-admin" ? <SuperAdminThemeManager /> : <AdminThemeReview />;
}

function SuperAdminThemeManager() {
  const [themes, setThemes] = useState<TicketThemeConfig[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadTicketThemes().then((data) => {
      setThemes(data);
      if (data.length > 0) {
        setSelectedKey(data[0].key);
      }
      setLoading(false);
    });
  }, []);

  const selected = themes.find((theme) => theme.key === selectedKey) ?? themes[0];

  const persist = (next: TicketThemeConfig[]) => {
    setThemes(next);
    saveTicketThemes(next);
    setNotice("Ticket theme settings saved locally.");
  };

  const updateSelected = <K extends keyof TicketThemeConfig>(key: K, value: TicketThemeConfig[K]) => {
    persist(themes.map((theme) => theme.key === selected.key ? { ...theme, [key]: value } : theme));
  };

  const createTheme = () => {
    const key = `customTheme${Date.now()}`;
    const next: TicketThemeConfig = {
      ...selected,
      key,
      label: "New Theme Pack",
      badgeLabel: "Custom Access",
      status: "Draft",
      enabled: false,
      isDefault: false,
    };
    persist([next, ...themes]);
    setSelectedKey(key);
  };

  const setDefault = () => {
    persist(themes.map((theme) => ({ ...theme, isDefault: theme.key === selected.key })));
  };

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Global Ticket Theme Engine</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Create, approve, disable, and govern reusable ticket theme packs.</p>
        </div>
        <button type="button" onClick={createTheme} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white"><Plus className="size-4" />Create Theme Pack</button>
      </section>

      {notice ? <p className="rounded-md bg-[#22C55E]/10 p-3 text-sm font-black text-[#22C55E]">{notice}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="grid content-start gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
          {themes.map((theme) => (
            <button key={theme.key} type="button" onClick={() => setSelectedKey(theme.key)} className={`rounded-md border p-3 text-left ${selected?.key === theme.key ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" : "border-[var(--app-border)] bg-[var(--app-subtle)]"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-black">{theme.label}</p>
                <span className="text-[10px] font-black uppercase text-[var(--app-muted)]">{theme.status}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{theme.key}</p>
            </button>
          ))}
        </aside>

        {selected ? (
          <div className="grid gap-5">
            <section className="grid gap-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 md:grid-cols-2">
              <ThemeInput label="Theme name" value={selected.label} onChange={(value) => updateSelected("label", value)} />
              <ThemeInput label="Theme key" value={selected.key} disabled onChange={() => undefined} />
              <ThemeInput label="Badge label" value={selected.badgeLabel} onChange={(value) => updateSelected("badgeLabel", value)} />
              <ThemeInput label="Category keyword mapping" value={(selected.categoryKeywords ?? []).join(", ")} onChange={(value) => updateSelected("categoryKeywords", value.split(",").map((item) => item.trim()).filter(Boolean))} />
              <ThemeSelect label="Layout type" value={selected.layoutType} options={["standard", "premium", "wallet", "boardingPass", "cinema", "table", "wristband", "qrCard", "minimal"]} onChange={(value) => updateSelected("layoutType", value as TicketLayoutType)} />
              <ThemeSelect label="QR position" value={selected.qrPosition} options={["right", "bottom", "center"]} onChange={(value) => updateSelected("qrPosition", value as TicketQrPosition)} />
              <ThemeSelect label="Status" value={selected.status ?? "Active"} options={["Active", "Disabled", "Draft"]} onChange={(value) => updateSelected("status", value as TicketThemeConfig["status"])} />
              <ThemeToggle label="Show banner" checked={selected.showBanner} onChange={(value) => updateSelected("showBanner", value)} />
              <ThemeToggle label="Allow organizer customization" checked={selected.allowedForOrganizerCustomization} onChange={(value) => updateSelected("allowedForOrganizerCustomization", value)} />
              <ThemeToggle label="Theme enabled" checked={selected.enabled !== false} onChange={(value) => updateSelected("enabled", value)} />
              <ThemeToggle label="Lock Buizz watermark" checked={Boolean(selected.watermarkText)} onChange={(value) => updateSelected("watermarkText", value ? "BUIZZ VERIFIED" : "")} />
              <ThemeToggle label="Require organizer design approval" checked onChange={() => setNotice("Organizer ticket customization approval remains required.")} />
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button type="button" onClick={setDefault} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-xs font-black"><ShieldCheck className="size-4" />Set Platform Default</button>
                <button type="button" onClick={() => setNotice("Global ticket terms saved for all generated tickets.")} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-xs font-black"><Save className="size-4" />Save Global Ticket Terms</button>
              </div>
            </section>

            <TicketTemplate ticketData={createBlankTicketPreview({
              theme: {
                adminApprovedThemeKey: selected.key,
                showAmount: true,
                showBuyerName: true,
                showOrganizerLogo: true,
              },
            })} mode="admin" showActions={false} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AdminThemeReview() {
  const [requests, setRequests] = useState<TicketThemeRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadTicketThemeRequests().then((data) => {
      setRequests(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  const selected = requests.find((request) => request.id === selectedId);
  const previewTicket = useMemo(() => selected ? createBlankTicketPreview({
    event: { id: selected.eventId, slug: selected.eventId.toLowerCase(), title: selected.eventName },
    theme: {
      organizerSelectedThemeKey: selected.requestedSettings.themeKey,
      showAmount: selected.requestedSettings.showAmount,
      showBuyerName: selected.requestedSettings.showBuyerName,
      showOrganizerLogo: selected.requestedSettings.showOrganizerLogo,
      settings: selected.requestedSettings,
    },
  }) : null, [selected]);

  const updateRequest = (status: "Approved" | "Rejected") => {
    if (!selected) return;
    const next = requests.map((request) => request.id === selected.id ? {
      ...request,
      status,
      reviewedAt: new Date().toLocaleString("en-IN"),
      rejectionReason: status === "Rejected" ? reason || "Required ticket terms or QR placement need revision." : undefined,
    } : request);
    setRequests(next);
    saveTicketThemeRequests(next);
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-5">
        <h2 className="text-2xl font-black">Organizer Ticket Theme Review</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Review requested presentation changes without modifying the global theme engine.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="grid content-start gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
          {requests.map((request: TicketThemeRequest) => (
            <button key={request.id} type="button" onClick={() => setSelectedId(request.id)} className={`rounded-md border p-3 text-left ${selectedId === request.id ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" : "border-[var(--app-border)] bg-[var(--app-subtle)]"}`}>
              <p className="font-black">{request.eventName}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{request.organizerName}</p>
              <p className="mt-2 text-[10px] font-black uppercase text-[var(--color-brand-primary)]">{request.status}</p>
            </button>
          ))}
          {!requests.length && !loading && (
            <p className="rounded-md p-3 text-sm font-semibold text-[var(--app-muted)]">No theme requests found.</p>
          )}
        </aside>

        {selected && previewTicket ? (
          <div className="grid gap-5">
            <section className="grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 sm:grid-cols-2">
              <ReviewValue label="Event" value={`${selected.eventName} / ${selected.eventId}`} />
              <ReviewValue label="Organizer" value={selected.organizerName} />
              <ReviewValue label="Old theme" value={`${selected.previousSettings.themeKey} / ${selected.previousSettings.layoutType}`} />
              <ReviewValue label="Requested theme" value={`${selected.requestedSettings.themeKey} / ${selected.requestedSettings.layoutType}`} />
              <ReviewValue label="QR placement" value={selected.requestedSettings.qrPosition} />
              <ReviewValue label="Legal terms" value="Visible in ticket footer" />
            </section>

            <TicketTemplate ticketData={previewTicket} mode="admin" showActions={false} />

            <section className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
              <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
                Rejection reason
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-sm font-semibold normal-case" />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateRequest("Approved")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#22C55E] px-4 text-sm font-black text-white"><Check className="size-4" />Approve Request</button>
                <button type="button" onClick={() => updateRequest("Rejected")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#EF4444] px-4 text-sm font-black text-white"><X className="size-4" />Reject Request</button>
                <button type="button" onClick={() => window.alert("Old and requested ticket previews are available in the review metadata and live requested preview.")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-sm font-black"><Eye className="size-4" />Compare Themes</button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThemeInput({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">{label}<input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case disabled:opacity-60" /></label>;
}

function ThemeSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function ThemeToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black">{label}<input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--color-brand-primary)]" /></label>;
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase text-[var(--app-muted)]">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
