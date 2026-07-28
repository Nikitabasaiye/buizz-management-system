"use client";

import { Clock, RotateCcw, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { getPublishedEventSeatConfig } from "@/features/seat-map/eventSeatConfigStore";
import { readSeatMapTemplates as readMasterSeatMapTemplates } from "@/features/seat-map/seatMapTemplateStore";
import {
  createSeatMapId,
  getSeatAvailabilityKey,
  readOrganizerSeatOverrides,
  readPublicSeatLocks,
  readSeatMapTemplates,
  resolveOverrideNodes,
  seatNodeToSelectedSeat,
  writePublicSeatLocks,
} from "@/features/seat-map/seatMapStorage";
import { isBookingSeatNode, isPublicSelectableSeat } from "@/features/seat-map/seatMapApi";
import type {
  OrganizerSeatMapOverride,
  PublicSeatAvailability,
  PublicSelectedSeat,
  SeatMapTemplate,
  SeatNode,
  SelectedSeatData,
} from "@/features/seat-map/seatMapTypes";
import type {
  EventSeatConfig,
  SeatMapTemplate as MasterSeatMapTemplate,
  SeatNode as MasterSeatNode,
} from "@/features/seat-map/types";

type PublicSeatMapSelectorProps = {
  eventId: string;
  venueId?: string;
  scheduleId?: string;
  templateId?: string;
  overrideId?: string;
  eventTitle?: string;
  eventImage?: string;
  venueName?: string;
  city?: string;
  dateLabel?: string;
  timeLabel?: string;
  maxSelectableSeats?: number;
  maxSeats?: number;
  selectedSeats?: SelectedSeatData[];
  onSelectionChange?: (selectedSeats: PublicSelectedSeat[]) => void;
  onChange?: (seats: SelectedSeatData[]) => void;
  onContinue?: (seats: PublicSelectedSeat[]) => void;
};

const lockMinutes = 10;

export function PublicSeatMapSelector({
  eventId,
  venueId = "primary-venue",
  scheduleId = "primary-schedule",
  templateId,
  overrideId,
  eventTitle = "Selected Event",
  eventImage,
  venueName,
  city,
  dateLabel,
  timeLabel,
  maxSelectableSeats,
  maxSeats,
  selectedSeats = [],
  onSelectionChange,
  onChange,
  onContinue,
}: PublicSeatMapSelectorProps) {
  const [templates, setTemplates] = useState<SeatMapTemplate[]>([]);
  const [overrides, setOverrides] = useState<OrganizerSeatMapOverride[]>([]);
  const [masterTemplates, setMasterTemplates] = useState<MasterSeatMapTemplate[]>([]);
  const [eventSeatConfig, setEventSeatConfig] = useState<EventSeatConfig | undefined>();
  const [selection, setSelection] = useState<PublicSelectedSeat[]>(() =>
    selectedSeats.map((seat) => ({
      ...seat,
      tierName: seat.tierName ?? "General",
      venueId: seat.venueId ?? venueId,
      scheduleId: seat.scheduleId ?? scheduleId,
    })),
  );
  const [sessionId] = useState(() => createSeatMapId("seat-session"));
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    onChangeRef.current = onChange;
  }, [onChange, onSelectionChange]);

  useEffect(() => {
    setTemplates(readSeatMapTemplates());
    setOverrides(readOrganizerSeatOverrides());
    const masters = readMasterSeatMapTemplates();
    setMasterTemplates(masters);
    setEventSeatConfig(getPublishedEventSeatConfig(eventId, templateId));
  }, [eventId, templateId]);

  useEffect(() => {
    onSelectionChangeRef.current?.(selection);
    onChangeRef.current?.(selection);
  }, [selection]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expiresAt || expiresAt.getTime() > now) return;
    setSelection([]);
    setExpiresAt(null);
    setMessage("Seat lock expired. Please select seats again.");
    writePublicSeatLocks(
      readPublicSeatLocks().filter((record) => !(record.lockedBySessionId === sessionId && record.eventId === eventId && record.venueId === venueId && record.scheduleId === scheduleId)),
    );
  }, [eventId, expiresAt, now, scheduleId, sessionId, venueId]);

  const template = templateId ? templates.find((item) => item.id === templateId) : undefined;
  const override = overrideId
    ? overrides.find((item) => item.id === overrideId)
    : overrides.find((item) => item.eventId === eventId && item.templateId === template?.id);
  const masterConfig = eventSeatConfig ?? getPublishedEventSeatConfig(eventId, templateId);
  const masterTemplate = masterConfig
    ? masterTemplates.find((item) => item.id === masterConfig.templateId) ?? readMasterSeatMapTemplates().find((item) => item.id === masterConfig.templateId)
    : undefined;
  const nodes = useMemo(() => template ? resolveOverrideNodes(template, override) : [], [override, template]);
  const bookingNodes = useMemo(() => nodes.filter(isBookingSeatNode), [nodes]);
  const displayNodes = useMemo(() => nodes.filter((node) => node.type !== "seat" && node.type !== "standing_zone"), [nodes]);
  const scopedAvailability = readPublicSeatLocks().filter((record) => record.eventId === eventId && record.venueId === venueId && record.scheduleId === scheduleId);
  const maxAllowed = maxSelectableSeats ?? maxSeats ?? 10;
  const subtotal = selection.reduce((sum, seat) => sum + seat.price, 0);
  const platformFee = 0;
  const total = subtotal;
  const countdown = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000)) : 0;
  const availableSeats = bookingNodes.filter(isPublicSelectableSeat).length;

  const toggleSeat = (node: SeatNode) => {
    if (!template) return;
    const availability = scopedAvailability.find((record) => record.seatId === node.id);
    const lockedByOther = availability?.status === "locked" && availability.lockedBySessionId !== sessionId;
    const status = availability?.status ?? node.status;
    const exists = selection.some((seat) => seat.seatId === node.id);
    const disabled =
      !override ||
      override.approvalStatus === "Rejected" ||
      !isPublicSelectableSeat({ ...node, status }) ||
      lockedByOther;

    if (disabled && !exists) {
      setMessage(lockedByOther ? "Seat already locked by another customer." : "This seat is unavailable for the selected venue and showtime.");
      return;
    }

    if (exists) {
      const next = selection.filter((seat) => seat.seatId !== node.id);
      setSelection(next);
      writePublicSeatLocks(readPublicSeatLocks().filter((record) => recordKey(record) !== getSeatAvailabilityKey(eventId, venueId, scheduleId, node.id)));
      return;
    }

    if (selection.length >= maxAllowed) {
      setMessage(`Select up to ${maxAllowed} seats per booking.`);
      return;
    }

    const seat = seatNodeToSelectedSeat(node, template, override);
    const selected: PublicSelectedSeat = {
      ...seat,
      tierName: seat.tierName ?? "General",
      venueId,
      scheduleId,
    };
    const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    const nextRecord: PublicSeatAvailability = {
      eventId,
      venueId,
      scheduleId,
      seatId: node.id,
      status: "locked",
      lockedUntil: lockUntil.toISOString(),
      lockedBySessionId: sessionId,
    };
    writePublicSeatLocks([
      ...readPublicSeatLocks().filter((record) => recordKey(record) !== getSeatAvailabilityKey(eventId, venueId, scheduleId, node.id)),
      nextRecord,
    ]);
    setExpiresAt(lockUntil);
    setSelection([...selection, selected]);
    setMessage("");
  };

  const toggleMasterSeat = (seat: MasterSeatNode, config: EventSeatConfig, master: MasterSeatMapTemplate) => {
    const availability = scopedAvailability.find((record) => record.seatId === seat.id);
    const lockedByOther = availability?.status === "locked" && availability.lockedBySessionId !== sessionId;
    const status = availability?.status ?? config.seatStatuses[seat.id] ?? seat.status;
    const channel = config.channelAllocations[seat.id] ?? seat.channel ?? "buizz_online";
    const exists = selection.some((item) => item.seatId === seat.id);
    const disabled = status !== "available" || channel !== "buizz_online" || lockedByOther;

    if (disabled && !exists) {
      setMessage(lockedByOther ? "Seat already locked by another customer." : "This seat is unavailable for online booking.");
      return;
    }

    if (exists) {
      setSelection(selection.filter((item) => item.seatId !== seat.id));
      writePublicSeatLocks(readPublicSeatLocks().filter((record) => recordKey(record) !== getSeatAvailabilityKey(eventId, venueId, scheduleId, seat.id)));
      return;
    }

    if (selection.length >= maxAllowed) {
      setMessage(`Select up to ${maxAllowed} seats per booking.`);
      return;
    }

    const tier = config.tiers.find((item) => item.id === seat.tierId) ?? master.tiers.find((item) => item.id === seat.tierId) ?? config.tiers[0] ?? master.tiers[0];
    const selected: PublicSelectedSeat = {
      seatId: seat.id,
      label: `${seat.row}-${seat.number}`,
      section: seat.section ?? seat.sectionName ?? "General",
      row: seat.row,
      seatNumber: seat.number,
      gate: seat.gate,
      tierId: tier?.id,
      tierName: tier?.name ?? "General",
      price: Number(tier?.price ?? 0),
      venueId,
      scheduleId,
    };
    const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    writePublicSeatLocks([
      ...readPublicSeatLocks().filter((record) => recordKey(record) !== getSeatAvailabilityKey(eventId, venueId, scheduleId, seat.id)),
      {
        eventId,
        venueId,
        scheduleId,
        seatId: seat.id,
        status: "locked",
        lockedUntil: lockUntil.toISOString(),
        lockedBySessionId: sessionId,
      },
    ]);
    setExpiresAt(lockUntil);
    setSelection([...selection, selected]);
    setMessage("");
  };

  const proceed = () => {
    if (!selection.length) {
      setMessage("Select at least one available seat to continue.");
      return;
    }
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      setMessage("Seat lock expired. Please select seats again.");
      return;
    }
    onContinue?.(selection);
  };

  if (masterTemplate && masterConfig) {
    const publicSeats = masterTemplate.seats.filter((seat) => {
      const status = masterConfig.seatStatuses[seat.id] ?? seat.status;
      const channel = masterConfig.channelAllocations[seat.id] ?? seat.channel ?? "buizz_online";
      return status === "available" && channel === "buizz_online";
    });
    const stage = masterTemplate.stage ?? { id: "stage-default", label: "STAGE", x: 50, y: 10, width: 24, height: 8 };
    const gates = masterTemplate.gates ?? [];

    return (
      <section className="grid min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_14px_42px_rgba(0,0,0,0.08)] sm:p-3">
          <div className="mb-3 grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <h3 className="break-words text-xl font-black">{eventTitle}</h3>
              <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{venueName ?? masterTemplate.venueName} - {city ?? masterTemplate.city}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{dateLabel || "Selected date"} - {timeLabel || "Selected time"}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MetricPill label="Total Seats" value={masterTemplate.seats.length.toLocaleString("en-IN")} />
              <MetricPill label="Available" value={publicSeats.length.toLocaleString("en-IN")} />
              <MetricPill label="Selected" value={selection.length.toLocaleString("en-IN")} />
            </div>
          </div>
          {message ? <div className="mb-3 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-sm font-bold text-[#EF4444]">{message}</div> : null}
          <div className="relative min-h-[430px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[#FBFCFE] sm:min-h-[520px]">
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="absolute grid place-items-center rounded-xl bg-[#111827] px-8 py-3 text-sm font-black text-white shadow-lg" style={{ left: `${stage.x}%`, top: `${stage.y}%`, width: `${stage.width}%`, height: `${stage.height}%`, transform: "translate(-50%, -50%)" }}>
              STAGE
            </div>
            {gates.map((gate) => (
              <div key={gate.id} className="absolute rounded-xl border border-[#16A34A] bg-[#F0FDF4] px-3 py-2 text-xs font-black text-[#15803D]" style={{ left: `${gate.x}%`, top: `${gate.y}%`, transform: "translate(-50%, -50%)" }}>
                {gate.label}
              </div>
            ))}
            {masterTemplate.seats.map((seat) => {
              const status = masterConfig.seatStatuses[seat.id] ?? seat.status;
              const channel = masterConfig.channelAllocations[seat.id] ?? seat.channel ?? "buizz_online";
              const selected = selection.some((item) => item.seatId === seat.id);
              const selectable = status === "available" && channel === "buizz_online";
              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={!selectable && !selected}
                  onClick={() => toggleMasterSeat(seat, masterConfig, masterTemplate)}
                  className={`absolute grid size-7 place-items-center rounded-full border text-[10px] font-black shadow-sm ${selected ? "border-[#EC1B72] bg-[#EC1B72] text-white" : masterSeatClass(status, channel)}`}
                  style={{ left: `${seat.x}%`, top: `${seat.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 text-xs font-bold">
            <Legend color="bg-[#22C55E]" label="Available" />
            <Legend color="bg-[#EC1B72]" label="Selected" />
            <Legend color="bg-[#9CA3AF]" label="Sold" />
          </div>
        </div>
        <aside className="hidden min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_42px_rgba(0,0,0,0.10)] xl:block xl:self-start xl:sticky xl:top-24">
          <SeatCart selection={selection} subtotal={subtotal} platformFee={platformFee} total={total} countdown={countdown} onRemove={(seatId) => setSelection(selection.filter((seat) => seat.seatId !== seatId))} onContinue={proceed} />
        </aside>
      </section>
    );
  }

  if (!templateId) {
    return <StateCard title="Please select venue first" message="This event needs a venue/date/time selection before the seat map can be loaded." />;
  }

  if (!template) {
    return <StateCard title="Seat map unavailable" message="No seat map is configured for this venue and showtime. Capacity-only booking can continue if the event allows it." />;
  }

  if (!override) {
    return <StateCard title="Seat map is not ready for booking" message="Organizer must save the event-specific seat map before this event can accept seat selection." />;
  }

  if (override.approvalStatus === "Rejected") {
    return <StateCard title="Seat map is not ready for booking" message="The event-specific seat map needs review before customers can select seats." />;
  }

  if (!bookingNodes.some(isPublicSelectableSeat)) {
    return <StateCard title="No online seats available" message="There are no Buizz Online available seats on this approved seat map. Use normal ticket quantity booking if the event supports capacity booking." />;
  }

  return (
    <section className="grid min-w-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_14px_42px_rgba(0,0,0,0.08)] sm:p-3">
        <div className="mb-3 grid gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          {eventImage ? (
            <img src={eventImage} alt={eventTitle} className="h-24 w-full rounded-2xl object-cover md:size-24" />
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-xl font-black">{eventTitle}</h3>
              <span className="rounded-lg bg-[#DCFCE7] px-3 py-1 text-xs font-black text-[#15803D]">Seat map available</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{venueName ?? template.venueName} · {city ?? template.city}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{dateLabel || "Selected date"} · {timeLabel || "Selected time"}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MetricPill label="Total Seats" value={bookingNodes.length.toLocaleString("en-IN")} />
            <MetricPill label="Available" value={availableSeats.toLocaleString("en-IN")} />
            <MetricPill label="Selected" value={selection.length.toLocaleString("en-IN")} />
          </div>
        </div>

        {message ? <div className="mb-3 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-sm font-bold text-[#EF4444]">{message}</div> : null}

        <TransformWrapper minScale={0.55} maxScale={3} wheel={{ step: 0.08 }} doubleClick={{ mode: "reset" }} pinch={{ step: 5 }}>
          {({ zoomIn, zoomOut, resetTransform, centerView, state }) => (
            <>
              <div className="mb-2 flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  <IconButton label="Zoom out" onClick={() => zoomOut(0.2)}>-</IconButton>
                  <IconButton label="Zoom in" onClick={() => zoomIn(0.2)}>+</IconButton>
                  <IconButton label="Fit section" onClick={() => centerView(0.95)}><ScanSearch className="size-4" /></IconButton>
                  <IconButton label="Reset view" onClick={() => resetTransform()}><RotateCcw className="size-4" /></IconButton>
                </div>
              </div>
              <div className="touch-pan-x touch-pan-y overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-2">
                <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                  <div
                    className="relative mx-auto w-full overflow-hidden rounded-2xl bg-[var(--app-card)]"
                    style={{ aspectRatio: template.canvasAspectRatio === "4:3" ? "4 / 3" : template.canvasAspectRatio === "1:1" ? "1 / 1" : "16 / 9" }}
                  >
                    {template.backgroundVisible !== false && (override?.customBackgroundImageUrl || template.backgroundImageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={override?.customBackgroundImageUrl || template.backgroundImageUrl} alt={`${template.venueName} blueprint`} className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: template.backgroundOpacity ?? 0.55 }} />
                    ) : null}
                    <div className="absolute inset-0 bg-white/30 dark:bg-black/20" />
                    {displayNodes.map((node) => (
                      <div
                        key={node.id}
                        className={displayNodeClass(node.type)}
                        style={{
                          left: `${node.xPercent}%`,
                          top: `${node.yPercent}%`,
                          width: node.widthPercent ? `${node.widthPercent}%` : undefined,
                          height: node.heightPercent ? `${node.heightPercent}%` : undefined,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {node.label}
                      </div>
                    ))}
                    {bookingNodes.map((node) => {
                      const selected = selection.some((seat) => seat.seatId === node.id);
                      const availability = scopedAvailability.find((record) => record.seatId === node.id);
                      const lockedByOther = availability?.status === "locked" && availability.lockedBySessionId !== sessionId;
                      const status = availability?.status ?? node.status;
                      const disabled = !isPublicSelectableSeat({ ...node, status }) || lockedByOther;
                      const labelVisible = state.scale >= 0.9 || selected;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          aria-label={`${node.label}, ${node.section}, ${status}`}
                          disabled={disabled && !selected}
                          onClick={() => toggleSeat(node)}
                          className={`absolute grid place-items-center border text-[10px] font-black shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] ${seatClass(node, status, selected, lockedByOther)}`}
                          style={{
                            left: `${node.xPercent}%`,
                            top: `${node.yPercent}%`,
                            width: node.widthPercent ? `${node.widthPercent}%` : 26,
                            height: node.heightPercent ? `${node.heightPercent}%` : 26,
                            transform: node.type === "seat" ? "translate(-50%, -50%)" : "translate(0, 0)",
                          }}
                        >
                          {labelVisible ? node.type === "seat" ? node.seatNumber ?? node.label : node.label : null}
                        </button>
                      );
                    })}
                  </div>
                </TransformComponent>
              </div>
            </>
          )}
        </TransformWrapper>

        <div className="mt-3 flex flex-wrap gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-3 text-xs font-bold">
          <Legend color="bg-[#22C55E]" label="Available" />
          <Legend color="bg-[#EC1B72]" label="Selected" />
          <Legend color="bg-[#9CA3AF]" label="Sold" />
        </div>
      </div>

      <aside className="hidden min-w-0 rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_42px_rgba(0,0,0,0.10)] xl:block xl:self-start xl:sticky xl:top-24">
        <SeatCart selection={selection} subtotal={subtotal} platformFee={platformFee} total={total} countdown={countdown} onRemove={(seatId) => setSelection(selection.filter((seat) => seat.seatId !== seatId))} onContinue={proceed} />
      </aside>

    </section>
  );
}

function SeatCart({
  selection,
  subtotal,
  platformFee,
  total,
  countdown,
  onRemove,
  onContinue,
}: {
  selection: PublicSelectedSeat[];
  subtotal: number;
  platformFee: number;
  total: number;
  countdown: number;
  onRemove: (seatId: string) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xl font-black">Your Selection</h3>
        <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--app-muted)]"><Clock className="size-4" /> {formatTimer(countdown)}</span>
      </div>
      <div className="grid gap-2">
        {selection.length ? selection.map((seat) => (
          <div key={seat.seatId} className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--app-border)] p-3">
            <div>
              <p className="text-sm font-black">{seat.section} - {seat.label}</p>
              <p className="text-xs font-semibold text-[var(--app-muted)]">{seat.tierName} - {seat.row ? `Row ${seat.row}` : "Open row"} - {seat.gate ?? "Gate pending"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">Rs. {seat.price.toLocaleString("en-IN")}</p>
              <button type="button" onClick={() => onRemove(seat.seatId)} className="text-xs font-black text-[#EF4444]">Remove</button>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-4 text-sm font-semibold text-[var(--app-muted)]">
            No seats selected yet.
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-[var(--app-border)] pt-4">
        <div className="mb-2 flex justify-between text-sm font-black">
          <span>Subtotal</span>
          <span>Rs. {subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="mb-4 flex justify-between text-lg font-black">
          <span>Total Amount</span>
          <span>Rs. {total.toLocaleString("en-IN")}</span>
        </div>
        <div className="mb-3 rounded-2xl bg-[var(--color-brand-primary)]/10 px-3 py-3 text-center text-sm font-black text-[var(--color-brand-primary)]">
          Seats held for {formatTimer(countdown)}
        </div>
        <button type="button" onClick={onContinue} className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] px-4 text-sm font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.28)]">
          Continue to Review
        </button>
        <p className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-3 text-xs font-bold leading-5 text-[var(--app-muted)]">
          Only Buizz Online available seats can be selected and booked.
        </p>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2">
      <p className="text-[10px] font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)] p-6">
      <p className="text-base font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">{message}</p>
    </div>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-10 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-card)] text-sm font-black">
      {children}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`size-3 rounded-full ${color}`} /> {label}</span>;
}

function seatClass(node: SeatNode, status: string, selected: boolean, lockedByOther: boolean) {
  if (selected) return "rounded-full border-[#EC1B72] bg-[#EC1B72] text-white";
  if (lockedByOther || status === "locked") return "rounded-full border-[#EF4444] bg-[#EF4444] text-white";
  if (status === "sold" || status === "disabled") return "rounded-full border-[#9CA3AF] bg-[#9CA3AF] text-white";
  if (status === "blocked") return "rounded-full border-[#111827] bg-[#111827] text-white";
  if (status === "reserved") return "rounded-full border-[var(--color-brand-secondary)] bg-[var(--color-brand-secondary)] text-white";
  if (node.salesChannel === "offline_counter") return "rounded-full border-[#60A5FA] bg-[#DBEAFE] text-[#1D4ED8]";
  if (String(node.salesChannel ?? "") === "external_platform") return "rounded-full border-[#F97316] bg-[#FFEDD5] text-[#C2410C]";
  if (node.salesChannel === "complimentary") return "rounded-full border-[#A855F7] bg-[#F3E8FF] text-[#7E22CE]";
  if (node.type === "standing_zone") return "rounded-md border-[#22C55E] bg-[#22C55E]/90 text-white";
  return "rounded-full border-[#22C55E] bg-[#22C55E] text-white";
}

function displayNodeClass(type: SeatNode["type"]) {
  if (type === "stage") {
    return "absolute grid min-h-10 place-items-center rounded-md bg-[#111827] px-5 text-xs font-black uppercase text-white shadow-sm";
  }

  if (type === "entry_gate" || type === "exit_gate") {
    return "absolute grid min-h-7 place-items-center rounded-md border border-[#16A34A]/30 bg-[#DCFCE7] px-2 text-[10px] font-black uppercase text-[#15803D]";
  }

  return "absolute grid min-h-6 place-items-center rounded-md bg-white/85 px-2 text-[10px] font-black uppercase text-[var(--app-foreground)] shadow-sm";
}

function masterSeatClass(status: string, channel?: string) {
  if (status === "sold") return "border-[#EF4444] bg-[#EF4444] text-white";
  if (status === "blocked" || status === "disabled" || status === "unavailable") return "border-[#6B7280] bg-[#6B7280] text-white";
  if (status === "reserved") return "border-[#0EA5A4] bg-[#0EA5A4] text-white";
  if (status === "complimentary" || channel === "complimentary") return "border-[#A855F7] bg-[#A855F7] text-white";
  if (status === "offline" || channel === "offline_counter") return "border-[#F97316] bg-[#F97316] text-white";
  if (status === "partner" || channel === "bookmyshow" || channel === "external_partner") return "border-[#3B82F6] bg-[#3B82F6] text-white";
  return "border-[#22C55E] bg-[#22C55E] text-white";
}

function recordKey(record: PublicSeatAvailability) {
  return getSeatAvailabilityKey(record.eventId ?? "", record.venueId ?? "", record.scheduleId ?? "", record.seatId);
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

// Future backend:
// POST /api/bookings/seat-locks
// GET /api/events/:eventId/venues/:venueId/schedules/:scheduleId/seats
// POST /api/bookings/confirm
// Backend must atomically confirm selected seats before payment success.
// Backend must validate availability by eventId + venueId + scheduleId + seatId inside a database transaction.
