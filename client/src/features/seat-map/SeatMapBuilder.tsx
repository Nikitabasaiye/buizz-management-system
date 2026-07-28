"use client";

import {
  CheckCircle2,
  Copy,
  FileJson,
  Layers3,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Save,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createSeatEngineLayout,
  defaultPricingZones,
  defaultTicketTemplates,
  seatEngineEvents,
  seatEngineVenues,
} from "@/features/seat-map/seat-engine-data";
import type {
  GeneralAdmissionArea,
  PricingZone,
  SeatEngineStatus,
  SeatMapLayout,
  SeatMapRole,
  SeatMapRow,
  SeatMapSeat,
  SeatMapSection,
  SeatStatus,
  VenueObject,
  VenueObjectType,
} from "@/features/seat-map/types";

type SeatEngineTab = "Designer" | "Pricing Zones" | "Customer Booking" | "Admin Operations" | "Advanced JSON";
type BuilderSelection = { type: VenueObjectType; id: string };

const storageKey = "buizz-seat-engine-layout-v1";
const seatStatuses: SeatStatus[] = ["available", "locked", "sold", "disabled"];
const tabs: SeatEngineTab[] = ["Designer", "Pricing Zones", "Customer Booking", "Admin Operations", "Advanced JSON"];

export function SeatMapBuilderPage({ role }: { role: SeatMapRole }) {
  const [activeTab, setActiveTab] = useState<SeatEngineTab>("Designer");
  const [venueId, setVenueId] = useState("venue-dy-patil");
  const [eventId, setEventId] = useState("event-sunburn-arena");
  const [layout, setLayout] = useState<SeatMapLayout>(() => createSeatEngineLayout({ role }));
  const [selectedObject, setSelectedObject] = useState<BuilderSelection>({ type: "section", id: "section-vip-a" });
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<SeatMapLayout[]>([]);
  const [future, setFuture] = useState<SeatMapLayout[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SeatMapLayout;
      setLayout(parsed);
      setVenueId(parsed.venueId ?? "venue-dy-patil");
      setEventId(parsed.eventId ?? "event-sunburn-arena");
    } catch {
      setLayout(createSeatEngineLayout({ role }));
    }
  }, [role]);

  const pricingZones = layout.pricingZones ?? defaultPricingZones;
  const selectedDetail = useMemo(() => findSelectedDetail(layout, selectedObject), [layout, selectedObject]);
  const stats = useMemo(() => getSeatStats(layout), [layout]);

  const captureHistory = () => {
    setHistory((current) => [...current.slice(-12), cloneLayout(layout)]);
    setFuture([]);
    setNotice("");
  };

  const updateLayout = (next: SeatMapLayout) => {
    setLayout(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const changeVenue = (nextVenueId: string) => {
    captureHistory();
    const next = createSeatEngineLayout({ role, venueId: nextVenueId, eventId, status: layout.status ?? "Draft" });
    updateLayout(next);
    setVenueId(nextVenueId);
    setSelectedObject({ type: "section", id: next.sections?.[0]?.id ?? "" });
  };

  const changeEvent = (nextEventId: string) => {
    captureHistory();
    updateLayout({ ...layout, eventId: nextEventId, metadata: { ...layout.metadata, updatedAt: new Date().toISOString() } });
    setEventId(nextEventId);
  };

  const saveLayout = () => {
    // TODO: save layout to backend API.
    updateLayout({ ...layout, metadata: { ...layout.metadata, updatedAt: new Date().toISOString() } });
    setNotice("Layout saved locally. Backend save API can replace this action later.");
  };

  const publishLayout = () => {
    // TODO: publish layout through backend approval API.
    captureHistory();
    updateLayout({
      ...layout,
      status: "Published",
      metadata: { ...layout.metadata, status: "published", updatedAt: new Date().toISOString() },
    });
    setNotice("Layout published locally.");
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((current) => [cloneLayout(layout), ...current]);
    setHistory((current) => current.slice(0, -1));
    updateLayout(previous);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current, cloneLayout(layout)]);
    setFuture((current) => current.slice(1));
    updateLayout(next);
  };

  const mutateLayout = (mutator: (current: SeatMapLayout) => SeatMapLayout) => {
    captureHistory();
    updateLayout(mutator(cloneLayout(layout)));
  };

  return (
    <div className="grid gap-5">
      <Panel
        title="Buizz Seat Map Builder"
        description="Create, price, preview, operate, and publish Buizz-owned venue layouts with frontend state only."
        action={
          <div className="flex flex-wrap gap-2">
            <IconButton label="Undo" onClick={undo} disabled={!history.length}><Undo2 className="size-4" /></IconButton>
            <IconButton label="Redo" onClick={redo} disabled={!future.length}><Redo2 className="size-4" /></IconButton>
            <IconButton label="Save Layout" onClick={saveLayout}><Save className="size-4" /></IconButton>
            <button type="button" onClick={publishLayout} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white">
              <CheckCircle2 className="size-4" />
              Publish Layout
            </button>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <SelectField label="Venue selector" value={venueId} onChange={changeVenue} options={seatEngineVenues.map((venue) => ({ value: venue.id, label: `${venue.name} - ${venue.city}` }))} />
          <SelectField label="Event selector" value={eventId} onChange={changeEvent} options={seatEngineEvents.map((event) => ({ value: event.id, label: `${event.name} - ${event.date}` }))} />
          <RoleSummary role={role} status={layout.status ?? "Draft"} />
        </div>

        {notice ? (
          <div className="mt-4 rounded-md border border-[#22C55E]/30 bg-[#22C55E]/10 p-3 text-sm font-black text-[#22C55E]">
            {notice}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total seats" value={stats.total} tone="#3B82F6" />
        <StatCard label="Available" value={stats.available} tone="#22C55E" />
        <StatCard label="Sold" value={stats.sold} tone="var(--color-brand-primary)" />
        <StatCard label="Locked" value={stats.locked} tone="var(--color-brand-accent)" />
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-black ${activeTab === tab ? "bg-[var(--color-brand-primary)] text-white" : "text-[var(--app-muted)] hover:bg-[var(--app-subtle)] hover:text-[var(--app-foreground)]"}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Designer" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Designer Canvas" description="Use the toolbar to add objects, then select anything on the canvas to edit its properties.">
            <BuilderToolbar
              zoom={zoom}
              onZoomIn={() => setZoom((value) => Math.min(1.4, value + 0.1))}
              onZoomOut={() => setZoom((value) => Math.max(0.7, value - 0.1))}
              onAdd={(type) => mutateLayout((current) => addVenueObject(current, type, setSelectedObject))}
            />
            <SeatMapDesignerCanvas layout={layout} zoom={zoom} selected={selectedObject} onSelect={setSelectedObject} />
          </Panel>

          <PropertiesPanel
            detail={selectedDetail}
            pricingZones={pricingZones}
            onUpdate={(updates) => mutateLayout((current) => updateSelectedObject(current, selectedObject, updates))}
            onDelete={() => mutateLayout((current) => deleteSelectedObject(current, selectedObject, setSelectedObject))}
            onDuplicate={() => mutateLayout((current) => duplicateSelectedObject(current, selectedObject, setSelectedObject))}
          />
        </div>
      ) : null}

      {activeTab === "Pricing Zones" ? (
        <PricingZoneManager
          layout={layout}
          selected={selectedObject}
          onSelect={setSelectedObject}
          onUpdate={(next) => mutateLayout(() => next)}
        />
      ) : null}

      {activeTab === "Customer Booking" ? <SeatMapCustomerBookingRenderer layout={layout} /> : null}
      {activeTab === "Admin Operations" ? <SeatMapAdminOperationsView layout={layout} onUpdate={(next) => mutateLayout(() => next)} /> : null}
      {activeTab === "Advanced JSON" ? <AdvancedJsonPreview layout={layout} /> : null}
    </div>
  );
}

function BuilderToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onAdd,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAdd: (type: VenueObjectType | "row") => void;
}) {
  const tools: { label: string; type: VenueObjectType | "row" }[] = [
    { label: "Add Section", type: "section" },
    { label: "Add Row", type: "row" },
    { label: "Add Seat", type: "seat" },
    { label: "Add Table", type: "table" },
    { label: "Add General Admission Area", type: "ga" },
    { label: "Add Stage", type: "stage" },
    { label: "Add Entry Gate", type: "gate" },
    { label: "Add Background Image/SVG placeholder", type: "background" },
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <button key={tool.label} type="button" onClick={() => onAdd(tool.type)} className="inline-flex min-h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black hover:border-[var(--color-brand-primary)]/50">
            {tool.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <IconButton label="Zoom out" onClick={onZoomOut}><Minus className="size-4" /></IconButton>
        <span className="rounded-md bg-[var(--app-elevated)] px-3 py-2 text-xs font-black">{Math.round(zoom * 100)}%</span>
        <IconButton label="Zoom in" onClick={onZoomIn}><Plus className="size-4" /></IconButton>
      </div>
    </div>
  );
}

function SeatMapDesignerCanvas({
  layout,
  zoom,
  selected,
  onSelect,
}: {
  layout: SeatMapLayout;
  zoom: number;
  selected: BuilderSelection;
  onSelect: (selection: BuilderSelection) => void;
}) {
  const pricingZones = layout.pricingZones ?? defaultPricingZones;

  return (
    <div className="overflow-auto rounded-md border border-[var(--app-border)] bg-[#070b15] p-4">
      <div className="relative h-[760px] w-[760px] origin-top-left rounded-md bg-[var(--app-foreground)]" style={{ transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 760}px` }}>
        {layout.stage ? <CanvasObject object={layout.stage} selected={selected.id === layout.stage.id} onSelect={() => onSelect({ type: "stage", id: layout.stage?.id ?? "" })} /> : null}
        {layout.gates?.map((gate) => <CanvasObject key={gate.id} object={gate} selected={selected.id === gate.id} onSelect={() => onSelect({ type: "gate", id: gate.id })} />)}
        {layout.zones?.map((zone) => <CanvasObject key={zone.id} object={zone} selected={selected.id === zone.id} onSelect={() => onSelect({ type: zone.type, id: zone.id })} />)}

        {layout.sections?.map((section) => {
          const zone = pricingZones.find((item) => item.id === section.pricingZoneId);
          return (
            <div
              key={section.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect({ type: "section", id: section.id })}
              onKeyDown={(event) => event.key === "Enter" ? onSelect({ type: "section", id: section.id }) : undefined}
              className={`absolute rounded-md border p-3 ${selected.id === section.id ? "border-white ring-2 ring-[var(--color-brand-primary)]" : "border-white/15"}`}
              style={{
                left: section.x,
                top: section.y,
                width: section.width,
                height: section.height,
                background: `${zone?.color ?? section.color}22`,
              }}
            >
              <p className="text-xs font-black text-white">{section.label}</p>
              <div className="mt-3 grid gap-2">
                {section.rows?.map((row) => (
                  <div key={row.id} className="flex gap-1">
                    {row.seats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        title={`${section.label} ${seat.label} - ${seat.status}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect({ type: "seat", id: seat.id });
                        }}
                        className={`size-4 rounded-[4px] border border-white/20 ${selected.id === seat.id ? "ring-2 ring-white" : ""}`}
                        style={{ background: seatStatusColor(seat.status, zone?.color ?? section.color) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {layout.generalAdmissionAreas?.map((area) => {
          const zone = pricingZones.find((item) => item.id === area.pricingZoneId);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => onSelect({ type: "ga", id: area.id })}
              className={`absolute rounded-md border border-dashed p-3 text-left text-white ${selected.id === area.id ? "border-white ring-2 ring-[var(--color-brand-primary)]" : "border-white/30"}`}
              style={{ left: area.x, top: area.y, width: area.width, height: area.height, background: `${zone?.color ?? area.color}33` }}
            >
              <p className="text-sm font-black">{area.name}</p>
              <p className="mt-1 text-xs font-semibold text-white/70">GA capacity {area.capacity}</p>
            </button>
          );
        })}

        {layout.tables?.map((table) => (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelect({ type: "table", id: table.id })}
            className={`absolute grid rounded-full border border-white/20 text-center text-[10px] font-black text-white ${selected.id === table.id ? "ring-2 ring-white" : ""}`}
            style={{ left: table.x, top: table.y, width: table.width, height: table.height, background: table.color }}
          >
            <span className="m-auto">{table.name.replace("Table ", "T")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CanvasObject({ object, selected, onSelect }: { object: VenueObject; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`absolute rounded-md border border-white/20 px-2 text-center text-[10px] font-black text-white ${selected ? "ring-2 ring-white" : ""}`}
      style={{ left: object.x, top: object.y, width: object.width, height: object.height, background: object.color }}
    >
      {object.name}
    </button>
  );
}

function PropertiesPanel({
  detail,
  pricingZones,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  detail: SelectedDetail | null;
  pricingZones: PricingZone[];
  onUpdate: (updates: PropertyUpdates) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  if (!detail) {
    return (
      <Panel title="Properties" description="Select a seat, section, area, or object on the canvas.">
        <div className="grid min-h-60 place-items-center rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-5 text-center">
          <div>
            <MousePointer2 className="mx-auto size-8 text-[var(--app-muted)]" />
            <p className="mt-3 text-sm font-black text-[var(--app-muted)]">No object selected</p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Properties" description="Edit selected object metadata for backend-ready layout JSON.">
      <div className="grid gap-3">
        <ReadonlyField label="Object type" value={detail.type} />
        <TextField label="Section name" value={detail.name} onChange={(value) => onUpdate({ name: value })} />
        {detail.rowName !== undefined ? <TextField label="Row name" value={detail.rowName} onChange={(value) => onUpdate({ rowName: value })} /> : null}
        {detail.seatNumber !== undefined ? <TextField label="Seat number" value={detail.seatNumber} onChange={(value) => onUpdate({ seatNumber: value })} /> : null}
        {detail.capacity !== undefined ? <NumberField label="Capacity" value={detail.capacity} onChange={(value) => onUpdate({ capacity: value })} /> : null}
        {detail.type === "Section" ? (
          <>
            <TextField label="Ticket theme key (optional)" value={detail.ticketThemeKey ?? ""} onChange={(value) => onUpdate({ ticketThemeKey: value })} />
            <TextField label="Gate name" value={detail.gateName ?? ""} onChange={(value) => onUpdate({ gateName: value })} />
            <TextField label="Entry instruction" value={detail.entryInstruction ?? ""} onChange={(value) => onUpdate({ entryInstruction: value })} />
          </>
        ) : null}
        <SelectField label="Price zone" value={detail.pricingZoneId ?? pricingZones[0]?.id ?? ""} onChange={(value) => onUpdate({ pricingZoneId: value })} options={pricingZones.map((zone) => ({ value: zone.id, label: zone.name }))} />
        <SelectField label="Status" value={detail.status ?? "available"} onChange={(value) => onUpdate({ status: value as SeatStatus })} options={seatStatuses.map((status) => ({ value: status, label: status }))} />
        <ColorField label="Color" value={detail.color ?? "var(--color-brand-primary)"} onChange={(value) => onUpdate({ color: value })} />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={onDuplicate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] text-xs font-black">
            <Copy className="size-4" />
            Duplicate
          </button>
          <button type="button" onClick={onDelete} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-brand-primary)] text-xs font-black text-white">
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      </div>
    </Panel>
  );
}

function PricingZoneManager({
  layout,
  selected,
  onSelect,
  onUpdate,
}: {
  layout: SeatMapLayout;
  selected: BuilderSelection;
  onSelect: (selection: BuilderSelection) => void;
  onUpdate: (layout: SeatMapLayout) => void;
}) {
  const [form, setForm] = useState({ name: "", color: "var(--color-brand-primary)", ticketCategory: "", price: 0 });
  const zones = layout.pricingZones ?? defaultPricingZones;

  const createZone = () => {
    if (!form.name.trim()) return;
    const nextZone: PricingZone = {
      id: `zone-${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: form.name.trim(),
      color: form.color,
      ticketCategory: form.ticketCategory.trim() || form.name.trim(),
      price: form.price,
    };
    onUpdate({ ...layout, pricingZones: [...zones, nextZone] });
    setForm({ name: "", color: "var(--color-brand-primary)", ticketCategory: "", price: 0 });
  };

  const assignZone = (zoneId: string) => {
    onUpdate(updateSelectedObject(cloneLayout(layout), selected, { pricingZoneId: zoneId }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel title="Create price zone" description="Create zone colors and placeholder prices before backend ticket categories exist.">
        <div className="grid gap-3">
          <TextField label="Zone name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <ColorField label="Color" value={form.color} onChange={(value) => setForm((current) => ({ ...current, color: value }))} />
          <TextField label="Ticket category" value={form.ticketCategory} onChange={(value) => setForm((current) => ({ ...current, ticketCategory: value }))} />
          <NumberField label="Price placeholder" value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} />
          <button type="button" onClick={createZone} disabled={!form.name.trim()} className="min-h-11 rounded-md bg-[var(--color-brand-primary)] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            Create price zone
          </button>
        </div>
      </Panel>

      <Panel title="Pricing zones" description="Assign a zone to the currently selected section or seat.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <article key={zone.id} className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <span className="block h-2 rounded-full" style={{ background: zone.color }} />
              <p className="mt-3 text-lg font-black">{zone.name}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{zone.ticketCategory}</p>
              <p className="mt-2 text-sm font-black">Rs. {zone.price.toLocaleString("en-IN")}</p>
              <button type="button" onClick={() => assignZone(zone.id)} className="mt-4 min-h-10 w-full rounded-md border border-[var(--app-border)] text-xs font-black">
                Assign zone to selection
              </button>
            </article>
          ))}
        </div>
        <div className="mt-5">
          <SeatMapDesignerCanvas layout={layout} zoom={0.82} selected={selected} onSelect={onSelect} />
        </div>
      </Panel>
    </div>
  );
}

export function SeatMapCustomerBookingRenderer({ layout }: { layout: SeatMapLayout }) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [gaQuantity, setGaQuantity] = useState(0);
  const zones = layout.pricingZones ?? defaultPricingZones;
  const seats = layout.seats ?? [];
  const selectedSeats = seats.filter((seat) => selectedSeatIds.includes(seat.id));
  const gaArea = layout.generalAdmissionAreas?.[0];
  const gaZone = zones.find((zone) => zone.id === gaArea?.pricingZoneId);
  const seatTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const gaTotal = gaQuantity * (gaZone?.price ?? 0);
  const total = seatTotal + gaTotal;

  const toggleSeat = (seat: SeatMapSeat) => {
    if (seat.status !== "available") return;
    setSelectedSeatIds((current) => current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id]);
  };

  const continueToCheckout = () => {
    // TODO: lock seat and send selected seats to checkout backend.
    window.localStorage.setItem("buizz-seat-engine-checkout-summary", JSON.stringify({ seats: selectedSeats, gaQuantity, total }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Customer seat picker" description="Customer booking renderer with selected, locked, sold, disabled, and GA quantity states.">
        <div className="grid gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 sm:grid-cols-3">
          <ReadonlyField label="Event info" value={seatEngineEvents.find((event) => event.id === layout.eventId)?.name ?? "Demo Event"} />
          <ReadonlyField label="Venue" value={layout.venueName} />
          <ReadonlyField label="Available seats" value={String(seats.filter((seat) => seat.status === "available").length)} />
        </div>
        <SeatStatusLegend />
        <div className="mt-4 overflow-auto rounded-md border border-[var(--app-border)] bg-[#070b15] p-4">
          <CustomerSeatGrid layout={layout} selectedSeatIds={selectedSeatIds} onSeatClick={toggleSeat} />
        </div>
      </Panel>

      <Panel title="Booking summary" description="Frontend-only checkout summary for backend handoff.">
        <div className="grid gap-3">
          <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">Selected seats</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSeats.length ? selectedSeats.map((seat) => (
                <button key={seat.id} type="button" onClick={() => toggleSeat(seat)} className="rounded-md bg-[var(--color-brand-primary)]/10 px-2 py-1 text-xs font-black text-[var(--color-brand-primary)]">
                  {seat.sectionName} {seat.label}
                </button>
              )) : <span className="text-sm font-semibold text-[var(--app-muted)]">No seats selected</span>}
            </div>
          </div>

          {gaArea ? (
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
              <p className="text-sm font-black">{gaArea.name}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Rs. {(gaZone?.price ?? 0).toLocaleString("en-IN")} per ticket</p>
              <div className="mt-3 flex items-center gap-2">
                <IconButton label="Decrease GA quantity" onClick={() => setGaQuantity((value) => Math.max(0, value - 1))}><Minus className="size-4" /></IconButton>
                <span className="grid min-h-10 min-w-12 place-items-center rounded-md bg-[var(--app-elevated)] text-sm font-black">{gaQuantity}</span>
                <IconButton label="Increase GA quantity" onClick={() => setGaQuantity((value) => Math.min(10, value + 1))}><Plus className="size-4" /></IconButton>
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
            <div className="flex justify-between text-sm font-semibold"><span>Seats</span><span>Rs. {seatTotal.toLocaleString("en-IN")}</span></div>
            <div className="mt-2 flex justify-between text-sm font-semibold"><span>GA tickets</span><span>Rs. {gaTotal.toLocaleString("en-IN")}</span></div>
            <div className="mt-3 flex justify-between border-t border-[var(--app-border)] pt-3 text-lg font-black"><span>Total</span><span>Rs. {total.toLocaleString("en-IN")}</span></div>
          </div>

          <button type="button" onClick={continueToCheckout} disabled={!selectedSeats.length && gaQuantity === 0} className="min-h-12 rounded-md bg-[var(--color-brand-primary)] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            Continue to Checkout
          </button>
        </div>
      </Panel>
    </div>
  );
}

function SeatMapAdminOperationsView({ layout, onUpdate }: { layout: SeatMapLayout; onUpdate: (layout: SeatMapLayout) => void }) {
  const [selectedSeatId, setSelectedSeatId] = useState(layout.seats?.[0]?.id ?? "");
  const selectedSeat = layout.seats?.find((seat) => seat.id === selectedSeatId);
  const stats = getSeatStats(layout);
  const revenueByZone = getRevenueByZone(layout);

  const changeSeatStatus = (status: SeatStatus) => {
    if (!selectedSeat) return;
    // TODO: block, release, mark sold, or confirm sale through backend seat operations API.
    onUpdate({
      ...layout,
      seats: layout.seats?.map((seat) => seat.id === selectedSeat.id ? { ...seat, status } : seat),
      sections: layout.sections?.map((section) => ({
        ...section,
        rows: section.rows?.map((row) => ({
          ...row,
          seats: row.seats.map((seat) => seat.id === selectedSeat.id ? { ...seat, status } : seat),
        })),
      })),
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Admin renderer" description="Operational view for status changes, seat blocking, releases, and revenue visibility.">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Total seats" value={stats.total} tone="#3B82F6" />
          <StatCard label="Sold seats" value={stats.sold} tone="var(--color-brand-primary)" />
          <StatCard label="Locked seats" value={stats.locked} tone="var(--color-brand-accent)" />
          <StatCard label="Available seats" value={stats.available} tone="#22C55E" />
        </div>
        <SeatStatusLegend />
        <div className="mt-4 overflow-auto rounded-md border border-[var(--app-border)] bg-[#070b15] p-4">
          <CustomerSeatGrid layout={layout} selectedSeatIds={selectedSeatId ? [selectedSeatId] : []} onSeatClick={(seat) => setSelectedSeatId(seat.id)} allowAllStatuses />
        </div>
      </Panel>

      <Panel title="Seat operations" description="Select a seat and change frontend status.">
        <div className="grid gap-3">
          <ReadonlyField label="Selected seat" value={selectedSeat ? `${selectedSeat.sectionName} ${selectedSeat.label}` : "None"} />
          <ReadonlyField label="Current status" value={selectedSeat?.status ?? "None"} />
          <button type="button" onClick={() => changeSeatStatus("locked")} className="min-h-10 rounded-md bg-[var(--color-brand-accent)] text-xs font-black text-white">Block seat</button>
          <button type="button" onClick={() => changeSeatStatus("available")} className="min-h-10 rounded-md bg-[#22C55E] text-xs font-black text-white">Release seat</button>
          <button type="button" onClick={() => changeSeatStatus("sold")} className="min-h-10 rounded-md bg-[var(--color-brand-primary)] text-xs font-black text-white">Mark as sold</button>
          <button type="button" onClick={() => changeSeatStatus("available")} className="min-h-10 rounded-md border border-[var(--app-border)] text-xs font-black">Mark as available</button>
        </div>

        <div className="mt-5 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <p className="text-xs font-black uppercase text-[var(--app-muted)]">Revenue by zone</p>
          <div className="mt-3 grid gap-2">
            {revenueByZone.map((zone) => (
              <div key={zone.name} className="flex items-center justify-between text-sm font-semibold">
                <span>{zone.name}</span>
                <span>Rs. {zone.revenue.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CustomerSeatGrid({
  layout,
  selectedSeatIds,
  onSeatClick,
  allowAllStatuses = false,
}: {
  layout: SeatMapLayout;
  selectedSeatIds: string[];
  onSeatClick: (seat: SeatMapSeat) => void;
  allowAllStatuses?: boolean;
}) {
  const zones = layout.pricingZones ?? defaultPricingZones;
  return (
    <div className="min-w-[720px]">
      {layout.stage ? <div className="mx-auto mb-8 grid h-14 w-[420px] place-items-center rounded-md bg-[var(--color-brand-primary)] text-sm font-black text-white">{layout.stage.name}</div> : null}
      <div className="grid gap-5 md:grid-cols-2">
        {layout.sections?.map((section) => {
          const zone = zones.find((item) => item.id === section.pricingZoneId);
          return (
            <div key={section.id} className="rounded-md border border-white/10 p-4" style={{ background: `${zone?.color ?? section.color}18` }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-white">{section.label}</p>
                <span className="rounded-full px-2 py-1 text-[10px] font-black text-white" style={{ background: zone?.color ?? section.color }}>{zone?.name}</span>
              </div>
              <div className="grid gap-2">
                {section.rows?.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="w-5 text-xs font-black text-white/50">{row.label}</span>
                    <div className="flex gap-1">
                      {row.seats.map((seat) => {
                        const engineSeat = seat as SeatMapSeat;
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const disabled = !allowAllStatuses && seat.status !== "available";
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSeatClick(seat)}
                            className={`size-6 rounded-[5px] border border-white/20 text-[9px] font-black text-white transition disabled:cursor-not-allowed ${isSelected ? "ring-2 ring-white" : ""}`}
                            style={{ background: isSelected ? "var(--color-brand-primary)" : seatStatusColor(seat.status, zone?.color ?? section.color) }}
                          >
                            {engineSeat.number ?? seat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdvancedJsonPreview({ layout }: { layout: SeatMapLayout }) {
  const json = {
    venueId: layout.venueId,
    venueName: layout.venueName,
    layoutId: layout.layoutId ?? layout.id,
    sections: layout.sections,
    rows: layout.rows,
    seats: layout.seats,
    generalAdmissionAreas: layout.generalAdmissionAreas,
    tables: layout.tables,
    stage: layout.stage,
    gates: layout.gates,
    zones: layout.zones,
    pricingZones: layout.pricingZones,
    status: layout.status ?? "Draft",
  };

  return (
    <Panel title="Advanced JSON" description="Generated layout JSON from frontend state, ready for backend persistence later.">
      <pre className="max-h-[680px] overflow-auto rounded-md bg-[#070b15] p-4 text-xs font-semibold leading-5 text-white">{JSON.stringify(json, null, 2)}</pre>
    </Panel>
  );
}

function RoleSummary({ role, status }: { role: SeatMapRole; status: SeatEngineStatus }) {
  const copy: Record<string, string> = {
    "super-admin": "Global templates, all venue layouts, publish control, and ticket template selection.",
    super_admin: "Global templates, all venue layouts, publish control, and ticket template selection.",
    admin: "Venue details, approval checks, admin renderer, and layout review.",
    organizer: "Create venue layouts, assign pricing zones, submit for approval, and view published layouts.",
    customer: "Customer booking preview and public seat availability.",
  };

  const roleKey = String(role);

  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">{roleKey.replace("-", " ").replace("_", " ")}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{copy[roleKey] ?? "Seat map access summary."}</p>
      <p className="mt-2 text-xs font-black">Status: {status}</p>
      {roleKey === "super-admin" || roleKey === "super_admin" ? <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">Ticket template: {defaultTicketTemplates[0].name}</p> : null}
    </div>
  );
}

function SeatStatusLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {["available", "selected", "locked", "sold", "disabled"].map((status) => (
        <span key={status} className="inline-flex min-h-8 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-xs font-black">
          <span className="size-3 rounded" style={{ background: seatStatusColor(status as SeatStatus, "#22C55E") }} />
          {status}
        </span>
      ))}
    </div>
  );
}

function Panel({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">Buizz Seat Engine</p>
          <h2 className="mt-1 text-2xl font-black">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-black text-[var(--app-foreground)] outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
      {label}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-1" />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="inline-grid min-h-10 min-w-10 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
      <span className="grid size-9 place-items-center rounded-md text-white" style={{ background: tone }}><Layers3 className="size-4" /></span>
      <p className="mt-3 text-xs font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value.toLocaleString("en-IN")}</p>
    </article>
  );
}

type SelectedDetail = {
  type: string;
  name: string;
  rowName?: string;
  seatNumber?: string;
  capacity?: number;
  pricingZoneId?: string;
  status?: string;
  color?: string;
  ticketThemeKey?: string;
  gateName?: string;
  entryInstruction?: string;
};

type PropertyUpdates = Partial<{
  name: string;
  rowName: string;
  seatNumber: string;
  capacity: number;
  pricingZoneId: string;
  status: SeatStatus;
  color: string;
  ticketThemeKey: string;
  gateName: string;
  entryInstruction: string;
}>;

function findSelectedDetail(layout: SeatMapLayout, selected: BuilderSelection): SelectedDetail | null {
  if (selected.type === "section") {
    const section = layout.sections?.find((item) => item.id === selected.id);
    return section ? {
      type: "Section",
      name: section.label,
      capacity: section.capacity,
      pricingZoneId: section.pricingZoneId,
      status: section.status,
      color: section.color,
      ticketThemeKey: section.ticketThemeKey,
      gateName: section.gateName,
      entryInstruction: section.entryInstruction,
    } : null;
  }
  if (selected.type === "seat") {
    const seat = layout.seats?.find((item) => item.id === selected.id);
    return seat ? { type: "Seat", name: seat.sectionName ?? "Seat", rowName: seat.rowName, seatNumber: seat.number ?? seat.label, pricingZoneId: seat.pricingZoneId, status: seat.status, color: seat.color } : null;
  }
  if (selected.type === "ga") {
    const area = layout.generalAdmissionAreas?.find((item) => item.id === selected.id);
    return area ? { type: "General Admission Area", name: area.name, capacity: area.capacity, pricingZoneId: area.pricingZoneId, color: area.color } : null;
  }
  const object = [...(layout.tables ?? []), ...(layout.gates ?? []), ...(layout.zones ?? []), ...(layout.stage ? [layout.stage] : [])].find((item) => item.id === selected.id);
  return object ? { type: object.type, name: object.name, capacity: object.capacity, pricingZoneId: object.pricingZoneId, status: String(object.status ?? "available"), color: object.color } : null;
}

function updateSelectedObject(layout: SeatMapLayout, selected: BuilderSelection, updates: PropertyUpdates): SeatMapLayout {
  const applySeatUpdates = (seat: SeatMapSeat): SeatMapSeat => seat.id === selected.id ? {
    ...seat,
    number: updates.seatNumber ?? seat.number,
    label: updates.seatNumber ? `${seat.rowName}${updates.seatNumber}` : seat.label,
    pricingZoneId: updates.pricingZoneId ?? seat.pricingZoneId,
    status: updates.status ?? seat.status,
    color: updates.color ?? seat.color,
  } : seat;

  if (selected.type === "seat") {
    return {
      ...layout,
      seats: layout.seats?.map(applySeatUpdates),
      sections: layout.sections?.map((section) => ({
        ...section,
        rows: section.rows?.map((row) => ({
          ...row,
          label: row.seats.some((seat) => seat.id === selected.id) ? updates.rowName ?? row.label : row.label,
          seats: row.seats.map((seat) => applySeatUpdates(updates.rowName && seat.id === selected.id ? { ...seat, rowName: updates.rowName } : seat)),
        })),
      })),
    };
  }

  if (selected.type === "section") {
    return {
      ...layout,
      sections: layout.sections?.map((section) => section.id === selected.id ? {
        ...section,
        label: updates.name ?? section.label,
        name: updates.name ?? section.name,
        capacity: updates.capacity ?? section.capacity,
        pricingZoneId: updates.pricingZoneId ?? section.pricingZoneId,
        status: updates.status ?? section.status,
        color: updates.color ?? section.color,
        ticketThemeKey: updates.ticketThemeKey ?? section.ticketThemeKey,
        gateName: updates.gateName ?? section.gateName,
        entryInstruction: updates.entryInstruction ?? section.entryInstruction,
      } : section),
    };
  }

  if (selected.type === "ga") {
    return {
      ...layout,
      generalAdmissionAreas: layout.generalAdmissionAreas?.map((area) => area.id === selected.id ? { ...area, name: updates.name ?? area.name, capacity: updates.capacity ?? area.capacity, pricingZoneId: updates.pricingZoneId ?? area.pricingZoneId, color: updates.color ?? area.color } : area),
    };
  }

  const updateObject = (object: VenueObject): VenueObject => object.id === selected.id ? { ...object, name: updates.name ?? object.name, capacity: updates.capacity ?? object.capacity, pricingZoneId: updates.pricingZoneId ?? object.pricingZoneId, status: updates.status ?? object.status, color: updates.color ?? object.color } : object;
  return {
    ...layout,
    tables: layout.tables?.map(updateObject),
    gates: layout.gates?.map(updateObject),
    zones: layout.zones?.map(updateObject),
    stage: layout.stage ? updateObject(layout.stage) : layout.stage,
  };
}

function addVenueObject(layout: SeatMapLayout, type: VenueObjectType | "row", select: (selection: BuilderSelection) => void): SeatMapLayout {
  const id = `${type}-${Date.now()}`;
  if (type === "section") {
    const section: SeatMapSection = {
      id,
      label: "New Section",
      name: "New Section",
      kind: "seated",
      color: "#3B82F6",
      pricingZoneId: "zone-premium",
      price: 3499,
      capacity: 0,
      status: "available",
      ticketThemeKey: "",
      gateName: "Main Gate",
      entryInstruction: "Keep the ticket QR ready before reaching this gate.",
      x: 238,
      y: 410,
      width: 260,
      height: 110,
      rows: [],
    };
    select({ type: "section", id });
    return { ...layout, sections: [...(layout.sections ?? []), section], floors: [{ ...(layout.floors[0] ?? { id: "floor-main", label: "Main Bowl", sections: [] }), sections: [...(layout.sections ?? []), section] }] };
  }
  if (type === "row") {
    const section = layout.sections?.[0];
    if (!section) return layout;
    const row: SeatMapRow = { id, label: "Z", sectionId: section.id, sectionName: section.label, seats: [] };
    return { ...layout, rows: [...(layout.rows ?? []), row], sections: layout.sections?.map((item) => item.id === section.id ? { ...item, rows: [...(item.rows ?? []), row] } : item) };
  }
  if (type === "seat") {
    const section = layout.sections?.[0];
    const row = section?.rows?.[0];
    if (!section || !row) return layout;
    const seat: SeatMapSeat = { id, label: `${row.label}99`, sectionId: section.id, sectionName: section.label, rowId: row.id, rowName: row.label, number: "99", pricingZoneId: section.pricingZoneId ?? "zone-vip", price: section.price, status: "available", color: section.color, x: 0, y: 0 };
    select({ type: "seat", id });
    return {
      ...layout,
      seats: [...(layout.seats ?? []), seat],
      sections: layout.sections?.map((item) => item.id === section.id ? { ...item, rows: item.rows?.map((targetRow) => targetRow.id === row.id ? { ...targetRow, seats: [...targetRow.seats, seat] } : targetRow) } : item),
    };
  }
  if (type === "ga") {
    const area: GeneralAdmissionArea = { id, name: "New General Admission Area", capacity: 200, selectedQuantity: 0, pricingZoneId: "zone-general", color: "#22C55E", x: 250, y: 520, width: 240, height: 84 };
    select({ type: "ga", id });
    return { ...layout, generalAdmissionAreas: [...(layout.generalAdmissionAreas ?? []), area] };
  }

  const object: VenueObject = { id, type, name: newObjectName(type), color: objectColor(type), x: 280, y: type === "stage" ? 30 : 620, width: type === "table" ? 58 : 130, height: type === "table" ? 58 : 48, capacity: type === "table" ? 4 : undefined, status: "available" };
  select({ type, id });
  if (type === "stage") return { ...layout, stage: object };
  if (type === "table") return { ...layout, tables: [...(layout.tables ?? []), object] };
  if (type === "gate") return { ...layout, gates: [...(layout.gates ?? []), object] };
  return { ...layout, zones: [...(layout.zones ?? []), object] };
}

function deleteSelectedObject(layout: SeatMapLayout, selected: BuilderSelection, select: (selection: BuilderSelection) => void): SeatMapLayout {
  select({ type: "section", id: layout.sections?.[0]?.id ?? "" });
  if (selected.type === "seat") {
    return {
      ...layout,
      seats: layout.seats?.filter((seat) => seat.id !== selected.id),
      sections: layout.sections?.map((section) => ({ ...section, rows: section.rows?.map((row) => ({ ...row, seats: row.seats.filter((seat) => seat.id !== selected.id) })) })),
    };
  }
  if (selected.type === "section") return { ...layout, sections: layout.sections?.filter((section) => section.id !== selected.id) };
  if (selected.type === "ga") return { ...layout, generalAdmissionAreas: layout.generalAdmissionAreas?.filter((area) => area.id !== selected.id) };
  return {
    ...layout,
    tables: layout.tables?.filter((object) => object.id !== selected.id),
    gates: layout.gates?.filter((object) => object.id !== selected.id),
    zones: layout.zones?.filter((object) => object.id !== selected.id),
    stage: layout.stage?.id === selected.id ? undefined : layout.stage,
  };
}

function duplicateSelectedObject(layout: SeatMapLayout, selected: BuilderSelection, select: (selection: BuilderSelection) => void): SeatMapLayout {
  const id = `${selected.type}-${Date.now()}`;
  if (selected.type === "section") {
    const section = layout.sections?.find((item) => item.id === selected.id);
    if (!section) return layout;
    const duplicate = { ...section, id, label: `${section.label} Copy`, x: (section.x ?? 0) + 28, y: (section.y ?? 0) + 28 };
    select({ type: "section", id });
    return { ...layout, sections: [...(layout.sections ?? []), duplicate] };
  }
  if (selected.type === "seat") return addVenueObject(layout, "seat", select);
  if (selected.type === "ga") {
    const area = layout.generalAdmissionAreas?.find((item) => item.id === selected.id);
    if (!area) return layout;
    select({ type: "ga", id });
    return { ...layout, generalAdmissionAreas: [...(layout.generalAdmissionAreas ?? []), { ...area, id, name: `${area.name} Copy`, x: area.x + 24, y: area.y + 24 }] };
  }
  const object = [...(layout.tables ?? []), ...(layout.gates ?? []), ...(layout.zones ?? []), ...(layout.stage ? [layout.stage] : [])].find((item) => item.id === selected.id);
  if (!object) return layout;
  const duplicate = { ...object, id, name: `${object.name} Copy`, x: object.x + 24, y: object.y + 24 };
  select({ type: object.type, id });
  if (object.type === "table") return { ...layout, tables: [...(layout.tables ?? []), duplicate] };
  if (object.type === "gate") return { ...layout, gates: [...(layout.gates ?? []), duplicate] };
  return { ...layout, zones: [...(layout.zones ?? []), duplicate] };
}

function getSeatStats(layout: SeatMapLayout) {
  const seats = layout.seats ?? [];
  return {
    total: seats.length,
    available: seats.filter((seat) => seat.status === "available").length,
    sold: seats.filter((seat) => seat.status === "sold").length,
    locked: seats.filter((seat) => seat.status === "locked").length,
  };
}

function getRevenueByZone(layout: SeatMapLayout) {
  const zones = layout.pricingZones ?? defaultPricingZones;
  return zones.map((zone) => ({
    name: zone.name,
    revenue: (layout.seats ?? []).filter((seat) => seat.pricingZoneId === zone.id && seat.status === "sold").reduce((sum, seat) => sum + seat.price, 0),
  }));
}

function seatStatusColor(status: SeatStatus, zoneColor: string) {
  if (status === "available") return zoneColor;
  if (status === "selected") return "var(--color-brand-primary)";
  if (status === "locked" || status === "reserved") return "var(--color-brand-accent)";
  if (status === "sold" || status === "booked") return "var(--color-brand-primary)";
  if (status === "disabled" || status === "blocked") return "var(--app-muted)";
  return zoneColor;
}

function objectColor(type: VenueObjectType) {
  if (type === "gate") return "#3B82F6";
  if (type === "stage") return "var(--color-brand-primary)";
  if (type === "table") return "var(--color-brand-accent)";
  return "var(--app-muted)";
}

function newObjectName(type: VenueObjectType) {
  if (type === "gate") return "Entry Gate";
  if (type === "stage") return "Stage";
  if (type === "table") return "Table";
  if (type === "background") return "Background Image/SVG Placeholder";
  return "Venue Object";
}

function cloneLayout(layout: SeatMapLayout) {
  return JSON.parse(JSON.stringify(layout)) as SeatMapLayout;
}
