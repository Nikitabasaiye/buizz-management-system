"use client";

import { Save, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { getOrganizerTicketThemes } from "./ticketThemes";
import { TicketTemplate } from "./TicketTemplate";
import { createBlankTicketPreview } from "./ticketPreviewData";
import type { BuizzTicketData, TicketLayoutType, TicketQrPosition, TicketThemeSettings } from "./ticketTypes";

type TicketCustomizerProps = {
  eventId: string;
  eventName?: string;
  eventCategory?: string;
  eventType?: string;
  bannerUrl?: string;
  published?: boolean;
  initialSettings?: Partial<TicketThemeSettings>;
  onSave: (settings: TicketThemeSettings) => void;
  compact?: boolean;
};

const layoutOptions: TicketLayoutType[] = ["standard", "premium", "wallet", "boardingPass", "cinema", "table", "wristband", "qrCard", "minimal"];
const qrPositions: TicketQrPosition[] = ["right", "bottom", "center"];

export function TicketCustomizer({
  eventId,
  eventName,
  eventCategory,
  eventType,
  bannerUrl,
  published = false,
  initialSettings,
  onSave,
  compact = false,
}: TicketCustomizerProps) {
  const themes = getOrganizerTicketThemes();
  const [settings, setSettings] = useState<TicketThemeSettings>({
    themeKey: initialSettings?.themeKey ?? "defaultPremium",
    layoutType: initialSettings?.layoutType ?? "premium",
    accentColor: initialSettings?.accentColor ?? "",
    showOrganizerLogo: initialSettings?.showOrganizerLogo ?? true,
    showBuyerName: initialSettings?.showBuyerName ?? true,
    showAmount: initialSettings?.showAmount ?? true,
    qrPosition: initialSettings?.qrPosition ?? "right",
    sponsorLogoUrl: initialSettings?.sponsorLogoUrl ?? "",
    tagline: initialSettings?.tagline ?? "Your Buizz access pass",
    approvalStatus: initialSettings?.approvalStatus ?? "Approved",
  });
  const [savedMessage, setSavedMessage] = useState("");

  const preview = useMemo<BuizzTicketData>(() => {
    return createBlankTicketPreview({
      event: {
        id: eventId,
        slug: eventId.toLowerCase(),
        title: eventName ?? "",
        category: eventCategory ?? "",
        eventType: eventType ?? "",
        bannerUrl: bannerUrl ?? "",
        date: "",
        startTime: "",
        endTime: "",
        venueName: "",
        venueAddress: "",
        city: "",
        state: "",
      },
      theme: {
        organizerSelectedThemeKey: settings.themeKey,
        adminApprovedThemeKey: published ? undefined : settings.themeKey,
        layoutType: settings.layoutType,
        qrPosition: settings.qrPosition,
        showAmount: settings.showAmount,
        showBuyerName: settings.showBuyerName,
        showOrganizerLogo: settings.showOrganizerLogo,
        sponsorLogoUrl: settings.sponsorLogoUrl,
        accentColor: settings.accentColor,
        settings,
      },
    });
  }, [bannerUrl, eventCategory, eventId, eventName, eventType, published, settings]);

  const update = <K extends keyof TicketThemeSettings>(key: K, value: TicketThemeSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const save = () => {
    const next = {
      ...settings,
      approvalStatus: published ? "Pending Admin Review" as const : "Approved" as const,
    };
    setSettings(next);
    onSave(next);
    setSavedMessage(published ? "Ticket design saved and sent for Admin review." : "Ticket design settings saved.");
  };

  return (
    <section className={`grid gap-5 ${compact ? "" : "lg:grid-cols-[360px_minmax(0,1fr)]"}`}>
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
        <div>
          <h3 className="text-lg font-black">Ticket Design</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">Choose an approved theme and make light event-specific changes.</p>
        </div>

        <div className="mt-5 grid gap-4">
          <CustomizerSelect label="Ticket theme" value={settings.themeKey} onChange={(value) => update("themeKey", value)} options={themes.map((theme) => ({ value: theme.key, label: theme.label }))} />
          <CustomizerSelect label="Layout type" value={settings.layoutType} onChange={(value) => update("layoutType", value as TicketLayoutType)} options={layoutOptions.map((value) => ({ value, label: value }))} />
          <CustomizerSelect label="QR position" value={settings.qrPosition} onChange={(value) => update("qrPosition", value as TicketQrPosition)} options={qrPositions.map((value) => ({ value, label: value }))} />

          <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
            Accent color optional
            <div className="flex gap-2">
              <input type="color" value={settings.accentColor || "var(--color-brand-primary)"} onChange={(event) => update("accentColor", event.target.value)} className="h-11 w-14 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-1" />
              <input value={settings.accentColor ?? ""} onChange={(event) => update("accentColor", event.target.value)} placeholder="Use Buizz default" className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case" />
            </div>
          </label>

          <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
            Ticket tagline
            <input value={settings.tagline ?? ""} onChange={(event) => update("tagline", event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case" />
          </label>

          <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
            Sponsor logo placeholder
            <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case">
              <Upload className="size-4" />
              Upload connects with backend media service
            </span>
          </label>

          <CustomizerToggle label="Show organizer logo" checked={settings.showOrganizerLogo} onChange={(value) => update("showOrganizerLogo", value)} />
          <CustomizerToggle label="Show buyer name" checked={settings.showBuyerName} onChange={(value) => update("showBuyerName", value)} />
          <CustomizerToggle label="Show amount" checked={settings.showAmount} onChange={(value) => update("showAmount", value)} />

          <button type="button" onClick={save} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-brand-primary)] px-4 text-sm font-black text-white">
            <Save className="size-4" />
            Save Ticket Design
          </button>
          {savedMessage ? <p className="rounded-md bg-[#22C55E]/10 p-3 text-xs font-black text-[#22C55E]">{savedMessage}</p> : null}
          {published ? <p className="text-xs font-semibold text-[var(--app-muted)]">Published event theme changes require Admin approval before customers see them.</p> : null}
        </div>
      </div>

      <div className="min-w-0">
        <TicketTemplate ticketData={preview} mode="organizer" showActions={false} />
      </div>
    </section>
  );
}

function CustomizerSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase text-[var(--app-muted)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)]">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function CustomizerToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-black">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--color-brand-primary)]" />
    </label>
  );
}
