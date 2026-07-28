"use client";

import { type CSSProperties, type MouseEvent, type ReactNode } from "react";

import type { SeatMapTemplate, SeatNode, SeatNodeType, SeatTicketTier } from "@/features/seat-map/seatMapTypes";
function safeSeatNodeType(type: SeatNodeType | undefined): SeatNodeType {
  return type ?? "seat";
}
export type SeatMapCanvasTool =
  | "select"
  | "pan"
  | "stage"
  | "section"
  | "row"
  | "seat"
  | "standing_zone"
  | "entry_gate"
  | "exit_gate"
  | "section_label"
  | "row_label"
  | "custom_label"
  | "delete";

export type SeatMapCanvasPoint = {
  x: number;
  y: number;
};

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function snapPercent(value: number, step = 1) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(step) || step <= 0) return clampPercent(value);

  return clampPercent(Math.round(value / step) * step);
}

function getRectFromTarget(target?: HTMLElement | DOMRect | null) {
  if (!target) return null;

  if ("getBoundingClientRect" in target) {
    return target.getBoundingClientRect();
  }

  return target;
}

export function convertClientPointToPercent(
  pointOrX: SeatMapCanvasPoint | MouseEvent<HTMLElement> | number,
  yOrTarget?: number | HTMLElement | DOMRect | null,
  maybeTarget?: HTMLElement | DOMRect | null,
): SeatMapCanvasPoint {
  let clientX = 0;
  let clientY = 0;
  let target: HTMLElement | DOMRect | null | undefined = null;

  if (typeof pointOrX === "number") {
    clientX = pointOrX;
    clientY = typeof yOrTarget === "number" ? yOrTarget : 0;
    target = maybeTarget;
  } else if ("clientX" in pointOrX && "clientY" in pointOrX) {
    clientX = pointOrX.clientX;
    clientY = pointOrX.clientY;
    target =
      typeof yOrTarget === "number"
        ? maybeTarget
        : yOrTarget ?? (pointOrX.currentTarget as HTMLElement);
  } else {
    clientX = pointOrX.x;
    clientY = pointOrX.y;
    target = typeof yOrTarget === "number" ? maybeTarget : yOrTarget;
  }

  const rect = getRectFromTarget(target);

  if (!rect || !rect.width || !rect.height) {
    return {
      x: clampPercent(clientX),
      y: clampPercent(clientY),
    };
  }

  return {
    x: clampPercent(((clientX - rect.left) / rect.width) * 100),
    y: clampPercent(((clientY - rect.top) / rect.height) * 100),
  };
}

type SeatMapCanvasProps = {
  children?: ReactNode;
  activeTool?: SeatMapCanvasTool;
  selectedTool?: SeatMapCanvasTool;
  tool?: SeatMapCanvasTool;
  className?: string;
  onCanvasClick?: (point: SeatMapCanvasPoint) => void;
  onCanvasPointer?: (point: SeatMapCanvasPoint) => void;
  onPointSelect?: (point: SeatMapCanvasPoint) => void;
  onCanvasPoint?: (xPercent: number, yPercent: number) => void;
  onSelectNode?: (nodeId: string, additive?: boolean) => void;
  onBoxSelect?: (nodeIds: string[], additive?: boolean) => void;
  onMoveSelected?: (deltaX: number, deltaY: number) => void;
  onResizeNode?: (nodeId: string, updates: Partial<SeatNode>) => void;
  onDeleteNode?: (nodeId: string) => void;
  backgroundImage?: string;
  backgroundUrl?: string;
  backgroundOpacity?: number;
  backgroundVisible?: boolean;
  backgroundLocked?: boolean;
  template?: SeatMapTemplate;
  nodes?: SeatNode[];
  tiers?: SeatTicketTier[];
  selectedIds?: string[];
  canEdit?: boolean;
  grid?: {
    showGrid?: boolean;
    snapToGrid?: boolean;
    gridSizePercent?: number;
  };
  [key: string]: unknown;
};

export function SeatMapCanvas({
  children,
  activeTool,
  selectedTool,
  tool: toolProp,
  className = "",
  onCanvasClick,
  onCanvasPointer,
  onPointSelect,
  onCanvasPoint,
  onSelectNode,
  onBoxSelect: _onBoxSelect,
  onMoveSelected: _onMoveSelected,
  onResizeNode: _onResizeNode,
  onDeleteNode,
  backgroundImage,
  backgroundUrl,
  backgroundOpacity,
  backgroundVisible = true,
  backgroundLocked: _backgroundLocked,
  template,
  nodes = [],
  tiers = [],
  selectedIds = [],
  canEdit: _canEdit,
  grid,
  ...props
}: SeatMapCanvasProps) {
  const tool = toolProp ?? activeTool ?? selectedTool ?? "select";
  const visibleNodes = nodes.filter((node) => isAllowedSeatNodeType(safeSeatNodeType(node.type)));

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const point = convertClientPointToPercent(event, event.currentTarget);

    onCanvasClick?.(point);
    onCanvasPointer?.(point);
    onPointSelect?.(point);
    onCanvasPoint?.(point.x, point.y);
  };

  return (
    <div
      {...props}
      role="application"
      aria-label="Seat map canvas"
      data-seat-map-tool={tool}
      data-seat-map-canvas="true"
      onClick={handleClick}
      className={[
        "relative min-h-[360px] w-full min-w-0 overflow-auto rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-subtle)]",
        "sm:min-h-[460px] lg:min-h-[560px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundImage: backgroundVisible && (backgroundImage || backgroundUrl) ? `url(${backgroundImage || backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: backgroundVisible ? undefined : 1,
      }}
    >
      {backgroundVisible && (backgroundImage || backgroundUrl) ? (
        <div className="pointer-events-none absolute inset-0 bg-[var(--app-elevated)]" style={{ opacity: 1 - Math.min(1, Math.max(0, backgroundOpacity ?? template?.backgroundOpacity ?? 0.55)) }} />
      ) : null}

      <div className={`pointer-events-none absolute inset-0 ${grid?.showGrid === false ? "hidden" : "opacity-60"}`}>
        <div
          className="size-full"
          style={{
            backgroundImage:
              "linear-gradient(var(--app-border) 1px, transparent 1px), linear-gradient(90deg, var(--app-border) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 min-h-[360px] w-full min-w-0 p-4 sm:min-h-[460px] lg:min-h-[560px]">
        {children ?? (visibleNodes.length ? (
          <div className="relative mx-auto h-[560px] w-full max-w-full overflow-hidden rounded-[1rem] bg-white/70 shadow-inner">
            {visibleNodes.map((node) => {
              const selected = selectedIds.includes(node.id);
              const tier = tiers.find((item) => item.id === node.tierId);
              const style: CSSProperties = {
                left: `${node.xPercent}%`,
                top: `${node.yPercent}%`,
                width: node.widthPercent ? `${node.widthPercent}%` : undefined,
                height: node.heightPercent ? `${node.heightPercent}%` : undefined,
                transform: `translate(-50%, -50%) rotate(${node.rotation ?? 0}deg)`,
              };

              if (node.type === "seat") {
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (tool === "delete") {
                        onDeleteNode?.(node.id);
                        return;
                      }
                      onSelectNode?.(node.id, event.shiftKey || event.metaKey || event.ctrlKey);
                    }}
                    className={`absolute grid size-7 place-items-center rounded-md border text-[10px] font-black shadow-sm transition ${selected ? "z-20 border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]" : "border-white/70"} ${seatNodeClass(node.status, node.salesChannel)}`}
                    style={style}
                    title={`${node.section} ${node.label}`}
                  >
                    {node.seatNumber ?? node.label}
                  </button>
                );
              }

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (tool === "delete") {
                      onDeleteNode?.(node.id);
                      return;
                    }
                    onSelectNode?.(node.id, event.shiftKey || event.metaKey || event.ctrlKey);
                  }}
                  className={`absolute grid place-items-center text-center text-[10px] font-black uppercase shadow-sm transition ${selected ? "z-20 ring-2 ring-[var(--color-brand-primary)]" : ""} ${objectNodeClass(safeSeatNodeType(node.type))}`}
                  style={style}
                  title={node.label}
                >
                  {node.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid h-full min-h-[320px] place-items-center rounded-[1.25rem] border border-dashed border-[var(--app-border)] bg-[var(--app-elevated)]/80 p-6 text-center">
            <div className="max-w-sm">
              <p className="text-sm font-black text-[var(--app-foreground)]">
                Seat map canvas ready
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                Use the builder tools to add stage, sections, rows, seats,
                standing zones, gates, and booking labels.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function isAllowedSeatNodeType(type: SeatNodeType) {
  return (
    type === "seat" ||
    type === "standing_zone" ||
    type === "stage" ||
    type === "entry_gate" ||
    type === "exit_gate" ||
    type === "section_label" ||
    type === "row_label" ||
    type === "custom_label"
  );
}

function seatNodeClass(status: SeatNode["status"], salesChannel: SeatNode["salesChannel"]) {
  const channel = String(salesChannel ?? "");
  if (channel === "offline_counter" || channel === "offline") return "bg-[#DBEAFE] text-[#1D4ED8]";
  if (channel === "external_platform" || channel === "external_partner" || channel === "bookmyshow") return "bg-[#FFEDD5] text-[#C2410C]";
  if (channel === "complimentary") return "bg-[#F3E8FF] text-[#7E22CE]";
  if (status === "blocked") return "bg-[#111827] text-white";
  if (status === "reserved") return "bg-[var(--color-brand-secondary)] text-white";
  if (status === "sold" || status === "disabled") return "bg-[#E5E7EB] text-[#6B7280]";
  if (status === "locked") return "bg-[#FEE2E2] text-[#DC2626]";
  return "bg-[#BBF7D0] text-[#15803D]";
}

function objectNodeClass(type: SeatNodeType) {
  if (type === "stage") return "min-h-12 rounded-md bg-[#111827] px-6 text-white";
  if (type === "standing_zone") return "min-h-16 rounded-md border border-[#22C55E] bg-[#DCFCE7] px-4 text-[#15803D]";
  if (type === "entry_gate" || type === "exit_gate") return "min-h-8 rounded-md border border-[#16A34A]/30 bg-[#DCFCE7] px-3 text-[#15803D]";
  return "min-h-7 rounded-md border border-[var(--app-border)] bg-white/90 px-3 text-[var(--app-foreground)]";
}
