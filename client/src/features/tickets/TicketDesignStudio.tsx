"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, Copy, GripVertical, Printer, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createOrganizerTicketDesign,
  deleteOrganizerTicketDesign,
  getOrganizerTicketDesigns,
  submitTicketDesignForReview,
  updateOrganizerTicketDesign,
} from "./ticketApi";
import { TicketTemplate } from "./TicketTemplate";
import { createBlankTicketPreview } from "./ticketPreviewData";
import { getOrganizerTicketThemes } from "./ticketThemes";
import { defaultTicketSectionOrder } from "./ticketTypes";
import type {
  BuizzTicketData,
  TicketDesignDraft,
  TicketDesignElement,
  TicketDesignElementType,
  TicketMode,
  TicketSectionKey,
} from "./ticketTypes";

type StudioRole = "organizer" | "admin" | "super-admin";
type PreviewMode = "desktop" | "mobile" | "print";

const defaultElements: TicketDesignElement[] = [
  element("hero", "Hero"),
  element("bookingInfo", "Booking Info", true),
  element("qr", "QR", true),
  element("seatTable", "Seat Table", true),
  element("amount", "Amount", true),
  element("note", "Note"),
  element("actions", "Actions"),
];

function element(type: TicketDesignElementType, label: string, locked = false): TicketDesignElement {
  return { id: type, type, label, locked, visible: true };
}

export function createDefaultTicketDesignDraft(name = "Untitled Ticket Design"): TicketDesignDraft {
  const now = new Date().toISOString();
  return {
    id: `DESIGN-${Date.now()}`,
    name,
    status: "Draft",
    themeKey: "defaultPremium",
    settings: {
      themeKey: "defaultPremium",
      layoutType: "premium",
      showOrganizerLogo: true,
      showBuyerName: true,
      showAmount: true,
      showActions: true,
      qrPosition: "right",
      tagline: "Your Buizz access pass",
      primaryColor: "#EC1B72",
      secondaryColor: "#7C2BD9",
      backgroundColor: "#08000B",
      textColor: "#FFFFFF",
      borderColor: "#EC1B72",
      templateShape: "stub-cutout",
      sectionOrder: defaultTicketSectionOrder,
      termsNote: "Please show this ticket at venue entry. This is a single entry ticket for all selected seats.",
      cornerRadius: 32,
      borderStyle: "solid",
      updatedByRole: "system",
      updatedAt: now,
      approvalStatus: "Approved",
    },
    layout: {
      elements: defaultElements,
      desktopColumns: 2,
      mobileStacked: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function TicketDesignStudio({
  role,
  initialDraft,
  ticketData = createBlankTicketPreview(),
  canCustomize,
  onChange,
  onDelete,
}: {
  role: StudioRole;
  initialDraft?: TicketDesignDraft;
  ticketData?: BuizzTicketData;
  canCustomize?: boolean;
  onChange?: (draft: TicketDesignDraft) => void;
  onDelete?: (draftId: string) => void;
}) {
  const [draft, setDraft] = useState<TicketDesignDraft>(() => initialDraft ?? createDefaultTicketDesignDraft());
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [notice, setNotice] = useState("");
  const [savedDrafts, setSavedDrafts] = useState<TicketDesignDraft[]>([]);
  const themes = getOrganizerTicketThemes();
  const editable = canCustomize ?? role !== "admin";
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let active = true;
    void getOrganizerTicketDesigns().then((items) => {
      if (active) setSavedDrafts(items);
    });
    return () => { active = false; };
  }, []);

  const previewData = useMemo<BuizzTicketData>(() => ({
    ...ticketData,
    theme: {
      ...ticketData.theme,
      organizerSelectedThemeKey: draft.themeKey,
      adminApprovedThemeKey: role === "super-admin" || draft.status === "Approved" ? draft.themeKey : ticketData.theme.adminApprovedThemeKey,
      layoutType: draft.settings.layoutType,
      qrPosition: draft.settings.qrPosition,
      showAmount: draft.settings.showAmount,
      showBuyerName: draft.settings.showBuyerName,
      showOrganizerLogo: draft.settings.showOrganizerLogo,
      sponsorLogoUrl: draft.settings.sponsorLogoUrl,
      badgeText: draft.settings.tagline,
      accentColor: draft.settings.accentColor,
      settings: normalizeDraftSettings(draft),
    },
  }), [draft, role, ticketData]);

  const mutate = (updater: (current: TicketDesignDraft) => TicketDesignDraft) => {
    setDraft((current) => {
      const next = { ...updater(current), updatedAt: new Date().toISOString() };
      onChange?.(next);
      return next;
    });
    setNotice("");
  };

  const canToggleElement = (item: TicketDesignElement) => editable && (role === "super-admin" || !item.locked);
  const canReorderElement = () => editable;

  const moveElement = (elementId: string, direction: -1 | 1) => {
    if (!canReorderElement()) return;
    mutate((current) => {
      const elements = current.layout.elements;
      const sourceIndex = elements.findIndex((item) => item.id === elementId);
      const source = elements[sourceIndex];

      if (!source) return current;

      const targetIndex = sourceIndex + direction;
      if (targetIndex < 0 || targetIndex >= elements.length) return current;
      const nextElements = reorderElements(elements, sourceIndex, targetIndex);

      return {
        ...current,
        settings: {
          ...current.settings,
          sectionOrder: toSectionOrder(nextElements),
          updatedByRole: role,
        },
        layout: {
          ...current.layout,
          elements: nextElements,
        },
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!editable || !event.over || event.active.id === event.over.id) return;

    mutate((current) => {
      const oldIndex = current.layout.elements.findIndex((item) => item.id === event.active.id);
      const newIndex = current.layout.elements.findIndex((item) => item.id === event.over?.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      const nextElements = arrayMove(current.layout.elements, oldIndex, newIndex);

      return {
        ...current,
        settings: {
          ...current.settings,
          sectionOrder: toSectionOrder(nextElements),
          updatedByRole: role,
        },
        layout: { ...current.layout, elements: nextElements },
      };
    });
  };

  const reset = () => {
    if (!editable) return;
    mutate((current) => ({
      ...current,
      settings: {
        ...current.settings,
        sectionOrder: defaultTicketSectionOrder,
        updatedByRole: role,
      },
      layout: { ...current.layout, elements: defaultElements },
    }));
    setNotice("Layout reset to the Buizz default.");
  };

  const save = async () => {
    if (!editable) return;
    const saved = initialDraft
      ? await updateOrganizerTicketDesign(draft.id, draft)
      : await createOrganizerTicketDesign(draft);
    if (saved) {
      setDraft(saved);
      setSavedDrafts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    }
    setNotice("Ticket design draft saved.");
  };

  const submit = async () => {
    if (!editable) return;
    await createOrganizerTicketDesign(draft);
    const saved = await submitTicketDesignForReview(draft.id);
    if (saved) setDraft(saved);
    setNotice("Ticket design submitted for Admin review.");
  };

  const duplicate = async () => {
    if (!editable) return;
    const copy = {
      ...draft,
      id: `DESIGN-${Date.now()}`,
      name: `${draft.name} Copy`,
      status: "Draft" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createOrganizerTicketDesign(copy);
    setDraft(copy);
    setSavedDrafts((current) => [copy, ...current.filter((item) => item.id !== copy.id)]);
    onChange?.(copy);
    setNotice("Ticket design duplicated.");
  };

  const remove = async () => {
    if (!editable) return;
    await deleteOrganizerTicketDesign(draft.id);
    setSavedDrafts((current) => current.filter((item) => item.id !== draft.id));
    onDelete?.(draft.id);
    setDraft(createDefaultTicketDesignDraft());
    setNotice("Ticket design deleted.");
  };

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <input value={draft.name} disabled={!editable} onChange={(event) => mutate((current) => ({ ...current, name: event.target.value }))} className="min-h-11 w-full max-w-md rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-lg font-black disabled:opacity-70" />
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{role} editor / {draft.status}{!editable ? " / read-only" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudioButton label="Reset" icon={<RotateCcw className="size-4" />} onClick={reset} disabled={!editable} />
          <StudioButton label="Save Draft" icon={<Save className="size-4" />} onClick={() => void save()} disabled={!editable} />
          <StudioButton label="Duplicate" icon={<Copy className="size-4" />} onClick={() => void duplicate()} disabled={!editable} />
          {role === "organizer" ? <StudioButton label="Submit for Approval" icon={<Send className="size-4" />} onClick={() => void submit()} primary disabled={!editable} /> : null}
          <StudioButton label="Delete Draft" icon={<Trash2 className="size-4" />} onClick={() => void remove()} disabled={!editable} />
        </div>
      </div>

      {!editable ? (
        <p className="rounded-md border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 p-3 text-sm font-black text-[var(--color-brand-primary)]">
          Read-only access. Super Admin permission is required to customize ticket design.
        </p>
      ) : null}

      {notice ? <p className="rounded-md bg-[#22C55E]/10 p-3 text-sm font-black text-[#22C55E]">{notice}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
          <div className="mb-4 grid gap-3 border-b border-[var(--app-border)] pb-4">
            <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
              Saved designs
              <select
                disabled={!editable}
                value={savedDrafts.some((item) => item.id === draft.id) ? draft.id : ""}
                onChange={(event) => {
                  const selected = savedDrafts.find((item) => item.id === event.target.value);
                  if (selected) setDraft(selected);
                }}
                className="min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] disabled:opacity-70"
              >
                <option value="">Current unsaved draft</option>
                {savedDrafts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <button type="button" disabled={!editable} onClick={() => setDraft(createDefaultTicketDesignDraft())} className="min-h-10 rounded-md border border-[var(--app-border)] text-xs font-black disabled:opacity-60">
              New Ticket Design
            </button>
            <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
              Theme
              <select disabled={!editable} value={draft.themeKey} onChange={(event) => mutate((current) => ({ ...current, themeKey: event.target.value, settings: { ...current.settings, themeKey: event.target.value } }))} className="min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] disabled:opacity-70">
                {themes.map((theme) => <option key={theme.key} value={theme.key}>{theme.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
              Template shape
              <select disabled={!editable} value={draft.settings.templateShape ?? "stub-cutout"} onChange={(event) => mutate((current) => ({ ...current, settings: { ...current.settings, templateShape: event.target.value as TicketDesignDraft["settings"]["templateShape"] } }))} className="min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] disabled:opacity-70">
                {["stub-cutout", "premium-pass", "classic-card"].map((layout) => <option key={layout}>{layout}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
              Organizer logo
              <button type="button" disabled={!editable} onClick={() => mutate((current) => ({ ...current, settings: { ...current.settings, showOrganizerLogo: !current.settings.showOrganizerLogo } }))} className="min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-left text-sm font-semibold normal-case text-[var(--app-foreground)] disabled:opacity-70">
                {draft.settings.showOrganizerLogo ? "Visible" : "Hidden"}
              </button>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Primary" value={draft.settings.primaryColor ?? "#EC1B72"} disabled={!editable} onChange={(value) => mutate((current) => ({ ...current, settings: { ...current.settings, primaryColor: value, borderColor: value } }))} />
              <ColorField label="Secondary" value={draft.settings.secondaryColor ?? "#7C2BD9"} disabled={!editable} onChange={(value) => mutate((current) => ({ ...current, settings: { ...current.settings, secondaryColor: value } }))} />
              <ColorField label="Background" value={draft.settings.backgroundColor ?? "#08000B"} disabled={!editable} onChange={(value) => mutate((current) => ({ ...current, settings: { ...current.settings, backgroundColor: value } }))} />
              <ColorField label="Text" value={draft.settings.textColor ?? "#FFFFFF"} disabled={!editable} onChange={(value) => mutate((current) => ({ ...current, settings: { ...current.settings, textColor: value } }))} />
            </div>
            <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
              Hero image URL
              <input disabled={!editable} value={draft.settings.heroImage ?? ""} onChange={(event) => mutate((current) => ({ ...current, settings: { ...current.settings, heroImage: event.target.value } }))} placeholder="Use event image by default" className="min-h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-sm font-semibold normal-case text-[var(--app-foreground)] disabled:opacity-70" />
            </label>
            <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
              Terms note
              <textarea disabled={!editable || role === "organizer"} value={draft.settings.termsNote ?? ""} onChange={(event) => mutate((current) => ({ ...current, settings: { ...current.settings, termsNote: event.target.value } }))} className="min-h-20 resize-none rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-semibold normal-case text-[var(--app-foreground)] disabled:opacity-70" />
            </label>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-black">Ticket Elements</p>
            <span className="text-[10px] font-black uppercase text-[var(--app-muted)]">Up / Down reorder</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.layout.elements.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-2">
                {draft.layout.elements.map((item, index) => (
                  <SortableSectionRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={draft.layout.elements.length}
                    editable={editable}
                    canToggle={canToggleElement(item)}
                    role={role}
                    onMove={moveElement}
                    onToggle={() => mutate((current) => ({ ...current, layout: { ...current.layout, elements: current.layout.elements.map((elementItem) => elementItem.id === item.id ? { ...elementItem, visible: !elementItem.visible } : elementItem) } }))}
                    onLockToggle={() => mutate((current) => ({ ...current, layout: { ...current.layout, elements: current.layout.elements.map((elementItem) => elementItem.id === item.id ? { ...elementItem, locked: !elementItem.locked } : elementItem) } }))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            {(["desktop", "mobile", "print"] as PreviewMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => setPreviewMode(mode)} className={`rounded-md px-3 py-2 text-xs font-black capitalize ${previewMode === mode ? "bg-[var(--color-brand-primary)] text-white" : "border border-[var(--app-border)] bg-[var(--app-elevated)]"}`}>
                {mode === "print" ? <Printer className="mr-2 inline size-3.5" /> : null}{mode} Preview
              </button>
            ))}
          </div>
          <div className={`${previewMode === "mobile" ? "mx-auto max-w-[430px]" : ""} ${previewMode === "print" ? "bg-white p-5 text-black" : ""}`}>
            <TicketTemplate ticketData={previewData} mode={previewMode === "print" ? "print" : role as TicketMode} showActions={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ColorField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-[10px] font-black uppercase text-[var(--app-muted)]">
      {label}
      <input type="color" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-1 disabled:opacity-70" />
    </label>
  );
}

function SortableSectionRow({
  item,
  index,
  total,
  editable,
  canToggle,
  role,
  onMove,
  onToggle,
  onLockToggle,
}: {
  item: TicketDesignElement;
  index: number;
  total: number;
  editable: boolean;
  canToggle: boolean;
  role: StudioRole;
  onMove: (elementId: string, direction: -1 | 1) => void;
  onToggle: () => void;
  onLockToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editable });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const canMoveUp = editable && index > 0;
  const canMoveDown = editable && index < total - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-ticket-design-element-id={item.id}
      className={`flex min-h-11 items-center gap-2 rounded-md border px-3 ${item.visible ? "border-[var(--app-border)] bg-[var(--app-subtle)]" : "border-dashed border-[var(--app-border)] opacity-55"} ${isDragging ? "z-10 shadow-2xl" : ""}`}
    >
      <button type="button" disabled={!editable} className={`grid size-7 place-items-center rounded ${editable ? "cursor-grab active:cursor-grabbing" : "opacity-30"}`} aria-label={`Drag ${item.label}`} {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-black">{item.label}</span>
      <div className="inline-flex rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-0.5">
        <button type="button" disabled={!canMoveUp} onClick={() => onMove(item.id, -1)} className="grid size-7 place-items-center rounded text-[var(--app-muted)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] disabled:opacity-35" aria-label={`Move ${item.label} up`} title="Move up">
          <ChevronUp className="size-4" />
        </button>
        <button type="button" disabled={!canMoveDown} onClick={() => onMove(item.id, 1)} className="grid size-7 place-items-center rounded text-[var(--app-muted)] transition hover:bg-[var(--app-subtle)] hover:text-[var(--color-brand-primary)] disabled:opacity-35" aria-label={`Move ${item.label} down`} title="Move down">
          <ChevronDown className="size-4" />
        </button>
      </div>
      <button type="button" disabled={!canToggle} onClick={onToggle} className="text-[10px] font-black uppercase text-[var(--color-brand-primary)] disabled:text-[var(--app-muted)]">
        {item.locked ? "Locked" : item.visible ? "Hide" : "Show"}
      </button>
      {role === "super-admin" ? (
        <button type="button" disabled={!editable} onClick={onLockToggle} className="text-[10px] font-black uppercase disabled:opacity-40">
          {item.locked ? "Unlock" : "Lock"}
        </button>
      ) : null}
    </div>
  );
}

function StudioButton({ label, icon, onClick, primary = false, disabled = false }: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-55 ${primary ? "bg-[var(--color-brand-primary)] text-white" : "border border-[var(--app-border)] bg-[var(--app-subtle)]"}`}>{icon}{label}</button>;
}

function reorderElements<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);

  if (!moved) return items;

  next.splice(toIndex, 0, moved);
  return next;
}

function toSectionOrder(elements: TicketDesignElement[]): TicketSectionKey[] {
  const allowed = new Set<TicketSectionKey>(defaultTicketSectionOrder);
  const ordered = elements
    .map((item) => item.type)
    .filter((type): type is TicketSectionKey => allowed.has(type as TicketSectionKey));

  return [...ordered, ...defaultTicketSectionOrder.filter((section) => !ordered.includes(section))];
}

function normalizeDraftSettings(draft: TicketDesignDraft) {
  const now = draft.updatedAt || new Date().toISOString();
  return {
    ...draft.settings,
    showActions: draft.settings.showActions ?? true,
    primaryColor: draft.settings.primaryColor ?? "#EC1B72",
    secondaryColor: draft.settings.secondaryColor ?? "#7C2BD9",
    backgroundColor: draft.settings.backgroundColor ?? "#08000B",
    textColor: draft.settings.textColor ?? "#FFFFFF",
    borderColor: draft.settings.borderColor ?? draft.settings.primaryColor ?? "#EC1B72",
    templateShape: draft.settings.templateShape ?? "stub-cutout",
    sectionOrder: draft.settings.sectionOrder ?? toSectionOrder(draft.layout.elements),
    termsNote: draft.settings.termsNote ?? "Please show this ticket at venue entry. This is a single entry ticket for all selected seats.",
    cornerRadius: draft.settings.cornerRadius ?? 32,
    borderStyle: draft.settings.borderStyle ?? "solid",
    updatedByRole: draft.settings.updatedByRole ?? "system",
    updatedAt: draft.settings.updatedAt ?? now,
  };
}
