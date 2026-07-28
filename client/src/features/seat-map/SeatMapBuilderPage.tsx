// "use client";

// import {
//   Archive,
//   CheckCircle2,
//   ChevronDown,
//   Copy,
//   Download,
//   Edit3,
//   Eye,
//   FileJson,
//   Grid3X3,
//   Hand,
//   HelpCircle,
//   ImageIcon,
//   Layers3,
//   MapPin,
//   Maximize2,
//   MessageCircle,
//   MousePointer2,
//   Move,
//   Plus,
//   Redo2,
//   RotateCcw,
//   Save,
//   ShieldCheck,
//   Square,
//   Ticket,
//   Trash2,
//   Undo2,
//   Upload,
//   Users,
//   X,
//   ZoomIn,
//   ZoomOut,
// } from "lucide-react";
// import {
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
//   type ChangeEvent,
//   type ReactNode,
//   type PointerEvent as ReactPointerEvent,
// } from "react";
// import {
//   createSupportTicketId,
//   getAutoSupportPriority,
//   getSupportTickets,
//   getSupportTimestamp,
//   saveSupportTickets,
//   type SupportTicket,
// } from "@/lib/supportTickets";

// type BuilderRole = "super-admin" | "super_admin" | "admin" | "organizer" | "customer";
// type MasterRole = "super-admin" | "admin";
// type SeatTool =
//   | "select"
//   | "pan"
//   | "seat"
//   | "row"
//   | "section"
//   | "standing"
//   | "stage"
//   | "entry"
//   | "exit"
//   | "label"
//   | "delete";
// type InspectorTab = "properties" | "sections" | "tiers" | "templates" | "setup";
// export type SeatStatus =
//   | "available"
//   | "blocked"
//   | "reserved"
//   | "sold"
//   | "disabled"
//   | "hold"
//   | "vip"
//   | "staff";
// export type SeatSalesChannel = "online" | "offline" | "reserved" | "complimentary" | "none";
// export type VenueType = "auditorium" | "concert" | "stadium" | "theatre" | "club" | "banquet" | "outdoor" | "custom";
// type TemplateStatus = "draft" | "active" | "inactive" | "archived";
// type SectionType = "seated" | "standing" | "vip" | "box" | "balcony";
// type CanvasObjectType = "stage" | "entry" | "exit" | "label" | "standing" | "section-box";
// type RowShape = "straight" | "arc" | "curve-left" | "curve-right";

// export type SeatTier = {
//   id: string;
//   name: string;
//   color: string;
//   price: number;
//   priceLabel: string;
//   channel: SeatSalesChannel;
//   description: string;
//   active: boolean;
// };

// export type SeatSection = {
//   id: string;
//   name: string;
//   type: SectionType;
//   color: string;
//   tierId: string;
//   capacity: number;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   rotation: number;
//   locked: boolean;
// };

// export type SeatNode = {
//   id: string;
//   label: string;
//   sectionId: string;
//   sectionName: string;
//   row: string;
//   number: string;
//   x: number;
//   y: number;
//   radius: number;
//   status: SeatStatus;
//   channel: SeatSalesChannel;
//   tierId: string;
//   rotation: number;
//   isAccessible: boolean;
//   isCompanion: boolean;
//   notes: string;
// };

// type CanvasObject = {
//   id: string;
//   type: CanvasObjectType;
//   label: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   rotation: number;
//   color: string;
//   text?: string;
//   capacity?: number;
//   tierId?: string;
//   locked?: boolean;
// };

// type SeatMapCanvasState = {
//   width: number;
//   height: number;
//   gridSize: number;
//   snapToGrid: boolean;
//   showGrid: boolean;
//   zoom: number;
//   panX: number;
//   panY: number;
// };

// export type SeatMapTemplate = {
//   id: string;
//   venueName: string;
//   venueCode: string;
//   city: string;
//   address: string;
//   venueType: VenueType;
//   status: TemplateStatus;
//   version: number;
//   totalCapacity: number;
//   allowOrganizerStructureEdits: boolean;
//   isDefaultForOrganizers: boolean;
//   sections: SeatSection[];
//   tiers: SeatTier[];
//   seats: SeatNode[];
//   objects: CanvasObject[];
//   canvas: SeatMapCanvasState;
//   createdAt: string;
//   updatedAt: string;
//   createdByRole: MasterRole;
//   updatedByRole: MasterRole;
//   publishedAt?: string;
//   publishedBy?: string;
// };

// export type SeatMapEventOverride = {
//   id: string;
//   templateId: string;
//   eventId: string;
//   eventName: string;
//   organizerId: string;
//   statusOverrides: Record<string, SeatStatus>;
//   channelOverrides: Record<string, SeatSalesChannel>;
//   tierOverrides: Record<string, string>;
//   notes: Record<string, string>;
//   updatedAt: string;
// };

// export type SeatMapCounts = {
//   total: number;
//   available: number;
//   online: number;
//   offline: number;
//   reserved: number;
//   blocked: number;
//   sold: number;
//   disabled: number;
//   hold: number;
//   vip: number;
//   staff: number;
// };

// type DragState =
//   | null
//   | {
//     kind: "seat" | "object" | "box" | "pan" | "resize-object";
//     id?: string;
//     startX: number;
//     startY: number;
//     startClientX: number;
//     startClientY: number;
//     startPanX?: number;
//     startPanY?: number;
//     originalSeats?: SeatNode[];
//     originalObjects?: CanvasObject[];
//     box?: { x1: number; y1: number; x2: number; y2: number };
//   };

// type SetupMode = "edit" | "scratch";
// type OrganizerSeatPlan = "use-approved" | "not-needed" | "request-design";

// const seatMapStorageKey = "buizz-seat-map-templates-v4-real-editor";
// const selectedSeatMapStorageKey = "buizz-seat-map-selected-template-v4";
// const organizerOverrideStorageKey = "buizz-seat-map-organizer-overrides-v4";
// const dateSeed = "2026-06-28T09:00:00.000Z";

// const statusOptions: SeatStatus[] = ["available", "blocked", "reserved", "sold", "disabled", "hold", "vip", "staff"];
// const channelOptions: SeatSalesChannel[] = ["online", "offline", "reserved", "complimentary", "none"];
// const venueTypes: VenueType[] = ["auditorium", "concert", "stadium", "theatre", "club", "banquet", "outdoor", "custom"];
// const inspectorTabs: Array<{ id: InspectorTab; label: string }> = [
//   { id: "properties", label: "Properties" },
//   { id: "sections", label: "Sections" },
//   { id: "tiers", label: "Tiers" },
//   { id: "templates", label: "Templates" },
//   { id: "setup", label: "Venue Setup" },
// ];

// const toolItems: Array<{ id: SeatTool; label: string; help: string; icon: ReactNode }> = [
//   { id: "select", label: "Select", help: "Select, drag, box-select", icon: <MousePointer2 className="size-4" /> },
//   { id: "pan", label: "Pan", help: "Move around large layouts", icon: <Hand className="size-4" /> },
//   { id: "seat", label: "Seat", help: "Drop or click one seat", icon: <Ticket className="size-4" /> },
//   { id: "row", label: "Row", help: "Generate row from point", icon: <Grid3X3 className="size-4" /> },
//   { id: "section", label: "Section", help: "Add seating section", icon: <Layers3 className="size-4" /> },
//   { id: "standing", label: "Standing", help: "Add GA standing zone", icon: <Users className="size-4" /> },
//   { id: "stage", label: "Stage", help: "Place stage marker", icon: <Square className="size-4" /> },
//   { id: "entry", label: "Entry", help: "Gate label", icon: <Move className="size-4" /> },
//   { id: "exit", label: "Exit", help: "Exit marker", icon: <X className="size-4" /> },
//   { id: "label", label: "Label", help: "Instruction label", icon: <Edit3 className="size-4" /> },
//   { id: "delete", label: "Delete", help: "Click object to remove", icon: <Trash2 className="size-4" /> },
// ];

// export function SeatMapBuilderPage({ role }: { role: BuilderRole }) {
//   const normalizedRole = role === "super_admin" ? "super-admin" : role;

//   if (normalizedRole === "organizer") {
//     return (
//       <OrganizerSeatMapPersonalizationPanel
//         eventId="event-live-in-concert"
//         eventName="Live in Concert"
//         organizerId="organizer-demo"
//         mode="page"
//       />
//     );
//   }

//   return <MasterSeatMapEditor role={normalizedRole === "super-admin" ? "super-admin" : "admin"} />;
// }

// function MasterSeatMapEditor({ role }: { role: MasterRole }) {
//   const [templates, setTemplates] = useState<SeatMapTemplate[]>([]);
//   const [selectedId, setSelectedId] = useState("");
//   const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
//   const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
//   const [tool, setTool] = useState<SeatTool>("select");
//   const [tab, setTab] = useState<InspectorTab>("properties");
//   const [message, setMessage] = useState("Venue setup is ready. Choose Edit Existing or Create from Scratch.");
//   const [previewMode, setPreviewMode] = useState(false);
//   const [setupOpen, setSetupOpen] = useState(true);
//   const [setupMode, setSetupMode] = useState<SetupMode>("edit");
//   const [rowForm, setRowForm] = useState({
//     sectionId: "section-vip",
//     row: "A",
//     shape: "straight" as RowShape,
//     startNo: 1,
//     endNo: 12,
//     direction: "left-to-right",
//     startX: 35,
//     startY: 34,
//     spacing: 4.2,
//     rowAngle: 0,
//     arcDepth: 0,
//     tierId: "tier-vip",
//     status: "available" as SeatStatus,
//     channel: "online" as SeatSalesChannel,
//   });
//   const [history, setHistory] = useState<SeatMapTemplate[]>([]);
//   const [future, setFuture] = useState<SeatMapTemplate[]>([]);
//   const [drag, setDrag] = useState<DragState>(null);
//   const [spaceDown, setSpaceDown] = useState(false);
//   const canvasRef = useRef<HTMLDivElement | null>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   useEffect(() => {
//     const loaded = readSeatMapTemplates();
//     const selected = readSelectedTemplateId() || loaded.find((template) => template.status === "active")?.id || loaded[0]?.id || "";
//     setTemplates(loaded);
//     setSelectedId(selected);
//   }, []);

//   const selectedTemplate = useMemo(() => {
//     return templates.find((template) => template.id === selectedId) || templates[0] || createAuditoriumSeedTemplate(role);
//   }, [role, selectedId, templates]);

//   const selectedSeats = selectedTemplate.seats.filter((seat) => selectedSeatIds.includes(seat.id));
//   const selectedObjects = selectedTemplate.objects.filter((object) => selectedObjectIds.includes(object.id));
//   const selectedSections = selectedTemplate.sections.filter((section) => selectedSeats.some((seat) => seat.sectionId === section.id));
//   const counts = getTemplateCounts(selectedTemplate);
//   const rowsCount = new Set(selectedTemplate.seats.map((seat) => `${seat.sectionId}-${seat.row}`)).size;
//   const canEditStructure = role === "super-admin" || selectedTemplate.status !== "active";

//   const setupFormTemplate = selectedTemplate;

//   useEffect(() => {
//     saveSelectedTemplateId(selectedTemplate.id);
//   }, [selectedTemplate.id]);

//   useEffect(() => {
//     const onKeyDown = (event: KeyboardEvent) => {
//       if (event.code === "Space") setSpaceDown(true);
//       if ((event.key === "Delete" || event.key === "Backspace") && (selectedSeatIds.length || selectedObjectIds.length)) {
//         event.preventDefault();
//         deleteSelected();
//       }
//       if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
//         event.preventDefault();
//         saveDraft();
//       }
//       if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
//         event.preventDefault();
//         undo();
//       }
//       if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z")) {
//         event.preventDefault();
//         redo();
//       }
//       if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
//         event.preventDefault();
//         duplicateSelected();
//       }
//       if (event.key === "Escape") {
//         setSelectedSeatIds([]);
//         setSelectedObjectIds([]);
//         setTool("select");
//       }
//     };
//     const onKeyUp = (event: KeyboardEvent) => {
//       if (event.code === "Space") setSpaceDown(false);
//     };
//     window.addEventListener("keydown", onKeyDown);
//     window.addEventListener("keyup", onKeyUp);
//     return () => {
//       window.removeEventListener("keydown", onKeyDown);
//       window.removeEventListener("keyup", onKeyUp);
//     };
//   }, [history, future, selectedObjectIds, selectedSeatIds, selectedTemplate, templates]);

//   function syncTemplates(nextTemplates: SeatMapTemplate[], nextSelectedId = selectedTemplate.id) {
//     setTemplates(nextTemplates);
//     setSelectedId(nextSelectedId);
//     writeSeatMapTemplates(nextTemplates);
//   }

//   function commit(nextTemplate: SeatMapTemplate, notice?: string) {
//     const normalized = normalizeTemplate({
//       ...nextTemplate,
//       updatedAt: new Date().toISOString(),
//       updatedByRole: role,
//     });
//     setHistory((current) => [selectedTemplate, ...current].slice(0, 50));
//     setFuture([]);
//     syncTemplates([normalized, ...templates.filter((template) => template.id !== normalized.id)], normalized.id);
//     if (notice) setMessage(notice);
//   }

//   function patchTemplate(patch: Partial<SeatMapTemplate>, notice?: string) {
//     commit({ ...selectedTemplate, ...patch }, notice);
//   }

//   function updateCanvas(patch: Partial<SeatMapCanvasState>) {
//     commit({ ...selectedTemplate, canvas: { ...selectedTemplate.canvas, ...patch } });
//   }

//   function undo() {
//     const previous = history[0];
//     if (!previous) {
//       setMessage("Nothing to undo.");
//       return;
//     }
//     setFuture((current) => [selectedTemplate, ...current].slice(0, 50));
//     setHistory((current) => current.slice(1));
//     syncTemplates([previous, ...templates.filter((template) => template.id !== previous.id)], previous.id);
//     setMessage("Undo applied.");
//   }

//   function redo() {
//     const next = future[0];
//     if (!next) {
//       setMessage("Nothing to redo.");
//       return;
//     }
//     setHistory((current) => [selectedTemplate, ...current].slice(0, 50));
//     setFuture((current) => current.slice(1));
//     syncTemplates([next, ...templates.filter((template) => template.id !== next.id)], next.id);
//     setMessage("Redo applied.");
//   }

//   function saveDraft() {
//     const draft = { ...selectedTemplate, status: selectedTemplate.status === "archived" ? "draft" : selectedTemplate.status, updatedAt: new Date().toISOString(), updatedByRole: role };
//     syncTemplates([draft, ...templates.filter((template) => template.id !== draft.id)], draft.id);
//     setMessage("Draft saved. This template will stay as default source for organizer copies once published.");
//   }

//   function publishTemplate() {
//     const issues = validateTemplate(selectedTemplate);
//     if (issues.length) {
//       setMessage(issues[0]);
//       return;
//     }
//     const published: SeatMapTemplate = {
//       ...selectedTemplate,
//       status: "active",
//       isDefaultForOrganizers: true,
//       publishedAt: new Date().toISOString(),
//       publishedBy: role,
//       updatedAt: new Date().toISOString(),
//       updatedByRole: role,
//     };
//     const next = templates.map((template) => ({ ...template, isDefaultForOrganizers: template.id === published.id }));
//     syncTemplates([published, ...next.filter((template) => template.id !== published.id)], published.id);
//     setMessage("Published as organizer default master map. Organizers will edit only event-specific seat usage/availability.");
//   }

//   function createFromScratch() {
//     const scratch = createScratchTemplate(role, setupFormTemplate);
//     syncTemplates([scratch, ...templates], scratch.id);
//     setSelectedSeatIds([]);
//     setSelectedObjectIds([]);
//     setTool("select");
//     setSetupMode("scratch");
//     setSetupOpen(false);
//     setMessage("Blank canvas created. Add stage, sections, rows, seats, labels, and gates.");
//   }

//   function loadAuditoriumStarter() {
//     const starter = createAuditoriumSeedTemplate(role);
//     const readyTemplate = normalizeTemplate({
//       ...starter,
//       id: createId("venue-template"),
//       venueName: selectedTemplate.venueName.trim() || starter.venueName,
//       venueCode: selectedTemplate.venueCode.trim() || starter.venueCode,
//       city: selectedTemplate.city.trim() || starter.city,
//       address: selectedTemplate.address.trim() || starter.address,
//       venueType: selectedTemplate.venueType || starter.venueType,
//       status: "draft",
//       version: Math.max(1, selectedTemplate.version + 1),
//       isDefaultForOrganizers: false,
//       allowOrganizerStructureEdits: selectedTemplate.allowOrganizerStructureEdits,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       createdByRole: role,
//       updatedByRole: role,
//       publishedAt: undefined,
//       publishedBy: undefined,
//     });

//     syncTemplates([readyTemplate, ...templates], readyTemplate.id);
//     setSelectedSeatIds([]);
//     setSelectedObjectIds([]);
//     setTool("select");
//     setSetupOpen(false);
//     setMessage("Ready auditorium starter loaded. You can now edit sections, rows, colors, gates, and seat allocation.");
//   }

//   function duplicateTemplate(template = selectedTemplate) {
//     const copy: SeatMapTemplate = {
//       ...template,
//       id: createId("venue-template"),
//       venueName: `${template.venueName} Copy`,
//       venueCode: `${template.venueCode}-COPY`,
//       status: "draft",
//       version: template.version + 1,
//       isDefaultForOrganizers: false,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       createdByRole: role,
//       updatedByRole: role,
//       publishedAt: undefined,
//       publishedBy: undefined,
//     };
//     syncTemplates([copy, ...templates], copy.id);
//     setMessage("Template duplicated for editing.");
//   }

//   function archiveTemplate(template = selectedTemplate) {
//     const archived = { ...template, status: "archived" as TemplateStatus, isDefaultForOrganizers: false, updatedAt: new Date().toISOString() };
//     syncTemplates([archived, ...templates.filter((item) => item.id !== template.id)], archived.id);
//     setMessage("Template archived.");
//   }

//   function addSeatAt(x: number, y: number) {
//     const section = selectedTemplate.sections.find((item) => item.id === rowForm.sectionId) || selectedTemplate.sections[0] || createDefaultSection();
//     const tier = selectedTemplate.tiers.find((item) => item.id === rowForm.tierId) || selectedTemplate.tiers[0] || createDefaultTier();
//     const seat: SeatNode = {
//       id: createId("seat"),
//       label: `${rowForm.row}${selectedTemplate.seats.length + 1}`,
//       sectionId: section.id,
//       sectionName: section.name,
//       row: rowForm.row,
//       number: String(selectedTemplate.seats.filter((item) => item.row === rowForm.row && item.sectionId === section.id).length + 1),
//       x: maybeSnap(x, selectedTemplate.canvas),
//       y: maybeSnap(y, selectedTemplate.canvas),
//       radius: 1.45,
//       status: rowForm.status,
//       channel: rowForm.channel,
//       tierId: tier.id,
//       rotation: 0,
//       isAccessible: false,
//       isCompanion: false,
//       notes: "",
//     };
//     commit({ ...selectedTemplate, seats: [...selectedTemplate.seats, seat] }, "Seat added.");
//     setSelectedSeatIds([seat.id]);
//     setSelectedObjectIds([]);
//   }

//   function generateRowAt(x = rowForm.startX, y = rowForm.startY) {
//     const section = selectedTemplate.sections.find((item) => item.id === rowForm.sectionId) || selectedTemplate.sections[0] || createDefaultSection();
//     const tier = selectedTemplate.tiers.find((item) => item.id === rowForm.tierId) || selectedTemplate.tiers[0] || createDefaultTier();
//     const seats = buildRowSeats({
//       section,
//       row: rowForm.row,
//       startNo: Number(rowForm.startNo),
//       endNo: Number(rowForm.endNo),
//       startX: x,
//       startY: y,
//       spacing: Number(rowForm.spacing),
//       rowAngle: Number(rowForm.rowAngle),
//       arcDepth: Number(rowForm.arcDepth),
//       shape: rowForm.shape,
//       tier,
//       status: rowForm.status,
//       channel: rowForm.channel,
//       reverse: rowForm.direction === "right-to-left",
//     });
//     commit({ ...selectedTemplate, seats: mergeSeats(selectedTemplate.seats, seats) }, "Row generated. Seats are now draggable and editable.");
//     setSelectedSeatIds(seats.map((seat) => seat.id));
//     setSelectedObjectIds([]);
//   }

//   function addCanvasObject(type: CanvasObjectType, x: number, y: number) {
//     const object: CanvasObject = {
//       id: createId(type),
//       type,
//       label: objectLabel(type, selectedTemplate.objects),
//       x: maybeSnap(x, selectedTemplate.canvas),
//       y: maybeSnap(y, selectedTemplate.canvas),
//       width: type === "stage" ? 18 : type === "section-box" ? 24 : type === "standing" ? 20 : type === "label" ? 18 : 9,
//       height: type === "stage" ? 7 : type === "section-box" ? 14 : type === "standing" ? 14 : type === "label" ? 7 : 5,
//       rotation: 0,
//       color: type === "stage" ? "#111827" : type === "standing" ? "#F59E0B" : type === "section-box" ? "#E879F9" : type === "exit" ? "#F97316" : "#22C55E",
//       text: type === "label" ? "Booking instruction label" : undefined,
//       capacity: type === "standing" ? 100 : undefined,
//       tierId: selectedTemplate.tiers[0]?.id,
//       locked: false,
//     };
//     commit({ ...selectedTemplate, objects: [...selectedTemplate.objects, object] }, `${object.label} added.`);
//     setSelectedObjectIds([object.id]);
//     setSelectedSeatIds([]);
//   }

//   function addSectionAt(x: number, y: number) {
//     const tier = selectedTemplate.tiers.find((item) => item.id === rowForm.tierId) || selectedTemplate.tiers[0] || createDefaultTier();
//     const section: SeatSection = {
//       id: createId("section"),
//       name: `Section ${selectedTemplate.sections.length + 1}`,
//       type: "seated",
//       color: tier.color,
//       tierId: tier.id,
//       capacity: 0,
//       x: maybeSnap(x, selectedTemplate.canvas),
//       y: maybeSnap(y, selectedTemplate.canvas),
//       width: 24,
//       height: 16,
//       rotation: 0,
//       locked: false,
//     };
//     const object: CanvasObject = {
//       id: createId("section-box"),
//       type: "section-box",
//       label: section.name,
//       x: section.x,
//       y: section.y,
//       width: section.width,
//       height: section.height,
//       rotation: 0,
//       color: section.color,
//       tierId: tier.id,
//     };
//     commit({ ...selectedTemplate, sections: [...selectedTemplate.sections, section], objects: [...selectedTemplate.objects, object] }, "Section added. Now add rows/seats inside it.");
//     setRowForm((current) => ({ ...current, sectionId: section.id, tierId: tier.id }));
//     setSelectedObjectIds([object.id]);
//   }

//   function deleteSelected() {
//     if (!selectedSeatIds.length && !selectedObjectIds.length) {
//       setMessage("Select seats or objects before deleting.");
//       return;
//     }
//     commit(
//       {
//         ...selectedTemplate,
//         seats: selectedTemplate.seats.filter((seat) => !selectedSeatIds.includes(seat.id)),
//         objects: selectedTemplate.objects.filter((object) => !selectedObjectIds.includes(object.id)),
//       },
//       "Selected items deleted.",
//     );
//     setSelectedSeatIds([]);
//     setSelectedObjectIds([]);
//     setTool("select");
//   }

//   function duplicateSelected() {
//     const seats = selectedTemplate.seats.filter((seat) => selectedSeatIds.includes(seat.id));
//     const objects = selectedTemplate.objects.filter((object) => selectedObjectIds.includes(object.id));
//     const copiedSeats = seats.map((seat) => ({ ...seat, id: createId("seat"), label: `${seat.label} copy`, x: clamp(seat.x + 2, 2, 98), y: clamp(seat.y + 2, 2, 98), number: `${seat.number}C` }));
//     const copiedObjects = objects.map((object) => ({ ...object, id: createId(object.type), label: `${object.label} Copy`, x: clamp(object.x + 2, 2, 98), y: clamp(object.y + 2, 2, 98) }));
//     if (!copiedSeats.length && !copiedObjects.length) {
//       setMessage("Select seats or objects before duplicating.");
//       return;
//     }
//     commit({ ...selectedTemplate, seats: [...selectedTemplate.seats, ...copiedSeats], objects: [...selectedTemplate.objects, ...copiedObjects] }, "Selected items duplicated.");
//     setSelectedSeatIds(copiedSeats.map((seat) => seat.id));
//     setSelectedObjectIds(copiedObjects.map((object) => object.id));
//   }

//   function bulkPatchSeats(patch: Partial<SeatNode>) {
//     if (!selectedSeatIds.length) {
//       setMessage("Select seats first.");
//       return;
//     }
//     commit(
//       {
//         ...selectedTemplate,
//         seats: selectedTemplate.seats.map((seat) => (selectedSeatIds.includes(seat.id) ? { ...seat, ...patch } : seat)),
//       },
//       `${selectedSeatIds.length} selected seats updated.`,
//     );
//   }

//   function updateSection(sectionId: string, patch: Partial<SeatSection>) {
//     commit({
//       ...selectedTemplate,
//       sections: selectedTemplate.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
//       seats: patch.name
//         ? selectedTemplate.seats.map((seat) => (seat.sectionId === sectionId ? { ...seat, sectionName: String(patch.name) } : seat))
//         : selectedTemplate.seats,
//     });
//   }

//   function addTier() {
//     const tier: SeatTier = {
//       id: createId("tier"),
//       name: `Tier ${selectedTemplate.tiers.length + 1}`,
//       color: "#EC1B72",
//       price: 999,
//       priceLabel: "₹999",
//       channel: "online",
//       description: "New pricing tier",
//       active: true,
//     };
//     commit({ ...selectedTemplate, tiers: [...selectedTemplate.tiers, tier] }, "Tier added.");
//   }

//   function updateTier(tierId: string, patch: Partial<SeatTier>) {
//     commit({ ...selectedTemplate, tiers: selectedTemplate.tiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)) });
//   }

//   function deleteTier(tierId: string) {
//     if (selectedTemplate.seats.some((seat) => seat.tierId === tierId)) {
//       setMessage("This tier is assigned to seats. Reassign those seats before deleting.");
//       return;
//     }
//     commit({ ...selectedTemplate, tiers: selectedTemplate.tiers.filter((tier) => tier.id !== tierId) }, "Tier deleted.");
//   }

//   function exportJson() {
//     const blob = new Blob([JSON.stringify(selectedTemplate, null, 2)], { type: "application/json" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `${selectedTemplate.venueName.replace(/\s+/g, "-").toLowerCase()}-seat-map.json`;
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     URL.revokeObjectURL(url);
//     setMessage("Seat map JSON exported.");
//   }

//   function importJson(event: ChangeEvent<HTMLInputElement>) {
//     const file = event.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       try {
//         const parsed = JSON.parse(String(reader.result)) as SeatMapTemplate;
//         const imported = normalizeTemplate({ ...parsed, id: createId("venue-template"), status: "draft", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), createdByRole: role, updatedByRole: role });
//         syncTemplates([imported, ...templates], imported.id);
//         setMessage("Seat map JSON imported as draft.");
//       } catch {
//         setMessage("Could not import JSON. Please check the file format.");
//       }
//     };
//     reader.readAsText(file);
//     event.target.value = "";
//   }

//   function updateSetupTemplate(patch: Partial<SeatMapTemplate>) {
//     const next = { ...selectedTemplate, ...patch, updatedAt: new Date().toISOString() };
//     syncTemplates([next, ...templates.filter((template) => template.id !== next.id)], next.id);
//   }

//   function pointerToPercent(event: ReactPointerEvent<HTMLDivElement>) {
//     const rect = canvasRef.current?.getBoundingClientRect();
//     if (!rect) return { x: 0, y: 0 };
//     const zoom = selectedTemplate.canvas.zoom;
//     const rawX = event.clientX - rect.left - selectedTemplate.canvas.panX;
//     const rawY = event.clientY - rect.top - selectedTemplate.canvas.panY;
//     return {
//       x: clamp((rawX / zoom / rect.width) * 100, 0, 100),
//       y: clamp((rawY / zoom / rect.height) * 100, 0, 100),
//     };
//   }

//   function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
//     const point = pointerToPercent(event);
//     if (previewMode) return;
//     if (spaceDown || tool === "pan") {
//       setDrag({ kind: "pan", startX: point.x, startY: point.y, startClientX: event.clientX, startClientY: event.clientY, startPanX: selectedTemplate.canvas.panX, startPanY: selectedTemplate.canvas.panY });
//       event.currentTarget.setPointerCapture(event.pointerId);
//       return;
//     }
//     if (tool === "seat") {
//       addSeatAt(point.x, point.y);
//       return;
//     }
//     if (tool === "row") {
//       generateRowAt(point.x, point.y);
//       return;
//     }
//     if (tool === "section") {
//       addSectionAt(point.x, point.y);
//       return;
//     }
//     if (tool === "standing") {
//       addCanvasObject("standing", point.x, point.y);
//       return;
//     }
//     if (tool === "stage") {
//       addCanvasObject("stage", point.x, point.y);
//       return;
//     }
//     if (tool === "entry" || tool === "exit" || tool === "label") {
//       addCanvasObject(tool === "entry" ? "entry" : tool === "exit" ? "exit" : "label", point.x, point.y);
//       return;
//     }
//     if (tool === "delete") {
//       setMessage("Delete tool is active. Click a seat/object or use Delete selected after selecting items.");
//       return;
//     }
//     setSelectedSeatIds([]);
//     setSelectedObjectIds([]);
//     setDrag({ kind: "box", startX: point.x, startY: point.y, startClientX: event.clientX, startClientY: event.clientY, box: { x1: point.x, y1: point.y, x2: point.x, y2: point.y } });
//     event.currentTarget.setPointerCapture(event.pointerId);
//   }

//   function handleSeatPointerDown(event: ReactPointerEvent<HTMLButtonElement>, seatId: string) {
//     event.stopPropagation();
//     if (previewMode) return;
//     if (tool === "delete") {
//       commit({ ...selectedTemplate, seats: selectedTemplate.seats.filter((seat) => seat.id !== seatId) }, "Seat deleted.");
//       setTool("select");
//       return;
//     }
//     const additive = event.shiftKey || event.metaKey || event.ctrlKey;
//     setSelectedSeatIds((current) => (additive ? toggle(current, seatId) : current.includes(seatId) ? current : [seatId]));
//     setSelectedObjectIds([]);
//     const point = pointerToPercent(event as unknown as ReactPointerEvent<HTMLDivElement>);
//     const selectedSet = selectedSeatIds.includes(seatId) ? selectedSeatIds : [seatId];
//     setDrag({
//       kind: "seat",
//       id: seatId,
//       startX: point.x,
//       startY: point.y,
//       startClientX: event.clientX,
//       startClientY: event.clientY,
//       originalSeats: selectedTemplate.seats.filter((seat) => selectedSet.includes(seat.id)),
//     });
//     event.currentTarget.setPointerCapture(event.pointerId);
//   }

//   function handleObjectPointerDown(event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>, objectId: string) {
//     event.stopPropagation();
//     if (previewMode) return;
//     if (tool === "delete") {
//       commit({ ...selectedTemplate, objects: selectedTemplate.objects.filter((object) => object.id !== objectId) }, "Object deleted.");
//       setTool("select");
//       return;
//     }
//     const additive = event.shiftKey || event.metaKey || event.ctrlKey;
//     setSelectedObjectIds((current) => (additive ? toggle(current, objectId) : current.includes(objectId) ? current : [objectId]));
//     setSelectedSeatIds([]);
//     const point = pointerToPercent(event as unknown as ReactPointerEvent<HTMLDivElement>);
//     setDrag({
//       kind: "object",
//       id: objectId,
//       startX: point.x,
//       startY: point.y,
//       startClientX: event.clientX,
//       startClientY: event.clientY,
//       originalObjects: selectedTemplate.objects.filter((object) => object.id === objectId),
//     });
//     event.currentTarget.setPointerCapture(event.pointerId);
//   }

//   function handleResizeObjectPointerDown(event: ReactPointerEvent<HTMLSpanElement>, objectId: string) {
//     event.stopPropagation();
//     const point = pointerToPercent(event as unknown as ReactPointerEvent<HTMLDivElement>);
//     setDrag({
//       kind: "resize-object",
//       id: objectId,
//       startX: point.x,
//       startY: point.y,
//       startClientX: event.clientX,
//       startClientY: event.clientY,
//       originalObjects: selectedTemplate.objects.filter((object) => object.id === objectId),
//     });
//     event.currentTarget.setPointerCapture(event.pointerId);
//   }

//   function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
//     if (!drag) return;
//     const point = pointerToPercent(event);
//     if (drag.kind === "box") {
//       setDrag({ ...drag, box: { x1: drag.startX, y1: drag.startY, x2: point.x, y2: point.y } });
//       return;
//     }
//     if (drag.kind === "pan") {
//       updateCanvasFast({ panX: (drag.startPanX ?? 0) + event.clientX - drag.startClientX, panY: (drag.startPanY ?? 0) + event.clientY - drag.startClientY });
//       return;
//     }
//     if (drag.kind === "seat" && drag.originalSeats) {
//       const dx = point.x - drag.startX;
//       const dy = point.y - drag.startY;
//       const movingIds = new Set(drag.originalSeats.map((seat) => seat.id));
//       const originals = new Map(drag.originalSeats.map((seat) => [seat.id, seat]));
//       updateTemplateFast({
//         ...selectedTemplate,
//         seats: selectedTemplate.seats.map((seat) => {
//           if (!movingIds.has(seat.id)) return seat;
//           const original = originals.get(seat.id) ?? seat;
//           return { ...seat, x: maybeSnap(clamp(original.x + dx, 1, 99), selectedTemplate.canvas), y: maybeSnap(clamp(original.y + dy, 1, 99), selectedTemplate.canvas) };
//         }),
//       });
//     }
//     if (drag.kind === "object" && drag.originalObjects) {
//       const dx = point.x - drag.startX;
//       const dy = point.y - drag.startY;
//       const original = drag.originalObjects[0];
//       if (!original) return;
//       updateTemplateFast({
//         ...selectedTemplate,
//         objects: selectedTemplate.objects.map((object) => (object.id === original.id ? { ...object, x: maybeSnap(clamp(original.x + dx, 1, 99), selectedTemplate.canvas), y: maybeSnap(clamp(original.y + dy, 1, 99), selectedTemplate.canvas) } : object)),
//       });
//     }
//     if (drag.kind === "resize-object" && drag.originalObjects) {
//       const dx = point.x - drag.startX;
//       const dy = point.y - drag.startY;
//       const original = drag.originalObjects[0];
//       if (!original) return;
//       updateTemplateFast({
//         ...selectedTemplate,
//         objects: selectedTemplate.objects.map((object) => (object.id === original.id ? { ...object, width: clamp(original.width + dx, 4, 70), height: clamp(original.height + dy, 4, 70) } : object)),
//       });
//     }
//   }

//   function handlePointerUp() {
//     if (!drag) return;
//     if (drag.kind === "box" && drag.box) {
//       const box = normalizeBox(drag.box);
//       const seatsInBox = selectedTemplate.seats.filter((seat) => seat.x >= box.x1 && seat.x <= box.x2 && seat.y >= box.y1 && seat.y <= box.y2).map((seat) => seat.id);
//       setSelectedSeatIds(seatsInBox);
//       setMessage(seatsInBox.length ? `${seatsInBox.length} seats selected.` : "No seats inside selection.");
//     } else if (drag.kind !== "pan") {
//       setHistory((current) => [selectedTemplate, ...current].slice(0, 50));
//       saveCurrentTemplateFast();
//     } else {
//       saveCurrentTemplateFast();
//     }
//     setDrag(null);
//   }

//   function updateTemplateFast(nextTemplate: SeatMapTemplate) {
//     const normalized = normalizeTemplate({ ...nextTemplate, updatedAt: new Date().toISOString() });
//     setTemplates((current) => [normalized, ...current.filter((template) => template.id !== normalized.id)]);
//   }

//   function updateCanvasFast(patch: Partial<SeatMapCanvasState>) {
//     updateTemplateFast({ ...selectedTemplate, canvas: { ...selectedTemplate.canvas, ...patch } });
//   }

//   function saveCurrentTemplateFast() {
//     const current = templates.find((template) => template.id === selectedTemplate.id) || selectedTemplate;
//     writeSeatMapTemplates([current, ...templates.filter((template) => template.id !== current.id)]);
//   }

//   const summaryCards = [
//     { label: "Venue Name", value: selectedTemplate.venueName },
//     { label: "City", value: selectedTemplate.city },
//     { label: "Venue Type", value: selectedTemplate.venueType },
//     { label: "Total Capacity", value: String(selectedTemplate.totalCapacity) },
//     { label: "Sections", value: String(selectedTemplate.sections.length) },
//     { label: "Rows", value: String(rowsCount) },
//     { label: "Seats", value: String(selectedTemplate.seats.length) },
//     { label: "Status", value: titleCase(selectedTemplate.status) },
//   ];

//   return (
//     <section className="mx-auto grid w-full max-w-full min-w-0 gap-4 overflow-x-hidden text-slate-950 xl:max-w-[1720px]">
//       <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
//         <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
//           <div className="min-w-0">
//             <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{role === "super-admin" ? "Super Admin Panel" : "Admin Panel"}</p>
//             <div className="mt-2 flex flex-wrap items-center gap-3">
//               <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#EC1B72] to-[#7C2BD9] text-white shadow-lg shadow-pink-200">
//                 <Layers3 className="size-5" />
//               </span>
//               <div className="min-w-0">
//                 <h1 className="break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">Master Seat Map Editor</h1>
//                 <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Create reusable venue seat structures, then publish a locked master map for organizers to allocate online/offline/reserved seats.</p>
//               </div>
//               <StatusPill label={titleCase(selectedTemplate.status)} tone={selectedTemplate.status === "active" ? "success" : "warning"} />
//               <StatusPill label={message ? "Auto-saved" : "Ready"} tone="success" />
//             </div>
//           </div>
//           <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
//             <ToolbarButton onClick={undo} disabled={!history.length} icon={<Undo2 className="size-4" />}>Undo</ToolbarButton>
//             <ToolbarButton onClick={redo} disabled={!future.length} icon={<Redo2 className="size-4" />}>Redo</ToolbarButton>
//             <ToolbarButton onClick={() => setPreviewMode((value) => !value)} icon={<Eye className="size-4" />}>{previewMode ? "Exit Preview" : "Preview as Customer"}</ToolbarButton>
//             <ToolbarButton onClick={() => updateCanvas({ zoom: 1, panX: 0, panY: 0 })} icon={<Maximize2 className="size-4" />}>Fit to Screen</ToolbarButton>
//             <ZoomControl
//               zoom={selectedTemplate.canvas.zoom}
//               onZoomOut={() => updateCanvas({ zoom: clamp(selectedTemplate.canvas.zoom - 0.1, 0.45, 2.2) })}
//               onZoomIn={() => updateCanvas({ zoom: clamp(selectedTemplate.canvas.zoom + 0.1, 0.45, 2.2) })}
//             />
//             <ToolbarButton onClick={saveDraft} icon={<Save className="size-4" />}>Save Draft</ToolbarButton>
//             <PrimaryButton onClick={publishTemplate} icon={<ShieldCheck className="size-4" />}>Publish Template</PrimaryButton>
//           </div>
//         </div>
//         {message ? <p className="mt-4 rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3 text-sm font-bold text-[#15803D]">{message}</p> : null}
//       </section>

//       {setupOpen ? (
//         <VenueSetupCard
//           template={setupFormTemplate}
//           mode={setupMode}
//           templates={templates}
//           onMode={setSetupMode}
//           onPatch={updateSetupTemplate}
//           onSelectTemplate={(id) => {
//             setSelectedId(id);
//             setSetupMode("edit");
//             setMessage("Existing design loaded for editing.");
//           }}
//           onStartScratch={createFromScratch}
//           onLoadStarter={loadAuditoriumStarter}
//           onClose={() => setSetupOpen(false)}
//         />
//       ) : (
//         <button type="button" onClick={() => setSetupOpen(true)} className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-[#EC1B72] hover:text-[#EC1B72]">
//           Venue setup / Create from scratch
//         </button>
//       )}

//       <section className="grid min-w-0 grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4 xl:grid-cols-8">
//         {summaryCards.map((card) => <SummaryTile key={card.label} label={card.label} value={card.value} />)}
//       </section>

//       <section className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_370px]">
//         <aside className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
//           <div className="p-4 xl:max-h-[calc(100dvh-210px)] xl:overflow-y-auto">
//             <PanelTitle title="Tools" subtitle="Drag or click to place editor objects." />
//             <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
//               {toolItems.map((item) => (
//                 <button
//                   key={item.id}
//                   type="button"
//                   disabled={!canEditStructure && item.id !== "select" && item.id !== "pan"}
//                   onClick={() => {
//                     setTool(item.id);
//                     setMessage(item.id === "delete" ? "Delete tool active. Click a seat/object to delete. Tool returns to Select after delete." : `${item.label} tool active. Use it on the canvas.`);
//                   }}
//                   className={`min-h-[78px] rounded-2xl border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[86px] sm:p-3 ${tool === item.id ? "border-[#EC1B72] bg-[#EC1B72]/5 text-[#EC1B72] shadow-[0_10px_24px_rgba(236,27,114,0.12)]" : "border-slate-200 bg-white text-slate-800 hover:border-[#EC1B72]/50"}`}
//                 >
//                   <span className="block">{item.icon}</span>
//                   <span className="mt-2 block text-xs font-black">{item.label}</span>
//                   <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">{item.help}</span>
//                 </button>
//               ))}
//             </div>

//             <EditorCard title="Row Generator">
//               <SelectInput label="Section" value={rowForm.sectionId} options={selectedTemplate.sections.map((section) => ({ value: section.id, label: section.name }))} onChange={(value) => setRowForm((current) => ({ ...current, sectionId: value }))} />
//               <div className="grid grid-cols-2 gap-2">
//                 <TextInput label="Row" value={rowForm.row} onChange={(value) => setRowForm((current) => ({ ...current, row: value.toUpperCase().slice(0, 3) }))} />
//                 <SelectInput label="Shape" value={rowForm.shape} options={["straight", "arc", "curve-left", "curve-right"].map((item) => ({ value: item, label: item }))} onChange={(value) => setRowForm((current) => ({ ...current, shape: value as RowShape }))} />
//               </div>
//               <div className="grid grid-cols-2 gap-2">
//                 <TextInput label="Start No." type="number" value={String(rowForm.startNo)} onChange={(value) => setRowForm((current) => ({ ...current, startNo: Number(value) }))} />
//                 <TextInput label="End No." type="number" value={String(rowForm.endNo)} onChange={(value) => setRowForm((current) => ({ ...current, endNo: Number(value) }))} />
//               </div>
//               <SelectInput label="Direction" value={rowForm.direction} options={[{ value: "left-to-right", label: "left-to-right" }, { value: "right-to-left", label: "right-to-left" }]} onChange={(value) => setRowForm((current) => ({ ...current, direction: value }))} />
//               <div className="grid grid-cols-2 gap-2">
//                 <TextInput label="Start X %" type="number" value={String(rowForm.startX)} onChange={(value) => setRowForm((current) => ({ ...current, startX: Number(value) }))} />
//                 <TextInput label="Start Y %" type="number" value={String(rowForm.startY)} onChange={(value) => setRowForm((current) => ({ ...current, startY: Number(value) }))} />
//               </div>
//               <div className="grid grid-cols-2 gap-2">
//                 <TextInput label="Seat Spacing %" type="number" value={String(rowForm.spacing)} onChange={(value) => setRowForm((current) => ({ ...current, spacing: Number(value) }))} />
//                 <TextInput label="Row Angle" type="number" value={String(rowForm.rowAngle)} onChange={(value) => setRowForm((current) => ({ ...current, rowAngle: Number(value) }))} />
//               </div>
//               <TextInput label="Arc Depth" type="number" value={String(rowForm.arcDepth)} onChange={(value) => setRowForm((current) => ({ ...current, arcDepth: Number(value) }))} />
//               <SelectInput label="Tier" value={rowForm.tierId} options={selectedTemplate.tiers.map((tier) => ({ value: tier.id, label: `${tier.name} ${tier.priceLabel}` }))} onChange={(value) => setRowForm((current) => ({ ...current, tierId: value }))} />
//               <div className="grid grid-cols-2 gap-2">
//                 <SelectInput label="Status" value={rowForm.status} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => setRowForm((current) => ({ ...current, status: value as SeatStatus }))} />
//                 <SelectInput label="Channel" value={rowForm.channel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => setRowForm((current) => ({ ...current, channel: value as SeatSalesChannel }))} />
//               </div>
//               <div className="grid grid-cols-2 gap-2">
//                 <ToolbarButton onClick={() => generateRowAt(rowForm.startX, rowForm.startY)} icon={<Plus className="size-4" />}>Generate</ToolbarButton>
//                 <ToolbarButton onClick={() => setSelectedSeatIds([])} icon={<RotateCcw className="size-4" />}>Clear</ToolbarButton>
//               </div>
//             </EditorCard>

//             <EditorCard title="Quick Actions">
//               <ToolbarButton onClick={loadAuditoriumStarter} icon={<Layers3 className="size-4" />}>Load auditorium starter</ToolbarButton>
//               <ToolbarButton onClick={() => { setTool("stage"); setMessage("Stage tool active. Click the canvas to place another stage."); }} icon={<Square className="size-4" />}>Add stage</ToolbarButton>
//               <ToolbarButton onClick={() => { setTool("entry"); setMessage("Entry tool active. Click the canvas to place a gate."); }} icon={<Move className="size-4" />}>Add gate</ToolbarButton>
//               <ToolbarButton onClick={() => setSelectedSeatIds(selectedTemplate.seats.map((seat) => seat.id))} icon={<MousePointer2 className="size-4" />}>Select all seats</ToolbarButton>
//               <ToolbarButton onClick={duplicateSelected} icon={<Copy className="size-4" />}>Duplicate selected</ToolbarButton>
//               <ToolbarButton onClick={deleteSelected} icon={<Trash2 className="size-4" />}>Delete selected</ToolbarButton>
//               <div className="grid grid-cols-2 gap-2">
//                 <ToolbarButton onClick={exportJson} icon={<Download className="size-4" />}>Export JSON</ToolbarButton>
//                 <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<Upload className="size-4" />}>Import JSON</ToolbarButton>
//               </div>
//               <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
//             </EditorCard>
//           </div>
//         </aside>

//         <main className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
//           <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
//             <div className="flex flex-wrap items-center gap-2">
//               <button type="button" onClick={() => setMessage("Main Floor selected. Multi-floor support is API-ready and can be connected later.")} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800">
//                 Main Floor <ChevronDown className="size-4" />
//               </button>
//               <ChipButton active={selectedTemplate.canvas.showGrid} onClick={() => updateCanvas({ showGrid: !selectedTemplate.canvas.showGrid })}>Grid</ChipButton>
//               <ChipButton active={selectedTemplate.canvas.snapToGrid} onClick={() => updateCanvas({ snapToGrid: !selectedTemplate.canvas.snapToGrid })}>Snap</ChipButton>
//             </div>
//             <p className="hidden text-xs font-black text-slate-500 lg:block">
//               {previewMode ? "Customer preview: only available online seats are selectable." : "Click seats or drag to select multiple seats."}
//             </p>
//             <ToolbarButton onClick={() => updateCanvas({ panX: 0, panY: 0, zoom: 1 })} icon={<RotateCcw className="size-4" />}>Reset</ToolbarButton>
//           </div>

//           <div
//             ref={canvasRef}
//             onPointerDown={handleCanvasPointerDown}
//             onPointerMove={handlePointerMove}
//             onPointerUp={handlePointerUp}
//             onPointerCancel={handlePointerUp}
//             className={`relative min-h-[430px] touch-none overflow-hidden rounded-[22px] border border-slate-200 bg-[#FBFCFE] sm:min-h-[560px] xl:min-h-[680px] ${spaceDown || tool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
//           >
//             {selectedTemplate.canvas.showGrid ? <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)", backgroundSize: "28px 28px" }} /> : null}
//             <div
//               className="absolute inset-0 origin-top-left"
//               style={{ transform: `translate(${selectedTemplate.canvas.panX}px, ${selectedTemplate.canvas.panY}px) scale(${selectedTemplate.canvas.zoom})` }}
//             >
//               {selectedTemplate.objects.map((object) => {
//                 const selected = selectedObjectIds.includes(object.id);
//                 return (
//                   <div
//                     key={object.id}
//                     role="button"
//                     tabIndex={0}
//                     onPointerDown={(event) => handleObjectPointerDown(event, object.id)}
//                     className={`absolute select-none ${selected ? "z-30 ring-2 ring-[#EC1B72] ring-offset-2" : "z-10"}`}
//                     style={{
//                       left: `${object.x}%`,
//                       top: `${object.y}%`,
//                       width: `${object.width}%`,
//                       height: `${object.height}%`,
//                       transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
//                     }}
//                   >
//                     <CanvasObjectView object={object} />
//                     {selected && !previewMode ? (
//                       <span
//                         role="button"
//                         tabIndex={0}
//                         onPointerDown={(event) => handleResizeObjectPointerDown(event, object.id)}
//                         className="absolute -bottom-2 -right-2 z-40 size-4 rounded-full border-2 border-white bg-[#EC1B72] shadow"
//                         title="Resize"
//                       />
//                     ) : null}
//                   </div>
//                 );
//               })}

//               {selectedTemplate.sections.map((section) => (
//                 <div key={section.id} className="pointer-events-none absolute rounded-3xl border-2 border-dashed opacity-20" style={{ borderColor: section.color, left: `${section.x}%`, top: `${section.y}%`, width: `${section.width}%`, height: `${section.height}%`, transform: `translate(-50%, -50%) rotate(${section.rotation}deg)` }} />
//               ))}

//               {selectedTemplate.seats.map((seat) => {
//                 const selected = selectedSeatIds.includes(seat.id);
//                 const tier = selectedTemplate.tiers.find((item) => item.id === seat.tierId);
//                 const disabledInPreview = previewMode && (seat.status !== "available" || seat.channel !== "online");
//                 return (
//                   <button
//                     key={seat.id}
//                     type="button"
//                     disabled={disabledInPreview}
//                     onPointerDown={(event) => handleSeatPointerDown(event, seat.id)}
//                     className={`absolute grid place-items-center rounded-full border text-[10px] font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "z-40 border-[#EC1B72] bg-[#EC1B72] text-white ring-2 ring-[#EC1B72]/30" : "border-white"}`}
//                     style={{
//                       left: `${seat.x}%`,
//                       top: `${seat.y}%`,
//                       width: `${seat.radius * 2.15}%`,
//                       height: `${seat.radius * 2.15}%`,
//                       minWidth: 22,
//                       minHeight: 22,
//                       transform: `translate(-50%, -50%) rotate(${seat.rotation}deg)`,
//                       backgroundColor: selected ? "#EC1B72" : statusColor(seat.status, tier?.color, seat.channel),
//                       color: selected || seat.status !== "available" || seat.channel !== "online" ? "#FFFFFF" : "#047857",
//                     }}
//                     title={`${seat.sectionName} ${seat.row}-${seat.number} • ${statusLabel(seat.status)} • ${channelLabel(seat.channel)}`}
//                   >
//                     {seat.number}
//                   </button>
//                 );
//               })}
//             </div>

//             {drag?.kind === "box" && drag.box ? <SelectionBox box={drag.box} /> : null}
//             <CanvasLegend />
//             <div className="absolute bottom-3 right-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
//               Tool: {tool} • {selectedSeatIds.length} seats • {selectedObjectIds.length} objects
//             </div>
//           </div>
//         </main>

//         <aside className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
//           <div className="border-b border-slate-200 bg-slate-50 p-2">
//             <div className="flex gap-1 overflow-x-auto">
//               {inspectorTabs.map((item) => (
//                 <button
//                   key={item.id}
//                   type="button"
//                   onClick={() => setTab(item.id)}
//                   className={`relative min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold transition ${tab === item.id ? "bg-white text-[#EC1B72] shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
//                 >
//                   {item.label}
//                   {tab === item.id ? <span className="absolute inset-x-4 -bottom-2 h-1 rounded-full bg-gradient-to-r from-[#EC1B72] to-[#7C2BD9]" /> : null}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <div className="p-4 xl:max-h-[calc(100dvh-230px)] xl:overflow-y-auto">
//             {tab === "properties" ? (
//               <PropertiesInspector
//                 template={selectedTemplate}
//                 selectedSeats={selectedSeats}
//                 selectedObjects={selectedObjects}
//                 onPatchTemplate={patchTemplate}
//                 onPatchSeats={bulkPatchSeats}
//                 onPatchObject={(objectId, patch) => commit({ ...selectedTemplate, objects: selectedTemplate.objects.map((object) => (object.id === objectId ? { ...object, ...patch } : object)) }, "Object updated.")}
//                 onDelete={deleteSelected}
//               />
//             ) : null}
//             {tab === "sections" ? (
//               <SectionsPanel
//                 template={selectedTemplate}
//                 selectedSections={selectedSections}
//                 onUpdateSection={updateSection}
//                 onAddSection={() => addSectionAt(20 + selectedTemplate.sections.length * 8, 55)}
//                 onSelectSection={(sectionId) => setSelectedSeatIds(selectedTemplate.seats.filter((seat) => seat.sectionId === sectionId).map((seat) => seat.id))}
//               />
//             ) : null}
//             {tab === "tiers" ? (
//               <TiersPanel template={selectedTemplate} selectedSeatIds={selectedSeatIds} onAddTier={addTier} onUpdateTier={updateTier} onDeleteTier={deleteTier} onAssignTier={(tierId) => bulkPatchSeats({ tierId })} />
//             ) : null}
//             {tab === "templates" ? (
//               <TemplatesPanel templates={templates} selectedId={selectedTemplate.id} onSelect={setSelectedId} onDuplicate={duplicateTemplate} onArchive={archiveTemplate} onPublish={publishTemplate} onExport={exportJson} onImport={() => fileInputRef.current?.click()} />
//             ) : null}
//             {tab === "setup" ? (
//               <VenueSetupPanel template={selectedTemplate} onPatch={updateSetupTemplate} onScratch={createFromScratch} onLoadStarter={loadAuditoriumStarter} onPublish={publishTemplate} />
//             ) : null}
//           </div>
//         </aside>
//       </section>

//       {previewMode ? (
//         <section className="rounded-[24px] border border-[#6626B9]/20 bg-[#F4F0FF] p-4">
//           <CustomerSeatMapPreview eventName="Customer Preview" template={selectedTemplate} />
//         </section>
//       ) : null}
//     </section>
//   );
// }

// export function OrganizerSeatMapPersonalizationPanel({
//   eventId,
//   eventName = "Live in Concert",
//   organizerId,
//   initialTemplateId,
//   onSave,
//   mode = "embedded",
// }: {
//   eventId: string;
//   eventName?: string;
//   organizerId: string;
//   initialTemplateId?: string;
//   initialOverrideId?: string;
//   onSave?: (payload: { templateId: string; overrideId: string; summary: SeatMapCounts }) => void;
//   mode?: "embedded" | "page";
// }) {
//   const [templates, setTemplates] = useState<SeatMapTemplate[]>([]);
//   const [templateId, setTemplateId] = useState(initialTemplateId || "");
//   const [override, setOverride] = useState<SeatMapEventOverride | null>(null);
//   const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
//   const [bulkStatus, setBulkStatus] = useState<SeatStatus>("available");
//   const [bulkChannel, setBulkChannel] = useState<SeatSalesChannel>("online");
//   const [seatPlan, setSeatPlan] = useState<OrganizerSeatPlan>("use-approved");
//   const [venueSearch, setVenueSearch] = useState("");
//   const [requestForm, setRequestForm] = useState({
//     venueName: "",
//     city: "Pune",
//     eventType: "Event",
//     expectedCapacity: "",
//     notes: "",
//   });
//   const [message, setMessage] = useState("Choose if this event needs a venue seat map. Not every event, activity, or play needs the same venue design.");

//   useEffect(() => {
//     const active = readPublishedSeatMapTemplates();
//     const savedPlan = readOrganizerSeatPlan(eventId);
//     const firstTemplateId =
//       initialTemplateId ||
//       savedPlan.templateId ||
//       active.find((template) => template.isDefaultForOrganizers)?.id ||
//       active[0]?.id ||
//       "";

//     setTemplates(active);
//     setTemplateId(firstTemplateId);
//     setSeatPlan(savedPlan.plan ?? (active.length ? "use-approved" : "request-design"));
//     setRequestForm((current) => ({
//       ...current,
//       venueName: active.find((template) => template.id === firstTemplateId)?.venueName || current.venueName,
//       city: active.find((template) => template.id === firstTemplateId)?.city || current.city,
//     }));
//   }, [eventId, initialTemplateId]);

//   const filteredTemplates = templates.filter((item) => {
//     const query = venueSearch.trim().toLowerCase();
//     if (!query) return true;
//     return `${item.venueName} ${item.city} ${item.venueCode} ${item.venueType}`.toLowerCase().includes(query);
//   });
//   const template = templates.find((item) => item.id === templateId) || templates[0];

//   useEffect(() => {
//     if (!template || seatPlan !== "use-approved") return;
//     setOverride(readOrCreateOrganizerOverride(eventId, organizerId, eventName, template.id));
//   }, [eventId, eventName, organizerId, seatPlan, template?.id]);

//   function handlePlanChange(plan: OrganizerSeatPlan) {
//     setSeatPlan(plan);
//     saveOrganizerSeatPlan(
//       plan === "use-approved" && template?.id
//         ? { eventId, plan, templateId: template.id }
//         : { eventId, plan },
//     );
//     if (plan === "not-needed") {
//       setSelectedSeatIds([]);
//       setMessage("Seat map disabled for this event. Customers will book by ticket type/quantity like normal ticket cards.");
//       onSave?.({ templateId: "", overrideId: "no-seat-map-needed", summary: emptySeatMapCounts() });
//       return;
//     }
//     if (plan === "request-design") {
//       setMessage("Request venue design from Buizz support. Admin/Super Admin will review it in Support Tickets.");
//       return;
//     }
//     setMessage("Choose an approved venue map, then update only event-specific availability and sales channels.");
//   }

//   function handleTemplateSelect(nextTemplateId: string) {
//     setTemplateId(nextTemplateId);
//     setSelectedSeatIds([]);
//     saveOrganizerSeatPlan({ eventId, plan: "use-approved", templateId: nextTemplateId });
//     const nextTemplate = templates.find((item) => item.id === nextTemplateId);
//     if (nextTemplate) {
//       setRequestForm((current) => ({ ...current, venueName: nextTemplate.venueName, city: nextTemplate.city }));
//       setOverride(readOrCreateOrganizerOverride(eventId, organizerId, eventName, nextTemplate.id));
//       setMessage(`${nextTemplate.venueName} loaded. Master structure is locked; edit only allocation for this event.`);
//     }
//   }

//   function submitVenueDesignSupportTicket() {
//     const ticket = createVenueDesignSupportTicket({
//       eventId,
//       eventName,
//       organizerId,
//       venueName: requestForm.venueName.trim() || "Venue design request",
//       city: requestForm.city.trim() || "City not provided",
//       eventType: requestForm.eventType.trim() || "Event",
//       expectedCapacity: requestForm.expectedCapacity.trim() || "Not provided",
//       notes: requestForm.notes.trim(),
//     });
//     setMessage(`Venue design support ticket ${ticket.id} created. Admin/Super Admin will see it in Support Tickets.`);
//     setSeatPlan("request-design");
//     saveOrganizerSeatPlan({ eventId, plan: "request-design", supportTicketId: ticket.id });
//   }

//   function openSupportPage() {
//     if (typeof window === "undefined") return;
//     window.location.href = "/organizer/support";
//   }

//   if (seatPlan === "not-needed") {
//     const shellClass = mode === "page" ? "mx-auto grid w-full max-w-[1720px] gap-4 overflow-x-hidden" : "grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4";
//     return (
//       <section className={shellClass}>
//         <OrganizerSeatPlanChooser
//           seatPlan={seatPlan}
//           activeTemplates={templates.length}
//           onPlanChange={handlePlanChange}
//         />
//         <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
//           <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
//             <div>
//               <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">No seat-map event</p>
//               <h1 className="mt-2 text-2xl font-black tracking-[-0.03em]">{eventName}</h1>
//               <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
//                 This event will use normal ticket quantity cards instead of a seat map. This is best for activities, workshops, general admission, standing shows, and events where exact seats are not required.
//               </p>
//             </div>
//             <div className="grid gap-2 sm:flex sm:flex-wrap">
//               <ToolbarButton onClick={() => handlePlanChange("use-approved")} icon={<MapPin className="size-4" />}>Use Venue Map</ToolbarButton>
//               <PrimaryButton onClick={() => onSave?.({ templateId: "", overrideId: "no-seat-map-needed", summary: emptySeatMapCounts() })} icon={<Save className="size-4" />}>Save No Map</PrimaryButton>
//             </div>
//           </div>
//           <p className="mt-4 rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3 text-sm font-bold text-[#15803D]">{message}</p>
//         </section>
//       </section>
//     );
//   }

//   if (seatPlan === "request-design" || !templates.length) {
//     const shellClass = mode === "page" ? "mx-auto grid w-full max-w-[1720px] gap-4 overflow-x-hidden" : "grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4";
//     return (
//       <section className={shellClass}>
//         <OrganizerSeatPlanChooser
//           seatPlan="request-design"
//           activeTemplates={templates.length}
//           onPlanChange={handlePlanChange}
//         />
//         <section className="grid gap-4 rounded-[28px] border border-[#EC1B72]/20 bg-white p-4 shadow-[0_18px_50px_rgba(236,27,114,0.08)] sm:p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
//           <div className="min-w-0">
//             <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Venue design request</p>
//             <h1 className="mt-2 break-words text-2xl font-black tracking-[-0.03em]">Ask Buizz to create this venue design</h1>
//             <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
//               No approved venue map is available, or this event needs a different seating design. Submit a support ticket and Admin/Super Admin will review it in Support Tickets, create/approve the venue map, and then it will appear here.
//             </p>
//             <div className="mt-4 grid gap-3 sm:grid-cols-2">
//               <TextInput label="Venue name" value={requestForm.venueName} onChange={(value) => setRequestForm((current) => ({ ...current, venueName: value }))} />
//               <TextInput label="City" value={requestForm.city} onChange={(value) => setRequestForm((current) => ({ ...current, city: value }))} />
//               <SelectInput label="Event type" value={requestForm.eventType} options={["Event", "Activity", "Play", "Concert", "Workshop", "Sports", "Other"].map((item) => ({ value: item, label: item }))} onChange={(value) => setRequestForm((current) => ({ ...current, eventType: value }))} />
//               <TextInput label="Expected capacity" value={requestForm.expectedCapacity} onChange={(value) => setRequestForm((current) => ({ ...current, expectedCapacity: value }))} />
//               <label className="grid gap-1 text-xs font-black text-slate-600 sm:col-span-2">
//                 Seating/design notes
//                 <textarea
//                   value={requestForm.notes}
//                   onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
//                   placeholder="Example: stage at top, 4 sections, VIP front rows, balcony, blocked camera seats..."
//                   className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#EC1B72]"
//                 />
//               </label>
//             </div>
//             <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
//               <PrimaryButton onClick={submitVenueDesignSupportTicket} icon={<MessageCircle className="size-4" />}>Create Support Ticket</PrimaryButton>
//               <ToolbarButton onClick={openSupportPage} icon={<HelpCircle className="size-4" />}>Go to Support Page</ToolbarButton>
//               {templates.length ? <ToolbarButton onClick={() => handlePlanChange("use-approved")} icon={<MapPin className="size-4" />}>Use Existing Venue Map</ToolbarButton> : null}
//             </div>
//             <p className="mt-4 rounded-2xl border border-[#6626B9]/20 bg-[#F4F0FF] px-4 py-3 text-sm font-bold text-[#3B2572]">{message}</p>
//           </div>
//           <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
//             <PanelTitle title="How this works" subtitle="Organizer cannot redesign master venue maps." />
//             {[
//               "Submit request from here or Support page.",
//               "Admin/Super Admin sees the ticket in Support Tickets.",
//               "Admin/Super Admin creates or approves venue seat map.",
//               "Published venue design appears in this selector.",
//               "Organizer edits only availability, online/offline, reserved, blocked, VIP/staff usage.",
//             ].map((item) => (
//               <p key={item} className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold leading-5 text-slate-600">{item}</p>
//             ))}
//           </aside>
//         </section>
//       </section>
//     );
//   }

//   if (!template || !override) {
//     return <EmptyState title="Loading approved venue map" message="Preparing the organizer event copy. Please wait." />;
//   }

//   const resolvedSeats = template.seats.map((seat) => ({
//     ...seat,
//     status: override.statusOverrides[seat.id] || seat.status,
//     channel: override.channelOverrides[seat.id] || seat.channel,
//     tierId: override.tierOverrides[seat.id] || seat.tierId,
//   }));
//   const counts = getSeatCounts(resolvedSeats);
//   const selectedSeats = resolvedSeats.filter((seat) => selectedSeatIds.includes(seat.id));

//   function patchSelectedSeats() {
//     if (!override) {
//       setMessage("Seat allocation is still loading. Please try again.");
//       return;
//     }

//     if (!selectedSeatIds.length) {
//       setMessage("Select seats first.");
//       return;
//     }

//     if (selectedSeats.some((seat) => seat.status === "sold")) {
//       setMessage("Sold/taken seats are locked and cannot be edited by organizer.");
//       return;
//     }

//     const currentOverride = override;
//     const next: SeatMapEventOverride = {
//       id: currentOverride.id,
//       templateId: currentOverride.templateId,
//       eventId: currentOverride.eventId,
//       eventName: currentOverride.eventName,
//       organizerId: currentOverride.organizerId,
//       statusOverrides: { ...currentOverride.statusOverrides },
//       channelOverrides: { ...currentOverride.channelOverrides },
//       tierOverrides: { ...currentOverride.tierOverrides },
//       notes: { ...currentOverride.notes },
//       updatedAt: new Date().toISOString(),
//     };

//     for (const seatId of selectedSeatIds) {
//       next.statusOverrides[seatId] = bulkStatus;
//       next.channelOverrides[seatId] = bulkChannel;
//     }

//     saveOrganizerOverride(next);
//     setOverride(next);
//     setMessage(`${selectedSeatIds.length} seats updated for this event only. Master venue map is unchanged.`);
//   }

//   function saveOrganizerDraft() {
//     if (!override) {
//       setMessage("Seat allocation is still loading. Please try again.");
//       return;
//     }

//     saveOrganizerOverride(override);
//     saveOrganizerSeatPlan({ eventId, plan: "use-approved", templateId: template.id, overrideId: override.id });
//     onSave?.({ templateId: template.id, overrideId: override.id, summary: counts });
//     setMessage("Organizer seat allocation saved as event copy/override.");
//   }

//   const shellClass = mode === "page" ? "mx-auto grid w-full max-w-[1720px] gap-4 overflow-x-hidden" : "grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4";

//   return (
//     <section className={shellClass}>
//       <OrganizerSeatPlanChooser
//         seatPlan={seatPlan}
//         activeTemplates={templates.length}
//         onPlanChange={handlePlanChange}
//       />

//       <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
//         <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
//           <div>
//             <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Organizer Seat Allocation</p>
//             <h1 className="mt-2 text-2xl font-black tracking-[-0.03em]">{eventName}</h1>
//             <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Use the approved venue master map. Change only availability, online/offline channel, reserved, blocked, VIP, staff, and hold seats for this event.</p>
//           </div>
//           <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap xl:justify-end">
//             <ToolbarButton onClick={saveOrganizerDraft} icon={<Save className="size-4" />}>Save Event Copy</ToolbarButton>
//             <PrimaryButton onClick={saveOrganizerDraft} icon={<ShieldCheck className="size-4" />}>Submit for Review</PrimaryButton>
//           </div>
//         </div>
//         <p className="mt-4 rounded-2xl border border-[#6626B9]/20 bg-[#F4F0FF] px-4 py-3 text-sm font-bold text-[#3B2572]">{message}</p>
//       </section>

//       <section className="grid grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4 xl:grid-cols-8">
//         <SummaryTile label="Template" value={template.venueName} />
//         <SummaryTile label="Total Seats" value={String(counts.total)} />
//         <SummaryTile label="Available" value={String(counts.available)} />
//         <SummaryTile label="Online" value={String(counts.online)} />
//         <SummaryTile label="Offline" value={String(counts.offline)} />
//         <SummaryTile label="Reserved" value={String(counts.reserved)} />
//         <SummaryTile label="Blocked" value={String(counts.blocked + counts.disabled)} />
//         <SummaryTile label="Sold/Taken" value={String(counts.sold)} />
//       </section>

//       <section className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
//         <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
//           <PanelTitle title="Event Seat Controls" subtitle="Structure editing is locked for organizer." />
//           <TextInput label="Search venue" value={venueSearch} onChange={setVenueSearch} />
//           <SelectInput label="Approved Venue Map" value={template.id} options={(filteredTemplates.length ? filteredTemplates : templates).map((item) => ({ value: item.id, label: `${item.venueName} • ${item.city}` }))} onChange={handleTemplateSelect} />
//           <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
//             <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Need another venue?</p>
//             <ToolbarButton onClick={() => handlePlanChange("request-design")} icon={<MessageCircle className="size-4" />}>Request Venue Design</ToolbarButton>
//           </div>
//           <EditorCard title="Bulk allocation">
//             <SelectInput label="Seat status" value={bulkStatus} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => setBulkStatus(value as SeatStatus)} />
//             <SelectInput label="Sales channel" value={bulkChannel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => setBulkChannel(value as SeatSalesChannel)} />
//             <PrimaryButton onClick={patchSelectedSeats} icon={<CheckCircle2 className="size-4" />}>Apply to selected</PrimaryButton>
//             <ToolbarButton onClick={() => setSelectedSeatIds([])} icon={<RotateCcw className="size-4" />}>Clear selection</ToolbarButton>
//           </EditorCard>
//           <EditorCard title="What organizer can edit">
//             {[
//               "Available / blocked / reserved / hold",
//               "Online vs offline booking channel",
//               "VIP / staff / complimentary usage",
//               "Event-specific tier assignment",
//               "Cannot move seats, stage, gates, sections",
//             ].map((item) => <p key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">{item}</p>)}
//           </EditorCard>
//         </aside>
//         <main className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
//           <OrganizerLockedCanvas template={{ ...template, seats: resolvedSeats }} selectedIds={selectedSeatIds} onSelect={(id, additive) => setSelectedSeatIds((current) => additive ? toggle(current, id) : [id])} />
//         </main>
//         <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
//           <PanelTitle title="Selection" subtitle={`${selectedSeatIds.length} seats selected`} />
//           {selectedSeats.length ? (
//             <div className="grid gap-2">
//               {selectedSeats.slice(0, 12).map((seat) => (
//                 <div key={seat.id} className="rounded-2xl border border-slate-200 p-3 text-sm font-bold">
//                   {seat.sectionName} {seat.row}-{seat.number}
//                   <span className="block text-xs text-slate-500">{statusLabel(seat.status)} • {channelLabel(seat.channel)}</span>
//                 </div>
//               ))}
//               {selectedSeats.length > 12 ? <p className="text-xs font-bold text-slate-500">+{selectedSeats.length - 12} more selected</p> : null}
//             </div>
//           ) : <EmptyState title="No seats selected" message="Click seats on the map. Shift-click to select multiple seats." compact />}
//         </aside>
//       </section>
//     </section>
//   );
// }

// function OrganizerSeatPlanChooser({ seatPlan, activeTemplates, onPlanChange }: { seatPlan: OrganizerSeatPlan; activeTemplates: number; onPlanChange: (plan: OrganizerSeatPlan) => void }) {
//   const cards: Array<{ id: OrganizerSeatPlan; title: string; text: string; icon: ReactNode; badge: string }> = [
//     {
//       id: "use-approved",
//       title: "Use approved venue design",
//       text: "Choose a published Admin/Super Admin venue map and update event seat usage only.",
//       icon: <MapPin className="size-5" />,
//       badge: `${activeTemplates} maps`,
//     },
//     {
//       id: "not-needed",
//       title: "No seat map needed",
//       text: "Use normal ticket quantity cards for activities, workshops, GA, or non-seat events.",
//       icon: <Ticket className="size-5" />,
//       badge: "Ticket types",
//     },
//     {
//       id: "request-design",
//       title: "Request venue design",
//       text: "Create a support ticket so Buizz/Admin can make or approve the venue map.",
//       icon: <MessageCircle className="size-5" />,
//       badge: "Support",
//     },
//   ];

//   return (
//     <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
//       <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
//         <div>
//           <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Seat map decision</p>
//           <h2 className="mt-2 text-xl font-black tracking-[-0.02em]">Choose how this event will handle seating</h2>
//           <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Different events, activities, and plays can use different venue layouts, or no seat map at all.</p>
//         </div>
//       </div>
//       <div className="mt-4 grid gap-3 md:grid-cols-3">
//         {cards.map((card) => (
//           <button
//             key={card.id}
//             type="button"
//             onClick={() => onPlanChange(card.id)}
//             className={`min-w-0 rounded-3xl border p-4 text-left transition ${seatPlan === card.id ? "border-[#EC1B72] bg-[#EC1B72]/5 shadow-[0_14px_34px_rgba(236,27,114,0.12)]" : "border-slate-200 bg-slate-50 hover:border-[#EC1B72]/50"}`}
//           >
//             <div className="flex items-start justify-between gap-3">
//               <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${seatPlan === card.id ? "bg-[#EC1B72] text-white" : "bg-white text-slate-700"}`}>{card.icon}</span>
//               <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{card.badge}</span>
//             </div>
//             <h3 className="mt-3 break-words text-sm font-black text-slate-950">{card.title}</h3>
//             <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{card.text}</p>
//           </button>
//         ))}
//       </div>
//     </section>
//   );
// }

// function CustomerSeatMapPreview({ eventName, template }: { eventName: string; template: SeatMapTemplate }) {
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const selectedSeats = template.seats.filter((seat) => selectedIds.includes(seat.id));
//   const total = selectedSeats.reduce((sum, seat) => sum + (template.tiers.find((tier) => tier.id === seat.tierId)?.price || 0), 0);
//   return (
//     <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
//       <OrganizerLockedCanvas
//         template={template}
//         selectedIds={selectedIds}
//         previewCustomer
//         onSelect={(id) => setSelectedIds((current) => toggle(current, id))}
//       />
//       <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
//         <h3 className="text-lg font-black">{eventName}</h3>
//         <p className="mt-1 text-sm font-semibold text-slate-600">{template.venueName}, {template.city}</p>
//         <div className="mt-4 grid gap-2">
//           {selectedSeats.length ? selectedSeats.map((seat) => {
//             const tier = template.tiers.find((item) => item.id === seat.tierId);
//             return (
//               <div key={seat.id} className="rounded-2xl border border-slate-200 p-3 text-sm font-bold">
//                 {seat.sectionName} {seat.row}-{seat.number}
//                 <span className="block text-xs text-slate-500">{tier?.name || "General"} • {tier?.priceLabel || "₹0"}</span>
//               </div>
//             );
//           }) : <EmptyState title="Select seats" message="Only available online seats are selectable in customer preview." compact />}
//         </div>
//         <div className="mt-4 border-t border-slate-200 pt-4">
//           <div className="flex justify-between text-sm font-black"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
//           <button type="button" disabled className="mt-4 min-h-11 w-full rounded-2xl bg-slate-200 px-4 text-sm font-black text-slate-500">Proceed disabled in preview</button>
//         </div>
//       </aside>
//     </div>
//   );
// }

// function OrganizerLockedCanvas({ template, selectedIds, onSelect, previewCustomer = false }: { template: SeatMapTemplate; selectedIds: string[]; onSelect: (id: string, additive: boolean) => void; previewCustomer?: boolean }) {
//   return (
//     <div className="relative min-h-[420px] overflow-hidden sm:min-h-[520px] xl:min-h-[620px] rounded-[22px] border border-slate-200 bg-[#FBFCFE]">
//       <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
//       {template.objects.map((object) => (
//         <div key={object.id} className="absolute select-none" style={{ left: `${object.x}%`, top: `${object.y}%`, width: `${object.width}%`, height: `${object.height}%`, transform: `translate(-50%, -50%) rotate(${object.rotation}deg)` }}>
//           <CanvasObjectView object={object} />
//         </div>
//       ))}
//       {template.seats.map((seat) => {
//         const tier = template.tiers.find((item) => item.id === seat.tierId);
//         const selected = selectedIds.includes(seat.id);
//         const disabled = previewCustomer && (seat.status !== "available" || seat.channel !== "online");
//         return (
//           <button
//             key={seat.id}
//             type="button"
//             disabled={disabled}
//             onClick={(event) => onSelect(seat.id, event.shiftKey || event.metaKey || event.ctrlKey)}
//             className={`absolute grid place-items-center rounded-full border text-[10px] font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "z-30 border-[#EC1B72] bg-[#EC1B72] text-white ring-2 ring-[#EC1B72]/30" : "border-white"}`}
//             style={{ left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.radius * 2.15}%`, height: `${seat.radius * 2.15}%`, minWidth: 22, minHeight: 22, transform: "translate(-50%, -50%)", backgroundColor: selected ? "#EC1B72" : statusColor(seat.status, tier?.color, seat.channel), color: selected || seat.status !== "available" || seat.channel !== "online" ? "#FFFFFF" : "#047857" }}
//           >
//             {seat.number}
//           </button>
//         );
//       })}
//       <CanvasLegend />
//     </div>
//   );
// }

// function VenueSetupCard({ template, mode, templates, onMode, onPatch, onSelectTemplate, onStartScratch, onLoadStarter, onClose }: { template: SeatMapTemplate; mode: SetupMode; templates: SeatMapTemplate[]; onMode: (mode: SetupMode) => void; onPatch: (patch: Partial<SeatMapTemplate>) => void; onSelectTemplate: (id: string) => void; onStartScratch: () => void; onLoadStarter: () => void; onClose: () => void }) {
//   return (
//     <section className="rounded-[28px] border border-[#EC1B72]/20 bg-white p-5 shadow-[0_18px_50px_rgba(236,27,114,0.08)]">
//       <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
//         <div className="min-w-0">
//           <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Step 1 • Venue information first</p>
//           <h2 className="mt-2 text-xl font-black">Create from scratch or edit existing design</h2>
//           <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Set venue details before designing. This saved master template becomes the default map organizer can only allocate for events.</p>
//         </div>
//         <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white"><X className="size-4" /></button>
//       </div>
//       <div className="mt-4 flex flex-wrap gap-2">
//         <ChipButton active={mode === "edit"} onClick={() => onMode("edit")}>Edit Existing</ChipButton>
//         <ChipButton active={mode === "scratch"} onClick={() => onMode("scratch")}>Create From Scratch</ChipButton>
//       </div>
//       <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
//         <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
//           <TextInput label="Venue Name" value={template.venueName} onChange={(value) => onPatch({ venueName: value })} />
//           <TextInput label="City" value={template.city} onChange={(value) => onPatch({ city: value })} />
//           <SelectInput label="Venue Type" value={template.venueType} options={venueTypes.map((item) => ({ value: item, label: titleCase(item) }))} onChange={(value) => onPatch({ venueType: value as VenueType })} />
//           <TextInput label="Venue Code" value={template.venueCode} onChange={(value) => onPatch({ venueCode: value })} />
//           <label className="grid gap-1 text-xs font-black sm:col-span-2 xl:col-span-4">
//             Address / location notes
//             <textarea value={template.address} onChange={(event) => onPatch({ address: event.target.value })} className="min-h-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#EC1B72]" />
//           </label>
//         </div>
//         <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
//           {mode === "edit" ? (
//             <>
//               <SelectInput label="Saved Design" value={template.id} options={templates.map((item) => ({ value: item.id, label: `${item.venueName} • ${titleCase(item.status)}` }))} onChange={onSelectTemplate} />
//               <ToolbarButton onClick={onClose} icon={<Edit3 className="size-4" />}>Edit selected</ToolbarButton>
//               <ToolbarButton onClick={onLoadStarter} icon={<Layers3 className="size-4" />}>Load auditorium starter</ToolbarButton>
//             </>
//           ) : (
//             <>
//               <p className="text-sm font-bold leading-6 text-slate-600">Scratch mode keeps venue info and starts an empty canvas with only starter stage/gates.</p>
//               <PrimaryButton onClick={onStartScratch} icon={<Plus className="size-4" />}>Start Blank Canvas</PrimaryButton>
//               <ToolbarButton onClick={onLoadStarter} icon={<Layers3 className="size-4" />}>Use Auditorium Starter</ToolbarButton>
//             </>
//           )}
//         </div>
//       </div>
//     </section>
//   );
// }

// function PropertiesInspector({ template, selectedSeats, selectedObjects, onPatchTemplate, onPatchSeats, onPatchObject, onDelete }: { template: SeatMapTemplate; selectedSeats: SeatNode[]; selectedObjects: CanvasObject[]; onPatchTemplate: (patch: Partial<SeatMapTemplate>, notice?: string) => void; onPatchSeats: (patch: Partial<SeatNode>) => void; onPatchObject: (objectId: string, patch: Partial<CanvasObject>) => void; onDelete: () => void }) {
//   const firstSeat = selectedSeats[0];
//   const firstObject = selectedObjects[0];
//   return (
//     <div className="grid gap-4">
//       <EditorCard title="Template Details">
//         <TextInput label="Venue Name" value={template.venueName} onChange={(value) => onPatchTemplate({ venueName: value })} />
//         <TextInput label="City" value={template.city} onChange={(value) => onPatchTemplate({ city: value })} />
//         <SelectInput label="Status" value={template.status} options={["draft", "active", "inactive", "archived"].map((item) => ({ value: item, label: titleCase(item) }))} onChange={(value) => onPatchTemplate({ status: value as TemplateStatus })} />
//         <Checkbox label="Allow organizer structure edits" checked={template.allowOrganizerStructureEdits} onChange={(value) => onPatchTemplate({ allowOrganizerStructureEdits: value })} />
//         <Checkbox label="Default for organizers" checked={template.isDefaultForOrganizers} onChange={(value) => onPatchTemplate({ isDefaultForOrganizers: value })} />
//       </EditorCard>

//       <EditorCard title="Inspector">
//         {selectedSeats.length > 1 ? (
//           <>
//             <p className="rounded-2xl bg-[#EC1B72]/5 p-3 text-sm font-black text-[#EC1B72]">{selectedSeats.length} seats selected</p>
//             <SelectInput label="Bulk status" value={firstSeat?.status || "available"} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => onPatchSeats({ status: value as SeatStatus })} />
//             <SelectInput label="Bulk channel" value={firstSeat?.channel || "online"} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => onPatchSeats({ channel: value as SeatSalesChannel })} />
//             <SelectInput label="Bulk tier" value={firstSeat?.tierId || ""} options={template.tiers.map((tier) => ({ value: tier.id, label: tier.name }))} onChange={(value) => onPatchSeats({ tierId: value })} />
//             <ToolbarButton onClick={onDelete} icon={<Trash2 className="size-4" />}>Delete selected</ToolbarButton>
//           </>
//         ) : firstSeat ? (
//           <>
//             <TextInput label="Seat label" value={firstSeat.label} onChange={(value) => onPatchSeats({ label: value })} />
//             <TextInput label="Row" value={firstSeat.row} onChange={(value) => onPatchSeats({ row: value.toUpperCase() })} />
//             <TextInput label="Seat number" value={firstSeat.number} onChange={(value) => onPatchSeats({ number: value })} />
//             <SelectInput label="Section" value={firstSeat.sectionId} options={template.sections.map((section) => ({ value: section.id, label: section.name }))} onChange={(value) => {
//               const section = template.sections.find((item) => item.id === value);
//               onPatchSeats({ sectionId: value, sectionName: section?.name || "Section" });
//             }} />
//             <SelectInput label="Status" value={firstSeat.status} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => onPatchSeats({ status: value as SeatStatus })} />
//             <SelectInput label="Booking Channel" value={firstSeat.channel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => onPatchSeats({ channel: value as SeatSalesChannel })} />
//             <SelectInput label="Tier" value={firstSeat.tierId} options={template.tiers.map((tier) => ({ value: tier.id, label: tier.name }))} onChange={(value) => onPatchSeats({ tierId: value })} />
//             <div className="grid grid-cols-2 gap-2">
//               <TextInput label="X %" type="number" value={String(Math.round(firstSeat.x * 10) / 10)} onChange={(value) => onPatchSeats({ x: Number(value) })} />
//               <TextInput label="Y %" type="number" value={String(Math.round(firstSeat.y * 10) / 10)} onChange={(value) => onPatchSeats({ y: Number(value) })} />
//             </div>
//             <Checkbox label="Accessible seat" checked={firstSeat.isAccessible} onChange={(value) => onPatchSeats({ isAccessible: value })} />
//             <Checkbox label="Companion seat" checked={firstSeat.isCompanion} onChange={(value) => onPatchSeats({ isCompanion: value })} />
//             <ToolbarButton onClick={onDelete} icon={<Trash2 className="size-4" />}>Delete seat</ToolbarButton>
//           </>
//         ) : firstObject ? (
//           <>
//             <TextInput label="Label" value={firstObject.label} onChange={(value) => onPatchObject(firstObject.id, { label: value })} />
//             {firstObject.type === "label" ? <TextInput label="Text" value={firstObject.text || ""} onChange={(value) => onPatchObject(firstObject.id, { text: value })} /> : null}
//             <div className="grid grid-cols-2 gap-2">
//               <TextInput label="X %" type="number" value={String(Math.round(firstObject.x * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { x: Number(value) })} />
//               <TextInput label="Y %" type="number" value={String(Math.round(firstObject.y * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { y: Number(value) })} />
//             </div>
//             <div className="grid grid-cols-2 gap-2">
//               <TextInput label="Width %" type="number" value={String(Math.round(firstObject.width * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { width: Number(value) })} />
//               <TextInput label="Height %" type="number" value={String(Math.round(firstObject.height * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { height: Number(value) })} />
//             </div>
//             <TextInput label="Rotation" type="number" value={String(firstObject.rotation)} onChange={(value) => onPatchObject(firstObject.id, { rotation: Number(value) })} />
//             <ColorInput label="Object color" value={firstObject.color} onChange={(value) => onPatchObject(firstObject.id, { color: value })} />
//             <ToolbarButton onClick={onDelete} icon={<Trash2 className="size-4" />}>Delete object</ToolbarButton>
//           </>
//         ) : (
//           <EmptyState title="Select a seat or zone" message="Use Select tool, click a seat/object, or drag on canvas to box-select multiple seats." compact />
//         )}
//       </EditorCard>
//     </div>
//   );
// }

// function SectionsPanel({ template, selectedSections, onUpdateSection, onAddSection, onSelectSection }: { template: SeatMapTemplate; selectedSections: SeatSection[]; onUpdateSection: (sectionId: string, patch: Partial<SeatSection>) => void; onAddSection: () => void; onSelectSection: (sectionId: string) => void }) {
//   return (
//     <div className="grid gap-3">
//       <PanelTitle title="Sections" subtitle={`${template.sections.length} sections • ${selectedSections.length} selected`} />
//       <PrimaryButton onClick={onAddSection} icon={<Plus className="size-4" />}>Add Section</PrimaryButton>
//       {template.sections.map((section) => {
//         const seatCount = template.seats.filter((seat) => seat.sectionId === section.id).length;
//         return (
//           <article key={section.id} className="rounded-2xl border border-slate-200 p-3">
//             <div className="flex items-start gap-3">
//               <input type="color" value={section.color} onChange={(event) => onUpdateSection(section.id, { color: event.target.value })} className="mt-1 size-9 shrink-0 rounded-lg" aria-label={`${section.name} color`} />
//               <div className="min-w-0 flex-1">
//                 <input value={section.name} onChange={(event) => onUpdateSection(section.id, { name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black outline-none focus:border-[#EC1B72]" />
//                 <p className="mt-1 text-xs font-bold text-slate-500">{seatCount} seats • {titleCase(section.type)}</p>
//               </div>
//             </div>
//             <div className="mt-3 grid grid-cols-2 gap-2">
//               <button type="button" onClick={() => onSelectSection(section.id)} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black hover:border-[#EC1B72]">Focus</button>
//               <button type="button" onClick={() => onUpdateSection(section.id, { locked: !section.locked })} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black hover:border-[#EC1B72]">{section.locked ? "Unlock" : "Lock"}</button>
//             </div>
//           </article>
//         );
//       })}
//     </div>
//   );
// }

// function TiersPanel({ template, selectedSeatIds, onAddTier, onUpdateTier, onDeleteTier, onAssignTier }: { template: SeatMapTemplate; selectedSeatIds: string[]; onAddTier: () => void; onUpdateTier: (tierId: string, patch: Partial<SeatTier>) => void; onDeleteTier: (tierId: string) => void; onAssignTier: (tierId: string) => void }) {
//   return (
//     <div className="grid gap-3">
//       <PanelTitle title="Tiers & Pricing" subtitle="Create colored categories like Seats.io categories." />
//       <PrimaryButton onClick={onAddTier} icon={<Plus className="size-4" />}>Add Tier</PrimaryButton>
//       {template.tiers.map((tier) => {
//         const seats = template.seats.filter((seat) => seat.tierId === tier.id);
//         return (
//           <article key={tier.id} className="rounded-2xl border border-slate-200 p-3">
//             <div className="flex items-center gap-3">
//               <input type="color" value={tier.color} onChange={(event) => onUpdateTier(tier.id, { color: event.target.value })} className="size-9 rounded-lg" aria-label={`${tier.name} color`} />
//               <input value={tier.name} onChange={(event) => onUpdateTier(tier.id, { name: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black outline-none focus:border-[#EC1B72]" />
//             </div>
//             <div className="mt-2 grid grid-cols-2 gap-2">
//               <TextInput label="Price" type="number" value={String(tier.price)} onChange={(value) => onUpdateTier(tier.id, { price: Number(value), priceLabel: `₹${Number(value).toLocaleString("en-IN")}` })} />
//               <SelectInput label="Default channel" value={tier.channel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => onUpdateTier(tier.id, { channel: value as SeatSalesChannel })} />
//             </div>
//             <p className="mt-2 text-xs font-bold text-slate-500">{seats.length} seats assigned</p>
//             <div className="mt-3 grid grid-cols-2 gap-2">
//               <button type="button" disabled={!selectedSeatIds.length} onClick={() => onAssignTier(tier.id)} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black disabled:opacity-45">Assign selected</button>
//               <button type="button" onClick={() => onDeleteTier(tier.id)} className="min-h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600">Delete</button>
//             </div>
//           </article>
//         );
//       })}
//     </div>
//   );
// }

// function TemplatesPanel({ templates, selectedId, onSelect, onDuplicate, onArchive, onPublish, onExport, onImport }: { templates: SeatMapTemplate[]; selectedId: string; onSelect: (id: string) => void; onDuplicate: () => void; onArchive: () => void; onPublish: () => void; onExport: () => void; onImport: () => void }) {
//   return (
//     <div className="grid gap-3">
//       <PanelTitle title="Templates" subtitle="Load, duplicate, publish, export, or import master maps." />
//       <div className="grid grid-cols-2 gap-2">
//         <ToolbarButton onClick={onDuplicate} icon={<Copy className="size-4" />}>Duplicate</ToolbarButton>
//         <ToolbarButton onClick={onPublish} icon={<ShieldCheck className="size-4" />}>Publish</ToolbarButton>
//         <ToolbarButton onClick={onExport} icon={<FileJson className="size-4" />}>Export</ToolbarButton>
//         <ToolbarButton onClick={onImport} icon={<Upload className="size-4" />}>Import</ToolbarButton>
//       </div>
//       {templates.map((template) => (
//         <button key={template.id} type="button" onClick={() => onSelect(template.id)} className={`rounded-2xl border p-3 text-left ${selectedId === template.id ? "border-[#EC1B72] bg-[#EC1B72]/5" : "border-slate-200 bg-white"}`}>
//           <div className="flex items-start justify-between gap-3">
//             <div className="min-w-0">
//               <p className="break-words font-black">{template.venueName}</p>
//               <p className="mt-1 text-xs font-bold text-slate-500">{template.city} • {template.totalCapacity} seats • {titleCase(template.status)}</p>
//             </div>
//             {template.isDefaultForOrganizers ? <StatusPill label="Default" tone="brand" /> : null}
//           </div>
//         </button>
//       ))}
//       <button type="button" onClick={onArchive} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700">
//         <Archive className="mr-2 inline size-4" /> Archive current
//       </button>
//     </div>
//   );
// }

// function VenueSetupPanel({ template, onPatch, onScratch, onLoadStarter, onPublish }: { template: SeatMapTemplate; onPatch: (patch: Partial<SeatMapTemplate>) => void; onScratch: () => void; onLoadStarter: () => void; onPublish: () => void }) {
//   return (
//     <div className="grid gap-3">
//       <PanelTitle title="Venue Setup" subtitle="Backend-ready venue metadata before designing." />
//       <TextInput label="Venue name" value={template.venueName} onChange={(value) => onPatch({ venueName: value })} />
//       <TextInput label="City" value={template.city} onChange={(value) => onPatch({ city: value })} />
//       <TextInput label="Venue code" value={template.venueCode} onChange={(value) => onPatch({ venueCode: value })} />
//       <SelectInput label="Venue type" value={template.venueType} options={venueTypes.map((item) => ({ value: item, label: titleCase(item) }))} onChange={(value) => onPatch({ venueType: value as VenueType })} />
//       <Checkbox label="Default for organizers" checked={template.isDefaultForOrganizers} onChange={(value) => onPatch({ isDefaultForOrganizers: value })} />
//       <Checkbox label="Allow organizer structure edits" checked={template.allowOrganizerStructureEdits} onChange={(value) => onPatch({ allowOrganizerStructureEdits: value })} />
//       <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
//         <ToolbarButton onClick={onScratch} icon={<Plus className="size-4" />}>Scratch</ToolbarButton>
//         <ToolbarButton onClick={onLoadStarter} icon={<Layers3 className="size-4" />}>Auditorium starter</ToolbarButton>
//         <PrimaryButton onClick={onPublish} icon={<ShieldCheck className="size-4" />}>Publish</PrimaryButton>
//       </div>
//     </div>
//   );
// }

// function CanvasObjectView({ object }: { object: CanvasObject }) {
//   if (object.type === "stage") {
//     return <div className="grid size-full place-items-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg">{object.label || "STAGE"}</div>;
//   }
//   if (object.type === "entry" || object.type === "exit") {
//     return <div className={`grid size-full place-items-center rounded-2xl border px-3 text-center text-xs font-black ${object.type === "exit" ? "border-orange-200 bg-orange-50 text-orange-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{object.label}</div>;
//   }
//   if (object.type === "standing") {
//     return <div className="grid size-full place-items-center rounded-3xl border-2 border-dashed border-amber-300 bg-amber-100/60 text-center text-xs font-black text-amber-700">{object.label}<span className="block text-[10px]">{object.capacity || 0} capacity</span></div>;
//   }
//   if (object.type === "section-box") {
//     return <div className="grid size-full place-items-center rounded-3xl border-2 border-dashed bg-white/50 text-center text-xs font-black" style={{ borderColor: object.color, color: object.color }}>{object.label}</div>;
//   }
//   return <div className="grid size-full place-items-center rounded-2xl border border-slate-200 bg-white/90 p-2 text-center text-xs font-black text-slate-700 shadow-sm">{object.text || object.label}</div>;
// }

// function SelectionBox({ box }: { box: { x1: number; y1: number; x2: number; y2: number } }) {
//   const normalized = normalizeBox(box);
//   return <div className="pointer-events-none absolute z-50 border-2 border-[#EC1B72] bg-[#EC1B72]/10" style={{ left: `${normalized.x1}%`, top: `${normalized.y1}%`, width: `${normalized.x2 - normalized.x1}%`, height: `${normalized.y2 - normalized.y1}%` }} />;
// }

// function CanvasLegend() {
//   const items: Array<{ label: string; color: string }> = [
//     { label: "Available", color: "#22C55E" },
//     { label: "Blocked", color: "#111827" },
//     { label: "Reserved", color: "#7C3AED" },
//     { label: "Sold / taken", color: "#9CA3AF" },
//     { label: "Hold", color: "#F59E0B" },
//     { label: "VIP", color: "#EC1B72" },
//     { label: "Offline", color: "#3B82F6" },
//   ];
//   return (
//     <div className="absolute inset-x-2 bottom-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 px-2 py-2 text-[10px] font-black text-slate-600 shadow-sm sm:inset-x-3 sm:bottom-3 sm:gap-3 sm:px-3 sm:text-[11px]">
//       {items.map((item) => <span key={item.label} className="inline-flex items-center gap-1"><span className="size-3 rounded-full" style={{ backgroundColor: item.color }} /> {item.label}</span>)}
//     </div>
//   );
// }

// function EditorCard({ title, children }: { title: string; children: ReactNode }) {
//   return <section className="mt-4 grid gap-3 rounded-[20px] border border-slate-200 bg-white p-3"><h3 className="font-black text-slate-900">{title}</h3>{children}</section>;
// }

// function PanelTitle({ title, subtitle }: { title: string; subtitle?: string }) {
//   return <div className="mb-3"><h2 className="text-base font-black uppercase tracking-[0.02em] text-slate-950">{title}</h2>{subtitle ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p> : null}</div>;
// }

// function SummaryTile({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
//   return <article className={`min-w-0 rounded-[20px] bg-slate-100 px-4 py-3 ${className}`}><p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p></article>;
// }

// function StatusPill({ label, tone = "muted" }: { label: string; tone?: "success" | "warning" | "brand" | "muted" }) {
//   const className = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : tone === "brand" ? "border-[#EC1B72]/25 bg-[#EC1B72]/10 text-[#EC1B72]" : "border-slate-200 bg-slate-100 text-slate-600";
//   return <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase ${className}`}>{label}</span>;
// }

// function ToolbarButton({ children, icon, onClick, disabled = false }: { children: ReactNode; icon?: ReactNode; onClick: () => void; disabled?: boolean }) {
//   return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#EC1B72] hover:text-[#EC1B72] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-4">{icon}{children}</button>;
// }

// function PrimaryButton({ children, icon, onClick }: { children: ReactNode; icon?: ReactNode; onClick: () => void }) {
//   return <button type="button" onClick={onClick} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC1B72] to-[#7C2BD9] px-3 text-xs font-black text-white shadow-lg shadow-pink-100 transition active:scale-[0.98] sm:w-auto sm:px-4">{icon}{children}</button>;
// }

// function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
//   return <button type="button" onClick={onClick} className={`min-h-10 rounded-2xl border px-4 text-sm font-semibold transition ${active ? "border-[#EC1B72] bg-[#EC1B72]/5 text-[#EC1B72]" : "border-slate-200 bg-white text-slate-700"}`}>{children}</button>;
// }

// function ZoomControl({ zoom, onZoomIn, onZoomOut }: { zoom: number; onZoomIn: () => void; onZoomOut: () => void }) {
//   return <div className="inline-flex min-h-10 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white"><button type="button" onClick={onZoomOut} className="grid size-10 place-items-center"><ZoomOut className="size-4" /></button><span className="min-w-16 text-center text-xs font-black">{Math.round(zoom * 100)}%</span><button type="button" onClick={onZoomIn} className="grid size-10 place-items-center"><ZoomIn className="size-4" /></button></div>;
// }

// function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
//   return <label className="grid gap-1 text-xs font-black text-slate-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-[#EC1B72]" /></label>;
// }

// function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
//   return <label className="grid gap-1 text-xs font-black text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-[#EC1B72]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
// }

// function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
//   return <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-black text-slate-600">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-10 rounded-lg" /></label>;
// }

// function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
//   return <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#EC1B72]" /></label>;
// }

// function EmptyState({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
//   return (
//     <div className={`grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? "p-4" : "p-8"}`}>
//       <div>
//         <ImageIcon className="mx-auto size-8 text-slate-400" />
//         <p className="mt-3 font-black text-slate-900">{title}</p>
//         <p className="mt-1 text-sm font-semibold text-slate-500">{message}</p>
//       </div>
//     </div>
//   );
// }


// type OrganizerSeatPlanRecord = {
//   eventId: string;
//   plan: OrganizerSeatPlan;
//   templateId?: string;
//   overrideId?: string;
//   supportTicketId?: string;
//   updatedAt: string;
// };

// const organizerSeatPlanStorageKey = "buizz-organizer-event-seat-plan-v1";

// function emptySeatMapCounts(): SeatMapCounts {
//   return {
//     total: 0,
//     available: 0,
//     online: 0,
//     offline: 0,
//     reserved: 0,
//     blocked: 0,
//     sold: 0,
//     disabled: 0,
//     hold: 0,
//     vip: 0,
//     staff: 0,
//   };
// }

// function readOrganizerSeatPlan(eventId: string): Partial<OrganizerSeatPlanRecord> {
//   if (typeof window === "undefined") return {};
//   try {
//     const records = JSON.parse(window.localStorage.getItem(organizerSeatPlanStorageKey) || "[]") as OrganizerSeatPlanRecord[];
//     return records.find((record) => record.eventId === eventId) || {};
//   } catch {
//     return {};
//   }
// }

// function saveOrganizerSeatPlan(record: Omit<OrganizerSeatPlanRecord, "updatedAt">) {
//   if (typeof window === "undefined") return;
//   const records = (() => {
//     try {
//       const parsed = JSON.parse(window.localStorage.getItem(organizerSeatPlanStorageKey) || "[]") as OrganizerSeatPlanRecord[];
//       return Array.isArray(parsed) ? parsed : [];
//     } catch {
//       return [];
//     }
//   })();
//   const nextRecord: OrganizerSeatPlanRecord = { ...record, updatedAt: new Date().toISOString() };
//   window.localStorage.setItem(
//     organizerSeatPlanStorageKey,
//     JSON.stringify([nextRecord, ...records.filter((item) => item.eventId !== record.eventId)]),
//   );
// }

// function createVenueDesignSupportTicket({
//   eventId,
//   eventName,
//   organizerId,
//   venueName,
//   city,
//   eventType,
//   expectedCapacity,
//   notes,
// }: {
//   eventId: string;
//   eventName: string;
//   organizerId: string;
//   venueName: string;
//   city: string;
//   eventType: string;
//   expectedCapacity: string;
//   notes: string;
// }): SupportTicket {
//   const now = getSupportTimestamp();
//   const category = "Technical Issue" as SupportTicket["category"];
//   const ticket: SupportTicket = {
//     id: createSupportTicketId(),
//     sourceType: "Organizer",
//     requesterName: "FestLane Studios",
//     requesterEmail: "ayaan@festlane.local",
//     subject: `Venue seat-map design request: ${venueName}`,
//     description: [
//       `Organizer ID: ${organizerId}`,
//       `Event: ${eventName}`,
//       `Event ID: ${eventId}`,
//       `Event type: ${eventType}`,
//       `Venue: ${venueName}`,
//       `City: ${city}`,
//       `Expected capacity: ${expectedCapacity}`,
//       notes ? `Notes: ${notes}` : "Notes: No extra notes added.",
//       "",
//       "Request: Please create or approve a venue seat-map design so this organizer can use it for event-specific allocation.",
//     ].join("\n"),
//     category,
//     priority: getAutoSupportPriority(category),
//     status: "Open",
//     assignedTo: "Unassigned",
//     createdAt: now,
//     lastUpdated: now,
//   };

//   const current = getSupportTickets();
//   saveSupportTickets([ticket, ...current]);
//   return ticket;
// }

// export function readSeatMapTemplates(): SeatMapTemplate[] {
//   if (typeof window === "undefined") return [createAuditoriumSeedTemplate("super-admin")];
//   try {
//     const parsed = JSON.parse(window.localStorage.getItem(seatMapStorageKey) || "[]") as SeatMapTemplate[];
//     return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeTemplate) : [createAuditoriumSeedTemplate("super-admin")];
//   } catch {
//     return [createAuditoriumSeedTemplate("super-admin")];
//   }
// }

// export function writeSeatMapTemplates(templates: SeatMapTemplate[]) {
//   if (typeof window === "undefined") return;
//   window.localStorage.setItem(seatMapStorageKey, JSON.stringify(templates.map(normalizeTemplate)));
//   // TODO: Replace localStorage save with POST/PATCH /api/admin/seat-map-templates.
// }

// export function readPublishedSeatMapTemplates(): SeatMapTemplate[] {
//   return readSeatMapTemplates().filter(
//     (template) => template.status === "active" || template.isDefaultForOrganizers,
//   );
// }

// export function getDefaultSeatMapTemplateForVenue(venueName?: string, city?: string) {
//   const normalizedVenue = venueName?.trim().toLowerCase();
//   const normalizedCity = city?.trim().toLowerCase();
//   const publishedTemplates = readPublishedSeatMapTemplates();

//   return (
//     publishedTemplates.find(
//       (template) =>
//         (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
//         (!normalizedCity || template.city.toLowerCase() === normalizedCity) &&
//         template.isDefaultForOrganizers,
//     ) ??
//     publishedTemplates.find(
//       (template) =>
//         (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
//         (!normalizedCity || template.city.toLowerCase() === normalizedCity),
//     ) ??
//     publishedTemplates.find((template) => template.isDefaultForOrganizers) ??
//     publishedTemplates[0]
//   );
// }

// export function getSeatMapTemplatesForVenue(venueName?: string, city?: string) {
//   const normalizedVenue = venueName?.trim().toLowerCase();
//   const normalizedCity = city?.trim().toLowerCase();

//   return readSeatMapTemplates().filter(
//     (template) =>
//       (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
//       (!normalizedCity || template.city.toLowerCase() === normalizedCity),
//   );
// }

// function readSelectedTemplateId() {
//   if (typeof window === "undefined") return "";
//   return window.localStorage.getItem(selectedSeatMapStorageKey) || "";
// }

// function saveSelectedTemplateId(id: string) {
//   if (typeof window === "undefined") return;
//   window.localStorage.setItem(selectedSeatMapStorageKey, id);
// }

// export function readOrCreateOrganizerOverride(eventId: string, organizerId: string, eventName: string, templateId: string): SeatMapEventOverride {
//   if (typeof window === "undefined") return createOrganizerOverride(eventId, organizerId, eventName, templateId);
//   try {
//     const records = JSON.parse(window.localStorage.getItem(organizerOverrideStorageKey) || "[]") as SeatMapEventOverride[];
//     const existing = records.find((record) => record.eventId === eventId && record.templateId === templateId);
//     if (existing) return existing;
//   } catch {
//     // fallback below
//   }
//   const created = createOrganizerOverride(eventId, organizerId, eventName, templateId);
//   saveOrganizerOverride(created);
//   return created;
// }

// export function saveOrganizerOverride(override: SeatMapEventOverride) {
//   if (typeof window === "undefined") return;
//   const records = (() => {
//     try {
//       const parsed = JSON.parse(window.localStorage.getItem(organizerOverrideStorageKey) || "[]") as SeatMapEventOverride[];
//       return Array.isArray(parsed) ? parsed : [];
//     } catch {
//       return [];
//     }
//   })();
//   const next = [override, ...records.filter((record) => record.id !== override.id)];
//   window.localStorage.setItem(organizerOverrideStorageKey, JSON.stringify(next));
//   // TODO: Replace with POST /api/organizer/events/:eventId/seat-map-copy.
// }

// function createOrganizerOverride(eventId: string, organizerId: string, eventName: string, templateId: string): SeatMapEventOverride {
//   return { id: createId("event-seat-copy"), templateId, eventId, eventName, organizerId, statusOverrides: {}, channelOverrides: {}, tierOverrides: {}, notes: {}, updatedAt: new Date().toISOString() };
// }

// function createAuditoriumSeedTemplate(role: MasterRole): SeatMapTemplate {
//   const tiers: SeatTier[] = [
//     { id: "tier-vip", name: "VIP", color: "#EC1B72", price: 2499, priceLabel: "₹2,499", channel: "online", description: "Closest premium seats", active: true },
//     { id: "tier-premium", name: "Premium", color: "#EF4444", price: 1499, priceLabel: "₹1,499", channel: "online", description: "Ground floor premium", active: true },
//     { id: "tier-balcony", name: "Balcony", color: "#84CC16", price: 899, priceLabel: "₹899", channel: "online", description: "Balcony seats", active: true },
//     { id: "tier-silver", name: "Silver", color: "#3B82F6", price: 599, priceLabel: "₹599", channel: "offline", description: "Offline counter block", active: true },
//   ];
//   const sections: SeatSection[] = [
//     { id: "section-vip", name: "VIP Center", type: "vip", color: "#EC1B72", tierId: "tier-vip", capacity: 0, x: 50, y: 35, width: 32, height: 18, rotation: 0, locked: false },
//     { id: "section-ground", name: "Ground Floor", type: "seated", color: "#EF4444", tierId: "tier-premium", capacity: 0, x: 50, y: 55, width: 42, height: 28, rotation: 0, locked: false },
//     { id: "section-left-balcony", name: "Left Balcony", type: "balcony", color: "#84CC16", tierId: "tier-balcony", capacity: 0, x: 23, y: 58, width: 24, height: 42, rotation: -16, locked: false },
//     { id: "section-right-balcony", name: "Right Balcony", type: "balcony", color: "#84CC16", tierId: "tier-balcony", capacity: 0, x: 77, y: 58, width: 24, height: 42, rotation: 16, locked: false },
//     { id: "section-silver", name: "Back Silver", type: "seated", color: "#3B82F6", tierId: "tier-silver", capacity: 0, x: 50, y: 82, width: 36, height: 12, rotation: 0, locked: false },
//   ];
//   const seats = [
//     ...buildRowSeats({ section: sections[0], row: "A", startNo: 1, endNo: 12, startX: 38, startY: 31, spacing: 3.8, rowAngle: 0, arcDepth: 1, shape: "arc", tier: tiers[0], status: "available", channel: "online" }),
//     ...buildRowSeats({ section: sections[0], row: "B", startNo: 1, endNo: 12, startX: 38, startY: 37, spacing: 3.8, rowAngle: 0, arcDepth: 1, shape: "arc", tier: tiers[0], status: "available", channel: "online" }),
//     ...buildRowSeats({ section: sections[1], row: "C", startNo: 1, endNo: 16, startX: 32, startY: 47, spacing: 3.1, rowAngle: 0, arcDepth: 0, shape: "straight", tier: tiers[1], status: "available", channel: "online" }),
//     ...buildRowSeats({ section: sections[1], row: "D", startNo: 1, endNo: 16, startX: 32, startY: 53, spacing: 3.1, rowAngle: 0, arcDepth: 0, shape: "straight", tier: tiers[1], status: "available", channel: "online" }),
//     ...buildRowSeats({ section: sections[1], row: "E", startNo: 1, endNo: 16, startX: 32, startY: 61, spacing: 3.1, rowAngle: 0, arcDepth: 0, shape: "straight", tier: tiers[1], status: "reserved", channel: "reserved" }),
//     ...buildRowSeats({ section: sections[2], row: "F", startNo: 1, endNo: 11, startX: 10, startY: 35, spacing: 3.6, rowAngle: 78, arcDepth: 3, shape: "curve-left", tier: tiers[2], status: "available", channel: "online" }),
//     ...buildRowSeats({ section: sections[2], row: "G", startNo: 1, endNo: 11, startX: 16, startY: 38, spacing: 3.6, rowAngle: 78, arcDepth: 3, shape: "curve-left", tier: tiers[2], status: "available", channel: "online" }),
//     ...buildRowSeats({ section: sections[3], row: "H", startNo: 1, endNo: 11, startX: 90, startY: 35, spacing: 3.6, rowAngle: 102, arcDepth: 3, shape: "curve-right", tier: tiers[2], status: "available", channel: "online", reverse: true }),
//     ...buildRowSeats({ section: sections[3], row: "I", startNo: 1, endNo: 11, startX: 84, startY: 38, spacing: 3.6, rowAngle: 102, arcDepth: 3, shape: "curve-right", tier: tiers[2], status: "available", channel: "online", reverse: true }),
//     ...buildRowSeats({ section: sections[4], row: "J", startNo: 1, endNo: 18, startX: 28, startY: 80, spacing: 2.6, rowAngle: 0, arcDepth: -2, shape: "arc", tier: tiers[3], status: "available", channel: "offline" }),
//   ];
//   const objects: CanvasObject[] = [
//     { id: "object-stage-main", type: "stage", label: "STAGE", x: 50, y: 13, width: 19, height: 7, rotation: 0, color: "#111827" },
//     { id: "object-ga", type: "standing", label: "General Admission", x: 50, y: 23, width: 23, height: 7, rotation: 0, color: "#EF4444", capacity: 180, tierId: "tier-premium" },
//     { id: "object-gate-a", type: "entry", label: "GATE A", x: 22, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
//     { id: "object-gate-b", type: "entry", label: "GATE B", x: 78, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
//     { id: "object-organ", type: "label", label: "ORGAN", text: "ORGAN", x: 50, y: 96, width: 14, height: 5, rotation: 0, color: "#64748B" },
//   ];
//   return normalizeTemplate({
//     id: "venue-template-grand-auditorium",
//     venueName: "Buizz Grand Auditorium",
//     venueCode: "BGA-PUNE-001",
//     city: "Pune",
//     address: "Pune, Maharashtra",
//     venueType: "auditorium",
//     status: "active",
//     version: 1,
//     totalCapacity: seats.length + 180,
//     allowOrganizerStructureEdits: false,
//     isDefaultForOrganizers: true,
//     sections,
//     tiers,
//     seats,
//     objects,
//     canvas: { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 },
//     createdAt: dateSeed,
//     updatedAt: dateSeed,
//     createdByRole: role,
//     updatedByRole: role,
//     publishedAt: dateSeed,
//     publishedBy: role,
//   });
// }

// function createScratchTemplate(role: MasterRole, base?: SeatMapTemplate): SeatMapTemplate {
//   const tier = createDefaultTier();
//   const section = createDefaultSection();
//   return normalizeTemplate({
//     id: createId("venue-template"),
//     venueName: base?.venueName ? `${base.venueName} Blank` : "New Venue Seat Map",
//     venueCode: base?.venueCode ? `${base.venueCode}-NEW` : "VENUE-NEW",
//     city: base?.city || "Pune",
//     address: base?.address || "",
//     venueType: base?.venueType || "auditorium",
//     status: "draft",
//     version: 1,
//     totalCapacity: 0,
//     allowOrganizerStructureEdits: false,
//     isDefaultForOrganizers: false,
//     sections: [section],
//     tiers: [tier],
//     seats: [],
//     objects: [
//       { id: createId("stage"), type: "stage", label: "STAGE", x: 50, y: 14, width: 18, height: 7, rotation: 0, color: "#111827" },
//       { id: createId("entry"), type: "entry", label: "GATE A", x: 25, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
//       { id: createId("entry"), type: "entry", label: "GATE B", x: 75, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
//     ],
//     canvas: { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 },
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//     createdByRole: role,
//     updatedByRole: role,
//   });
// }

// function createDefaultTier(): SeatTier {
//   return { id: "tier-general", name: "General", color: "#22C55E", price: 999, priceLabel: "₹999", channel: "online", description: "General admission seats", active: true };
// }

// function createDefaultSection(): SeatSection {
//   return { id: "section-general", name: "General", type: "seated", color: "#22C55E", tierId: "tier-general", capacity: 0, x: 50, y: 55, width: 40, height: 32, rotation: 0, locked: false };
// }

// function buildRowSeats({ section, row, startNo, endNo, startX, startY, spacing, rowAngle, arcDepth, shape, tier, status, channel, reverse = false }: { section: SeatSection; row: string; startNo: number; endNo: number; startX: number; startY: number; spacing: number; rowAngle: number; arcDepth: number; shape: RowShape; tier: SeatTier; status: SeatStatus; channel: SeatSalesChannel; reverse?: boolean }): SeatNode[] {
//   const count = Math.max(0, endNo - startNo + 1);
//   const angle = (rowAngle * Math.PI) / 180;
//   const dx = Math.cos(angle) * spacing;
//   const dy = Math.sin(angle) * spacing;
//   return Array.from({ length: count }, (_, index) => {
//     const seatNo = reverse ? endNo - index : startNo + index;
//     const centered = index - (count - 1) / 2;
//     const arcOffset = shape === "straight" ? 0 : Math.sin((index / Math.max(1, count - 1)) * Math.PI) * arcDepth;
//     const curveOffset = shape === "curve-left" ? index * 0.45 : shape === "curve-right" ? -index * 0.45 : 0;
//     return {
//       id: createId("seat"),
//       label: `${row}${seatNo}`,
//       sectionId: section.id,
//       sectionName: section.name,
//       row,
//       number: String(seatNo),
//       x: clamp(startX + index * dx + curveOffset, 2, 98),
//       y: clamp(startY + index * dy + arcOffset + Math.abs(centered) * 0.1, 2, 98),
//       radius: 1.35,
//       status,
//       channel,
//       tierId: tier.id,
//       rotation: rowAngle,
//       isAccessible: false,
//       isCompanion: false,
//       notes: "",
//     };
//   });
// }

// function mergeSeats(existing: SeatNode[], next: SeatNode[]) {
//   const keys = new Set(next.map((seat) => `${seat.sectionId}-${seat.row}-${seat.number}`));
//   return [...existing.filter((seat) => !keys.has(`${seat.sectionId}-${seat.row}-${seat.number}`)), ...next];
// }

// function normalizeTemplate(template: SeatMapTemplate): SeatMapTemplate {
//   const seats = template.seats || [];
//   const sections = (template.sections || []).map((section) => ({ ...section, capacity: seats.filter((seat) => seat.sectionId === section.id).length }));
//   const standingCapacity = (template.objects || []).filter((object) => object.type === "standing").reduce((sum, object) => sum + (object.capacity || 0), 0);
//   return {
//     ...template,
//     sections,
//     seats,
//     objects: template.objects || [],
//     tiers: template.tiers?.length ? template.tiers : [createDefaultTier()],
//     canvas: template.canvas || { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 },
//     totalCapacity: seats.length + standingCapacity,
//   };
// }

// function validateTemplate(template: SeatMapTemplate): string[] {
//   const issues: string[] = [];
//   if (!template.venueName.trim()) issues.push("Venue name is required before publish.");
//   if (!template.city.trim()) issues.push("City is required before publish.");
//   if (!template.sections.length) issues.push("At least one section is required.");
//   if (!template.seats.length && !template.objects.some((object) => object.type === "standing")) issues.push("Add seats or a standing zone before publish.");
//   const sectionIds = new Set(template.sections.map((section) => section.id));
//   if (template.seats.some((seat) => !sectionIds.has(seat.sectionId))) issues.push("Every seat must belong to a valid section.");
//   const tierIds = new Set(template.tiers.map((tier) => tier.id));
//   if (template.seats.some((seat) => !tierIds.has(seat.tierId))) issues.push("Some seats have broken tier references.");
//   const duplicateKeys = new Set<string>();
//   const seen = new Set<string>();
//   for (const seat of template.seats) {
//     const key = `${seat.sectionId}-${seat.row}-${seat.number}`;
//     if (seen.has(key)) duplicateKeys.add(key);
//     seen.add(key);
//   }
//   if (duplicateKeys.size) issues.push("Duplicate seat labels exist inside same section/row.");
//   return issues;
// }

// function getTemplateCounts(template: SeatMapTemplate) {
//   return getSeatCounts(template.seats);
// }

// function getSeatCounts(seats: SeatNode[]): SeatMapCounts {
//   return {
//     total: seats.length,
//     available: seats.filter((seat) => seat.status === "available").length,
//     online: seats.filter((seat) => seat.channel === "online" && seat.status === "available").length,
//     offline: seats.filter((seat) => seat.channel === "offline" && seat.status === "available").length,
//     reserved: seats.filter((seat) => seat.status === "reserved" || seat.channel === "reserved").length,
//     blocked: seats.filter((seat) => seat.status === "blocked").length,
//     sold: seats.filter((seat) => seat.status === "sold").length,
//     disabled: seats.filter((seat) => seat.status === "disabled").length,
//     hold: seats.filter((seat) => seat.status === "hold").length,
//     vip: seats.filter((seat) => seat.status === "vip").length,
//     staff: seats.filter((seat) => seat.status === "staff").length,
//   };
// }

// function statusColor(status: SeatStatus, tierColor = "#22C55E", channel: SeatSalesChannel = "online") {
//   if (status === "blocked") return "#111827";
//   if (status === "reserved") return "#7C3AED";
//   if (status === "sold" || status === "disabled") return "#9CA3AF";
//   if (status === "hold") return "#F59E0B";
//   if (status === "vip") return "#EC1B72";
//   if (status === "staff") return "#0EA5E9";
//   if (channel === "offline") return "#3B82F6";
//   if (channel === "reserved") return "#7C3AED";
//   if (channel === "complimentary") return "#14B8A6";
//   return tierColor || "#BBF7D0";
// }

// function statusLabel(status: SeatStatus) {
//   return status === "sold" ? "Taken / Sold" : titleCase(status);
// }

// function channelLabel(channel: SeatSalesChannel) {
//   if (channel === "online") return "Online booking";
//   if (channel === "offline") return "Offline counter";
//   if (channel === "reserved") return "Reserved allocation";
//   if (channel === "complimentary") return "Complimentary";
//   return "No sale channel";
// }

// function objectLabel(type: CanvasObjectType, objects: CanvasObject[]) {
//   if (type === "stage") return "STAGE";
//   if (type === "entry") return `GATE ${objects.filter((object) => object.type === "entry").length + 1}`;
//   if (type === "exit") return "EXIT";
//   if (type === "standing") return `Standing Zone ${objects.filter((object) => object.type === "standing").length + 1}`;
//   if (type === "section-box") return `Section Block ${objects.filter((object) => object.type === "section-box").length + 1}`;
//   return "Instruction Label";
// }

// function createId(prefix: string) {
//   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
// }

// function titleCase(value: string) {
//   return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
// }

// function clamp(value: number, min: number, max: number) {
//   if (Number.isNaN(value)) return min;
//   return Math.min(max, Math.max(min, value));
// }

// function maybeSnap(value: number, canvas: SeatMapCanvasState) {
//   if (!canvas.snapToGrid) return value;
//   const grid = Math.max(0.5, canvas.gridSize);
//   return Math.round(value / grid) * grid;
// }

// function toggle(values: string[], value: string) {
//   return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
// }

// function normalizeBox(box: { x1: number; y1: number; x2: number; y2: number }) {
//   return { x1: Math.min(box.x1, box.x2), y1: Math.min(box.y1, box.y2), x2: Math.max(box.x1, box.x2), y2: Math.max(box.y1, box.y2) };
// }
"use client";

import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  Eye,
  FileJson,
  Grid3X3,
  Hand,
  HelpCircle,
  ImageIcon,
  Layers3,
  MapPin,
  Maximize2,
  MessageCircle,
  MousePointer2,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Square,
  Ticket,
  Trash2,
  Undo2,
  Upload,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createSupportTicketId,
  getAutoSupportPriority,
  getSupportTickets,
  getSupportTimestamp,
  saveSupportTickets,
  type SupportTicket,
} from "@/lib/supportTickets";

type BuilderRole = "super-admin" | "super_admin" | "admin" | "organizer" | "customer";
type MasterRole = "super-admin" | "admin";
type SeatTool =
  | "select"
  | "pan"
  | "seat"
  | "row"
  | "section"
  | "standing"
  | "stage"
  | "entry"
  | "exit"
  | "label"
  | "delete";
type InspectorTab = "properties" | "sections" | "tiers" | "templates" | "setup";
export type SeatStatus =
  | "available"
  | "blocked"
  | "reserved"
  | "sold"
  | "disabled"
  | "hold"
  | "vip"
  | "staff";
export type SeatSalesChannel = "online" | "offline" | "reserved" | "complimentary" | "none";
export type VenueType = "auditorium" | "concert" | "stadium" | "theatre" | "club" | "banquet" | "outdoor" | "custom";
type TemplateStatus = "draft" | "active" | "inactive" | "archived";
type SectionType = "seated" | "standing" | "vip" | "box" | "balcony";
type CanvasObjectType = "stage" | "entry" | "exit" | "label" | "standing" | "section-box";
type RowShape = "straight" | "arc" | "curve-left" | "curve-right";

export type SeatTier = {
  id: string;
  name: string;
  color: string;
  price: number;
  priceLabel: string;
  channel: SeatSalesChannel;
  description: string;
  active: boolean;
};

export type SeatSection = {
  id: string;
  name: string;
  type: SectionType;
  color: string;
  tierId: string;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
};

export type SeatNode = {
  id: string;
  label: string;
  sectionId: string;
  sectionName: string;
  row: string;
  number: string;
  x: number;
  y: number;
  radius: number;
  status: SeatStatus;
  channel: SeatSalesChannel;
  tierId: string;
  rotation: number;
  isAccessible: boolean;
  isCompanion: boolean;
  notes: string;
};

type CanvasObject = {
  id: string;
  type: CanvasObjectType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  text?: string;
  capacity?: number;
  tierId?: string;
  locked?: boolean;
};

type SeatMapCanvasState = {
  width: number;
  height: number;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  zoom: number;
  panX: number;
  panY: number;
};

export type SeatMapTemplate = {
  id: string;
  venueName: string;
  venueCode: string;
  city: string;
  address: string;
  venueType: VenueType;
  status: TemplateStatus;
  version: number;
  totalCapacity: number;
  allowOrganizerStructureEdits: boolean;
  isDefaultForOrganizers: boolean;
  sections: SeatSection[];
  tiers: SeatTier[];
  seats: SeatNode[];
  objects: CanvasObject[];
  canvas: SeatMapCanvasState;
  createdAt: string;
  updatedAt: string;
  createdByRole: MasterRole;
  updatedByRole: MasterRole;
  publishedAt?: string;
  publishedBy?: string;
};

export type SeatMapEventOverride = {
  id: string;
  templateId: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  statusOverrides: Record<string, SeatStatus>;
  channelOverrides: Record<string, SeatSalesChannel>;
  tierOverrides: Record<string, string>;
  notes: Record<string, string>;
  nodeOverrides?: Record<
    string,
    {
      status?: SeatStatus;
      tierId?: string;
      price?: number;
      notes?: string;
      gate?: string;
      salesChannel?:
        | "buizz_online"
        | "offline_counter"
        | "bookmyshow"
        | "external_partner"
        | "reserved"
        | "complimentary"
        | "none";
    }
  >;
  approvalStatus?: "Draft" | "Pending Review" | "Approved" | "Rejected";
  approvalNotes?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  tiers?: Array<{
    id: string;
    name: string;
    price: number;
    color: string;
    description?: string;
  }>;
  totalActiveSeats?: number;
  totalBlockedSeats?: number;
  totalReservedSeats?: number;
  updatedAt: string;
};

export type SeatMapCounts = {
  total: number;
  available: number;
  online: number;
  offline: number;
  reserved: number;
  blocked: number;
  sold: number;
  disabled: number;
  hold: number;
  vip: number;
  staff: number;
};

type DragState =
  | null
  | {
    kind: "seat" | "object" | "box" | "pan" | "resize-object";
    id?: string;
    startX: number;
    startY: number;
    startClientX: number;
    startClientY: number;
    startPanX?: number;
    startPanY?: number;
    originalSeats?: SeatNode[];
    originalObjects?: CanvasObject[];
    box?: { x1: number; y1: number; x2: number; y2: number };
  };

type SetupMode = "edit" | "scratch";
type OrganizerSeatPlan = "use-approved" | "not-needed" | "request-design";

const seatMapStorageKey = "buizz-seat-map-templates-v4-real-editor";
const selectedSeatMapStorageKey = "buizz-seat-map-selected-template-v4";
const organizerOverrideStorageKey = "buizz-seat-map-organizer-overrides-v4";
const dateSeed = "2026-06-28T09:00:00.000Z";

const statusOptions: SeatStatus[] = ["available", "blocked", "reserved", "sold", "disabled", "hold", "vip", "staff"];
const channelOptions: SeatSalesChannel[] = ["online", "offline", "reserved", "complimentary", "none"];
const venueTypes: VenueType[] = ["auditorium", "concert", "stadium", "theatre", "club", "banquet", "outdoor", "custom"];
const inspectorTabs: Array<{ id: InspectorTab; label: string }> = [
  { id: "properties", label: "Properties" },
  { id: "sections", label: "Sections" },
  { id: "tiers", label: "Tiers" },
  { id: "templates", label: "Templates" },
  { id: "setup", label: "Venue Setup" },
];

const toolItems: Array<{ id: SeatTool; label: string; help: string; icon: ReactNode }> = [
  { id: "select", label: "Select", help: "Select, drag, box-select", icon: <MousePointer2 className="size-4" /> },
  { id: "pan", label: "Pan", help: "Move around large layouts", icon: <Hand className="size-4" /> },
  { id: "seat", label: "Seat", help: "Drop or click one seat", icon: <Ticket className="size-4" /> },
  { id: "row", label: "Row", help: "Generate row from point", icon: <Grid3X3 className="size-4" /> },
  { id: "section", label: "Section", help: "Add seating section", icon: <Layers3 className="size-4" /> },
  { id: "standing", label: "Standing", help: "Add GA standing zone", icon: <Users className="size-4" /> },
  { id: "stage", label: "Stage", help: "Place stage marker", icon: <Square className="size-4" /> },
  { id: "entry", label: "Entry", help: "Gate label", icon: <Move className="size-4" /> },
  { id: "exit", label: "Exit", help: "Exit marker", icon: <X className="size-4" /> },
  { id: "label", label: "Label", help: "Instruction label", icon: <Edit3 className="size-4" /> },
  { id: "delete", label: "Delete", help: "Click object to remove", icon: <Trash2 className="size-4" /> },
];

export function SeatMapBuilderPage({ role }: { role: BuilderRole }) {
  const normalizedRole = role === "super_admin" ? "super-admin" : role;

  if (normalizedRole === "organizer") {
    return (
      <OrganizerSeatMapPersonalizationPanel
        eventId="event-live-in-concert"
        eventName="Live in Concert"
        organizerId="organizer-demo"
        mode="page"
      />
    );
  }

  return <MasterSeatMapEditor role={normalizedRole === "super-admin" ? "super-admin" : "admin"} />;
}

function MasterSeatMapEditor({ role }: { role: MasterRole }) {
  const [templates, setTemplates] = useState<SeatMapTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [tool, setTool] = useState<SeatTool>("select");
  const [tab, setTab] = useState<InspectorTab>("properties");
  const [message, setMessage] = useState("Venue setup is ready. Choose Edit Existing or Create from Scratch.");
  const [previewMode, setPreviewMode] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [setupMode, setSetupMode] = useState<SetupMode>("edit");
  const [rowForm, setRowForm] = useState({
    sectionId: "section-vip",
    row: "A",
    shape: "straight" as RowShape,
    startNo: 1,
    endNo: 12,
    direction: "left-to-right",
    startX: 35,
    startY: 34,
    spacing: 4.2,
    rowAngle: 0,
    arcDepth: 0,
    tierId: "tier-vip",
    status: "available" as SeatStatus,
    channel: "online" as SeatSalesChannel,
  });
  const [history, setHistory] = useState<SeatMapTemplate[]>([]);
  const [future, setFuture] = useState<SeatMapTemplate[]>([]);
  const [drag, setDrag] = useState<DragState>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loaded = readSeatMapTemplates();
    const selected = readSelectedTemplateId() || loaded.find((template) => template.status === "active")?.id || loaded[0]?.id || "";
    setTemplates(loaded);
    setSelectedId(selected);
  }, []);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedId) || templates[0] || createAuditoriumSeedTemplate(role);
  }, [role, selectedId, templates]);

  const selectedSeats = selectedTemplate.seats.filter((seat) => selectedSeatIds.includes(seat.id));
  const selectedObjects = selectedTemplate.objects.filter((object) => selectedObjectIds.includes(object.id));
  const selectedSections = selectedTemplate.sections.filter((section) => selectedSeats.some((seat) => seat.sectionId === section.id));
  const counts = getTemplateCounts(selectedTemplate);
  const rowsCount = new Set(selectedTemplate.seats.map((seat) => `${seat.sectionId}-${seat.row}`)).size;
  const canEditStructure = role === "super-admin" || selectedTemplate.status !== "active";

  const setupFormTemplate = selectedTemplate;

  useEffect(() => {
    saveSelectedTemplateId(selectedTemplate.id);
  }, [selectedTemplate.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceDown(true);
      if ((event.key === "Delete" || event.key === "Backspace") && (selectedSeatIds.length || selectedObjectIds.length)) {
        event.preventDefault();
        deleteSelected();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveDraft();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        redo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      }
      if (event.key === "Escape") {
        setSelectedSeatIds([]);
        setSelectedObjectIds([]);
        setTool("select");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [history, future, selectedObjectIds, selectedSeatIds, selectedTemplate, templates]);

  function syncTemplates(nextTemplates: SeatMapTemplate[], nextSelectedId = selectedTemplate.id) {
    setTemplates(nextTemplates);
    setSelectedId(nextSelectedId);
    writeSeatMapTemplates(nextTemplates);
  }

  function commit(nextTemplate: SeatMapTemplate, notice?: string) {
    const normalized = normalizeTemplate({
      ...nextTemplate,
      updatedAt: new Date().toISOString(),
      updatedByRole: role,
    });
    setHistory((current) => [selectedTemplate, ...current].slice(0, 50));
    setFuture([]);
    syncTemplates([normalized, ...templates.filter((template) => template.id !== normalized.id)], normalized.id);
    if (notice) setMessage(notice);
  }

  function patchTemplate(patch: Partial<SeatMapTemplate>, notice?: string) {
    commit({ ...selectedTemplate, ...patch }, notice);
  }

  function updateCanvas(patch: Partial<SeatMapCanvasState>) {
    commit({ ...selectedTemplate, canvas: { ...selectedTemplate.canvas, ...patch } });
  }

  function undo() {
    const previous = history[0];
    if (!previous) {
      setMessage("Nothing to undo.");
      return;
    }
    setFuture((current) => [selectedTemplate, ...current].slice(0, 50));
    setHistory((current) => current.slice(1));
    syncTemplates([previous, ...templates.filter((template) => template.id !== previous.id)], previous.id);
    setMessage("Undo applied.");
  }

  function redo() {
    const next = future[0];
    if (!next) {
      setMessage("Nothing to redo.");
      return;
    }
    setHistory((current) => [selectedTemplate, ...current].slice(0, 50));
    setFuture((current) => current.slice(1));
    syncTemplates([next, ...templates.filter((template) => template.id !== next.id)], next.id);
    setMessage("Redo applied.");
  }

  function saveDraft() {
    const draft = { ...selectedTemplate, status: selectedTemplate.status === "archived" ? "draft" : selectedTemplate.status, updatedAt: new Date().toISOString(), updatedByRole: role };
    syncTemplates([draft, ...templates.filter((template) => template.id !== draft.id)], draft.id);
    setMessage("Draft saved. This template will stay as default source for organizer copies once published.");
  }

  function publishTemplate() {
    const issues = validateTemplate(selectedTemplate);
    if (issues.length) {
      setMessage(issues[0]);
      return;
    }
    const published: SeatMapTemplate = {
      ...selectedTemplate,
      status: "active",
      isDefaultForOrganizers: true,
      publishedAt: new Date().toISOString(),
      publishedBy: role,
      updatedAt: new Date().toISOString(),
      updatedByRole: role,
    };
    const next = templates.map((template) => ({ ...template, isDefaultForOrganizers: template.id === published.id }));
    syncTemplates([published, ...next.filter((template) => template.id !== published.id)], published.id);
    setMessage("Published as organizer default master map. Organizers will edit only event-specific seat usage/availability.");
  }

  function createFromScratch() {
    const scratch = createScratchTemplate(role, setupFormTemplate);
    syncTemplates([scratch, ...templates], scratch.id);
    setSelectedSeatIds([]);
    setSelectedObjectIds([]);
    setTool("select");
    setSetupMode("scratch");
    setSetupOpen(false);
    setMessage("Blank canvas created. Add stage, sections, rows, seats, labels, and gates.");
  }

  function loadAuditoriumStarter() {
    const starter = createAuditoriumSeedTemplate(role);
    const readyTemplate = normalizeTemplate({
      ...starter,
      id: createId("venue-template"),
      venueName: selectedTemplate.venueName.trim() || starter.venueName,
      venueCode: selectedTemplate.venueCode.trim() || starter.venueCode,
      city: selectedTemplate.city.trim() || starter.city,
      address: selectedTemplate.address.trim() || starter.address,
      venueType: selectedTemplate.venueType || starter.venueType,
      status: "draft",
      version: Math.max(1, selectedTemplate.version + 1),
      isDefaultForOrganizers: false,
      allowOrganizerStructureEdits: selectedTemplate.allowOrganizerStructureEdits,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByRole: role,
      updatedByRole: role,
      publishedAt: undefined,
      publishedBy: undefined,
    });

    syncTemplates([readyTemplate, ...templates], readyTemplate.id);
    setSelectedSeatIds([]);
    setSelectedObjectIds([]);
    setTool("select");
    setSetupOpen(false);
    setMessage("Ready auditorium starter loaded. You can now edit sections, rows, colors, gates, and seat allocation.");
  }

  function duplicateTemplate(template = selectedTemplate) {
    const copy: SeatMapTemplate = {
      ...template,
      id: createId("venue-template"),
      venueName: `${template.venueName} Copy`,
      venueCode: `${template.venueCode}-COPY`,
      status: "draft",
      version: template.version + 1,
      isDefaultForOrganizers: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByRole: role,
      updatedByRole: role,
      publishedAt: undefined,
      publishedBy: undefined,
    };
    syncTemplates([copy, ...templates], copy.id);
    setMessage("Template duplicated for editing.");
  }

  function archiveTemplate(template = selectedTemplate) {
    const archived = { ...template, status: "archived" as TemplateStatus, isDefaultForOrganizers: false, updatedAt: new Date().toISOString() };
    syncTemplates([archived, ...templates.filter((item) => item.id !== template.id)], archived.id);
    setMessage("Template archived.");
  }

  function addSeatAt(x: number, y: number) {
    const section = selectedTemplate.sections.find((item) => item.id === rowForm.sectionId) || selectedTemplate.sections[0] || createDefaultSection();
    const tier = selectedTemplate.tiers.find((item) => item.id === rowForm.tierId) || selectedTemplate.tiers[0] || createDefaultTier();
    const seat: SeatNode = {
      id: createId("seat"),
      label: `${rowForm.row}${selectedTemplate.seats.length + 1}`,
      sectionId: section.id,
      sectionName: section.name,
      row: rowForm.row,
      number: String(selectedTemplate.seats.filter((item) => item.row === rowForm.row && item.sectionId === section.id).length + 1),
      x: maybeSnap(x, selectedTemplate.canvas),
      y: maybeSnap(y, selectedTemplate.canvas),
      radius: 1.45,
      status: rowForm.status,
      channel: rowForm.channel,
      tierId: tier.id,
      rotation: 0,
      isAccessible: false,
      isCompanion: false,
      notes: "",
    };
    commit({ ...selectedTemplate, seats: [...selectedTemplate.seats, seat] }, "Seat added.");
    setSelectedSeatIds([seat.id]);
    setSelectedObjectIds([]);
  }

  function generateRowAt(x = rowForm.startX, y = rowForm.startY) {
    const section = selectedTemplate.sections.find((item) => item.id === rowForm.sectionId) || selectedTemplate.sections[0] || createDefaultSection();
    const tier = selectedTemplate.tiers.find((item) => item.id === rowForm.tierId) || selectedTemplate.tiers[0] || createDefaultTier();
    const seats = buildRowSeats({
      section,
      row: rowForm.row,
      startNo: Number(rowForm.startNo),
      endNo: Number(rowForm.endNo),
      startX: x,
      startY: y,
      spacing: Number(rowForm.spacing),
      rowAngle: Number(rowForm.rowAngle),
      arcDepth: Number(rowForm.arcDepth),
      shape: rowForm.shape,
      tier,
      status: rowForm.status,
      channel: rowForm.channel,
      reverse: rowForm.direction === "right-to-left",
    });
    commit({ ...selectedTemplate, seats: mergeSeats(selectedTemplate.seats, seats) }, "Row generated. Seats are now draggable and editable.");
    setSelectedSeatIds(seats.map((seat) => seat.id));
    setSelectedObjectIds([]);
  }

  function addCanvasObject(type: CanvasObjectType, x: number, y: number) {
    const object: CanvasObject = {
      id: createId(type),
      type,
      label: objectLabel(type, selectedTemplate.objects),
      x: maybeSnap(x, selectedTemplate.canvas),
      y: maybeSnap(y, selectedTemplate.canvas),
      width: type === "stage" ? 18 : type === "section-box" ? 24 : type === "standing" ? 20 : type === "label" ? 18 : 9,
      height: type === "stage" ? 7 : type === "section-box" ? 14 : type === "standing" ? 14 : type === "label" ? 7 : 5,
      rotation: 0,
      color: type === "stage" ? "#111827" : type === "standing" ? "#F59E0B" : type === "section-box" ? "#E879F9" : type === "exit" ? "#F97316" : "#22C55E",
      text: type === "label" ? "Booking instruction label" : undefined,
      capacity: type === "standing" ? 100 : undefined,
      tierId: selectedTemplate.tiers[0]?.id,
      locked: false,
    };
    commit({ ...selectedTemplate, objects: [...selectedTemplate.objects, object] }, `${object.label} added.`);
    setSelectedObjectIds([object.id]);
    setSelectedSeatIds([]);
  }

  function addSectionAt(x: number, y: number) {
    const tier = selectedTemplate.tiers.find((item) => item.id === rowForm.tierId) || selectedTemplate.tiers[0] || createDefaultTier();
    const section: SeatSection = {
      id: createId("section"),
      name: `Section ${selectedTemplate.sections.length + 1}`,
      type: "seated",
      color: tier.color,
      tierId: tier.id,
      capacity: 0,
      x: maybeSnap(x, selectedTemplate.canvas),
      y: maybeSnap(y, selectedTemplate.canvas),
      width: 24,
      height: 16,
      rotation: 0,
      locked: false,
    };
    const object: CanvasObject = {
      id: createId("section-box"),
      type: "section-box",
      label: section.name,
      x: section.x,
      y: section.y,
      width: section.width,
      height: section.height,
      rotation: 0,
      color: section.color,
      tierId: tier.id,
    };
    commit({ ...selectedTemplate, sections: [...selectedTemplate.sections, section], objects: [...selectedTemplate.objects, object] }, "Section added. Now add rows/seats inside it.");
    setRowForm((current) => ({ ...current, sectionId: section.id, tierId: tier.id }));
    setSelectedObjectIds([object.id]);
  }

  function deleteSelected() {
    if (!selectedSeatIds.length && !selectedObjectIds.length) {
      setMessage("Select seats or objects before deleting.");
      return;
    }
    commit(
      {
        ...selectedTemplate,
        seats: selectedTemplate.seats.filter((seat) => !selectedSeatIds.includes(seat.id)),
        objects: selectedTemplate.objects.filter((object) => !selectedObjectIds.includes(object.id)),
      },
      "Selected items deleted.",
    );
    setSelectedSeatIds([]);
    setSelectedObjectIds([]);
    setTool("select");
  }

  function duplicateSelected() {
    const seats = selectedTemplate.seats.filter((seat) => selectedSeatIds.includes(seat.id));
    const objects = selectedTemplate.objects.filter((object) => selectedObjectIds.includes(object.id));
    const copiedSeats = seats.map((seat) => ({ ...seat, id: createId("seat"), label: `${seat.label} copy`, x: clamp(seat.x + 2, 2, 98), y: clamp(seat.y + 2, 2, 98), number: `${seat.number}C` }));
    const copiedObjects = objects.map((object) => ({ ...object, id: createId(object.type), label: `${object.label} Copy`, x: clamp(object.x + 2, 2, 98), y: clamp(object.y + 2, 2, 98) }));
    if (!copiedSeats.length && !copiedObjects.length) {
      setMessage("Select seats or objects before duplicating.");
      return;
    }
    commit({ ...selectedTemplate, seats: [...selectedTemplate.seats, ...copiedSeats], objects: [...selectedTemplate.objects, ...copiedObjects] }, "Selected items duplicated.");
    setSelectedSeatIds(copiedSeats.map((seat) => seat.id));
    setSelectedObjectIds(copiedObjects.map((object) => object.id));
  }

  function bulkPatchSeats(patch: Partial<SeatNode>) {
    if (!selectedSeatIds.length) {
      setMessage("Select seats first.");
      return;
    }
    commit(
      {
        ...selectedTemplate,
        seats: selectedTemplate.seats.map((seat) => (selectedSeatIds.includes(seat.id) ? { ...seat, ...patch } : seat)),
      },
      `${selectedSeatIds.length} selected seats updated.`,
    );
  }

  function updateSection(sectionId: string, patch: Partial<SeatSection>) {
    commit({
      ...selectedTemplate,
      sections: selectedTemplate.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
      seats: patch.name
        ? selectedTemplate.seats.map((seat) => (seat.sectionId === sectionId ? { ...seat, sectionName: String(patch.name) } : seat))
        : selectedTemplate.seats,
    });
  }

  function addTier() {
    const tier: SeatTier = {
      id: createId("tier"),
      name: `Tier ${selectedTemplate.tiers.length + 1}`,
      color: "#EC1B72",
      price: 999,
      priceLabel: "₹999",
      channel: "online",
      description: "New pricing tier",
      active: true,
    };
    commit({ ...selectedTemplate, tiers: [...selectedTemplate.tiers, tier] }, "Tier added.");
  }

  function updateTier(tierId: string, patch: Partial<SeatTier>) {
    commit({ ...selectedTemplate, tiers: selectedTemplate.tiers.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)) });
  }

  function deleteTier(tierId: string) {
    if (selectedTemplate.seats.some((seat) => seat.tierId === tierId)) {
      setMessage("This tier is assigned to seats. Reassign those seats before deleting.");
      return;
    }
    commit({ ...selectedTemplate, tiers: selectedTemplate.tiers.filter((tier) => tier.id !== tierId) }, "Tier deleted.");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(selectedTemplate, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate.venueName.replace(/\s+/g, "-").toLowerCase()}-seat-map.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Seat map JSON exported.");
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SeatMapTemplate;
        const imported = normalizeTemplate({ ...parsed, id: createId("venue-template"), status: "draft", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), createdByRole: role, updatedByRole: role });
        syncTemplates([imported, ...templates], imported.id);
        setMessage("Seat map JSON imported as draft.");
      } catch {
        setMessage("Could not import JSON. Please check the file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function updateSetupTemplate(patch: Partial<SeatMapTemplate>) {
    const next = { ...selectedTemplate, ...patch, updatedAt: new Date().toISOString() };
    syncTemplates([next, ...templates.filter((template) => template.id !== next.id)], next.id);
  }

  function pointerToPercent(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const zoom = selectedTemplate.canvas.zoom;
    const rawX = event.clientX - rect.left - selectedTemplate.canvas.panX;
    const rawY = event.clientY - rect.top - selectedTemplate.canvas.panY;
    return {
      x: clamp((rawX / zoom / rect.width) * 100, 0, 100),
      y: clamp((rawY / zoom / rect.height) * 100, 0, 100),
    };
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointerToPercent(event);
    if (previewMode) return;
    if (spaceDown || tool === "pan") {
      setDrag({ kind: "pan", startX: point.x, startY: point.y, startClientX: event.clientX, startClientY: event.clientY, startPanX: selectedTemplate.canvas.panX, startPanY: selectedTemplate.canvas.panY });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === "seat") {
      addSeatAt(point.x, point.y);
      return;
    }
    if (tool === "row") {
      generateRowAt(point.x, point.y);
      return;
    }
    if (tool === "section") {
      addSectionAt(point.x, point.y);
      return;
    }
    if (tool === "standing") {
      addCanvasObject("standing", point.x, point.y);
      return;
    }
    if (tool === "stage") {
      addCanvasObject("stage", point.x, point.y);
      return;
    }
    if (tool === "entry" || tool === "exit" || tool === "label") {
      addCanvasObject(tool === "entry" ? "entry" : tool === "exit" ? "exit" : "label", point.x, point.y);
      return;
    }
    if (tool === "delete") {
      setMessage("Delete tool is active. Click a seat/object or use Delete selected after selecting items.");
      return;
    }
    setSelectedSeatIds([]);
    setSelectedObjectIds([]);
    setDrag({ kind: "box", startX: point.x, startY: point.y, startClientX: event.clientX, startClientY: event.clientY, box: { x1: point.x, y1: point.y, x2: point.x, y2: point.y } });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSeatPointerDown(event: ReactPointerEvent<HTMLButtonElement>, seatId: string) {
    event.stopPropagation();
    if (previewMode) return;
    if (tool === "delete") {
      commit({ ...selectedTemplate, seats: selectedTemplate.seats.filter((seat) => seat.id !== seatId) }, "Seat deleted.");
      setTool("select");
      return;
    }
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    setSelectedSeatIds((current) => (additive ? toggle(current, seatId) : current.includes(seatId) ? current : [seatId]));
    setSelectedObjectIds([]);
    const point = pointerToPercent(event as unknown as ReactPointerEvent<HTMLDivElement>);
    const selectedSet = selectedSeatIds.includes(seatId) ? selectedSeatIds : [seatId];
    setDrag({
      kind: "seat",
      id: seatId,
      startX: point.x,
      startY: point.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalSeats: selectedTemplate.seats.filter((seat) => selectedSet.includes(seat.id)),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleObjectPointerDown(event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>, objectId: string) {
    event.stopPropagation();
    if (previewMode) return;
    if (tool === "delete") {
      commit({ ...selectedTemplate, objects: selectedTemplate.objects.filter((object) => object.id !== objectId) }, "Object deleted.");
      setTool("select");
      return;
    }
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    setSelectedObjectIds((current) => (additive ? toggle(current, objectId) : current.includes(objectId) ? current : [objectId]));
    setSelectedSeatIds([]);
    const point = pointerToPercent(event as unknown as ReactPointerEvent<HTMLDivElement>);
    setDrag({
      kind: "object",
      id: objectId,
      startX: point.x,
      startY: point.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalObjects: selectedTemplate.objects.filter((object) => object.id === objectId),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeObjectPointerDown(event: ReactPointerEvent<HTMLSpanElement>, objectId: string) {
    event.stopPropagation();
    const point = pointerToPercent(event as unknown as ReactPointerEvent<HTMLDivElement>);
    setDrag({
      kind: "resize-object",
      id: objectId,
      startX: point.x,
      startY: point.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalObjects: selectedTemplate.objects.filter((object) => object.id === objectId),
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const point = pointerToPercent(event);
    if (drag.kind === "box") {
      setDrag({ ...drag, box: { x1: drag.startX, y1: drag.startY, x2: point.x, y2: point.y } });
      return;
    }
    if (drag.kind === "pan") {
      updateCanvasFast({ panX: (drag.startPanX ?? 0) + event.clientX - drag.startClientX, panY: (drag.startPanY ?? 0) + event.clientY - drag.startClientY });
      return;
    }
    if (drag.kind === "seat" && drag.originalSeats) {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      const movingIds = new Set(drag.originalSeats.map((seat) => seat.id));
      const originals = new Map(drag.originalSeats.map((seat) => [seat.id, seat]));
      updateTemplateFast({
        ...selectedTemplate,
        seats: selectedTemplate.seats.map((seat) => {
          if (!movingIds.has(seat.id)) return seat;
          const original = originals.get(seat.id) ?? seat;
          return { ...seat, x: maybeSnap(clamp(original.x + dx, 1, 99), selectedTemplate.canvas), y: maybeSnap(clamp(original.y + dy, 1, 99), selectedTemplate.canvas) };
        }),
      });
    }
    if (drag.kind === "object" && drag.originalObjects) {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      const original = drag.originalObjects[0];
      if (!original) return;
      updateTemplateFast({
        ...selectedTemplate,
        objects: selectedTemplate.objects.map((object) => (object.id === original.id ? { ...object, x: maybeSnap(clamp(original.x + dx, 1, 99), selectedTemplate.canvas), y: maybeSnap(clamp(original.y + dy, 1, 99), selectedTemplate.canvas) } : object)),
      });
    }
    if (drag.kind === "resize-object" && drag.originalObjects) {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      const original = drag.originalObjects[0];
      if (!original) return;
      updateTemplateFast({
        ...selectedTemplate,
        objects: selectedTemplate.objects.map((object) => (object.id === original.id ? { ...object, width: clamp(original.width + dx, 4, 70), height: clamp(original.height + dy, 4, 70) } : object)),
      });
    }
  }

  function handlePointerUp() {
    if (!drag) return;
    if (drag.kind === "box" && drag.box) {
      const box = normalizeBox(drag.box);
      const seatsInBox = selectedTemplate.seats.filter((seat) => seat.x >= box.x1 && seat.x <= box.x2 && seat.y >= box.y1 && seat.y <= box.y2).map((seat) => seat.id);
      setSelectedSeatIds(seatsInBox);
      setMessage(seatsInBox.length ? `${seatsInBox.length} seats selected.` : "No seats inside selection.");
    } else if (drag.kind !== "pan") {
      setHistory((current) => [selectedTemplate, ...current].slice(0, 50));
      saveCurrentTemplateFast();
    } else {
      saveCurrentTemplateFast();
    }
    setDrag(null);
  }

  function updateTemplateFast(nextTemplate: SeatMapTemplate) {
    const normalized = normalizeTemplate({ ...nextTemplate, updatedAt: new Date().toISOString() });
    setTemplates((current) => [normalized, ...current.filter((template) => template.id !== normalized.id)]);
  }

  function updateCanvasFast(patch: Partial<SeatMapCanvasState>) {
    updateTemplateFast({ ...selectedTemplate, canvas: { ...selectedTemplate.canvas, ...patch } });
  }

  function saveCurrentTemplateFast() {
    const current = templates.find((template) => template.id === selectedTemplate.id) || selectedTemplate;
    writeSeatMapTemplates([current, ...templates.filter((template) => template.id !== current.id)]);
  }

  const summaryCards = [
    { label: "Venue Name", value: selectedTemplate.venueName },
    { label: "City", value: selectedTemplate.city },
    { label: "Venue Type", value: selectedTemplate.venueType },
    { label: "Total Capacity", value: String(selectedTemplate.totalCapacity) },
    { label: "Sections", value: String(selectedTemplate.sections.length) },
    { label: "Rows", value: String(rowsCount) },
    { label: "Seats", value: String(selectedTemplate.seats.length) },
    { label: "Status", value: titleCase(selectedTemplate.status) },
  ];

  return (
    <section className="mx-auto grid w-full max-w-full min-w-0 gap-4 overflow-x-hidden text-slate-950 xl:max-w-[1720px]">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{role === "super-admin" ? "Super Admin Panel" : "Admin Panel"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#EC1B72] to-[#7C2BD9] text-white shadow-lg shadow-pink-200">
                <Layers3 className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">Master Seat Map Editor</h1>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Create reusable venue seat structures, then publish a locked master map for organizers to allocate online/offline/reserved seats.</p>
              </div>
              <StatusPill label={titleCase(selectedTemplate.status)} tone={selectedTemplate.status === "active" ? "success" : "warning"} />
              <StatusPill label={message ? "Auto-saved" : "Ready"} tone="success" />
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
            <ToolbarButton onClick={undo} disabled={!history.length} icon={<Undo2 className="size-4" />}>Undo</ToolbarButton>
            <ToolbarButton onClick={redo} disabled={!future.length} icon={<Redo2 className="size-4" />}>Redo</ToolbarButton>
            <ToolbarButton onClick={() => setPreviewMode((value) => !value)} icon={<Eye className="size-4" />}>{previewMode ? "Exit Preview" : "Preview as Customer"}</ToolbarButton>
            <ToolbarButton onClick={() => updateCanvas({ zoom: 1, panX: 0, panY: 0 })} icon={<Maximize2 className="size-4" />}>Fit to Screen</ToolbarButton>
            <ZoomControl
              zoom={selectedTemplate.canvas.zoom}
              onZoomOut={() => updateCanvas({ zoom: clamp(selectedTemplate.canvas.zoom - 0.1, 0.45, 2.2) })}
              onZoomIn={() => updateCanvas({ zoom: clamp(selectedTemplate.canvas.zoom + 0.1, 0.45, 2.2) })}
            />
            <ToolbarButton onClick={saveDraft} icon={<Save className="size-4" />}>Save Draft</ToolbarButton>
            <PrimaryButton onClick={publishTemplate} icon={<ShieldCheck className="size-4" />}>Publish Template</PrimaryButton>
          </div>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3 text-sm font-bold text-[#15803D]">{message}</p> : null}
      </section>

      {setupOpen ? (
        <VenueSetupCard
          template={setupFormTemplate}
          mode={setupMode}
          templates={templates}
          onMode={setSetupMode}
          onPatch={updateSetupTemplate}
          onSelectTemplate={(id) => {
            setSelectedId(id);
            setSetupMode("edit");
            setMessage("Existing design loaded for editing.");
          }}
          onStartScratch={createFromScratch}
          onLoadStarter={loadAuditoriumStarter}
          onClose={() => setSetupOpen(false)}
        />
      ) : (
        <button type="button" onClick={() => setSetupOpen(true)} className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-[#EC1B72] hover:text-[#EC1B72]">
          Venue setup / Create from scratch
        </button>
      )}

      <section className="grid min-w-0 grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4 xl:grid-cols-8">
        {summaryCards.map((card) => <SummaryTile key={card.label} label={card.label} value={card.value} />)}
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_370px]">
        <aside className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="p-4 xl:max-h-[calc(100dvh-210px)] xl:overflow-y-auto">
            <PanelTitle title="Tools" subtitle="Drag or click to place editor objects." />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {toolItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canEditStructure && item.id !== "select" && item.id !== "pan"}
                  onClick={() => {
                    setTool(item.id);
                    setMessage(item.id === "delete" ? "Delete tool active. Click a seat/object to delete. Tool returns to Select after delete." : `${item.label} tool active. Use it on the canvas.`);
                  }}
                  className={`min-h-[78px] rounded-2xl border p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[86px] sm:p-3 ${tool === item.id ? "border-[#EC1B72] bg-[#EC1B72]/5 text-[#EC1B72] shadow-[0_10px_24px_rgba(236,27,114,0.12)]" : "border-slate-200 bg-white text-slate-800 hover:border-[#EC1B72]/50"}`}
                >
                  <span className="block">{item.icon}</span>
                  <span className="mt-2 block text-xs font-black">{item.label}</span>
                  <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">{item.help}</span>
                </button>
              ))}
            </div>

            <EditorCard title="Row Generator">
              <SelectInput label="Section" value={rowForm.sectionId} options={selectedTemplate.sections.map((section) => ({ value: section.id, label: section.name }))} onChange={(value) => setRowForm((current) => ({ ...current, sectionId: value }))} />
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="Row" value={rowForm.row} onChange={(value) => setRowForm((current) => ({ ...current, row: value.toUpperCase().slice(0, 3) }))} />
                <SelectInput label="Shape" value={rowForm.shape} options={["straight", "arc", "curve-left", "curve-right"].map((item) => ({ value: item, label: item }))} onChange={(value) => setRowForm((current) => ({ ...current, shape: value as RowShape }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="Start No." type="number" value={String(rowForm.startNo)} onChange={(value) => setRowForm((current) => ({ ...current, startNo: Number(value) }))} />
                <TextInput label="End No." type="number" value={String(rowForm.endNo)} onChange={(value) => setRowForm((current) => ({ ...current, endNo: Number(value) }))} />
              </div>
              <SelectInput label="Direction" value={rowForm.direction} options={[{ value: "left-to-right", label: "left-to-right" }, { value: "right-to-left", label: "right-to-left" }]} onChange={(value) => setRowForm((current) => ({ ...current, direction: value }))} />
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="Start X %" type="number" value={String(rowForm.startX)} onChange={(value) => setRowForm((current) => ({ ...current, startX: Number(value) }))} />
                <TextInput label="Start Y %" type="number" value={String(rowForm.startY)} onChange={(value) => setRowForm((current) => ({ ...current, startY: Number(value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="Seat Spacing %" type="number" value={String(rowForm.spacing)} onChange={(value) => setRowForm((current) => ({ ...current, spacing: Number(value) }))} />
                <TextInput label="Row Angle" type="number" value={String(rowForm.rowAngle)} onChange={(value) => setRowForm((current) => ({ ...current, rowAngle: Number(value) }))} />
              </div>
              <TextInput label="Arc Depth" type="number" value={String(rowForm.arcDepth)} onChange={(value) => setRowForm((current) => ({ ...current, arcDepth: Number(value) }))} />
              <SelectInput label="Tier" value={rowForm.tierId} options={selectedTemplate.tiers.map((tier) => ({ value: tier.id, label: `${tier.name} ${tier.priceLabel}` }))} onChange={(value) => setRowForm((current) => ({ ...current, tierId: value }))} />
              <div className="grid grid-cols-2 gap-2">
                <SelectInput label="Status" value={rowForm.status} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => setRowForm((current) => ({ ...current, status: value as SeatStatus }))} />
                <SelectInput label="Channel" value={rowForm.channel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => setRowForm((current) => ({ ...current, channel: value as SeatSalesChannel }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ToolbarButton onClick={() => generateRowAt(rowForm.startX, rowForm.startY)} icon={<Plus className="size-4" />}>Generate</ToolbarButton>
                <ToolbarButton onClick={() => setSelectedSeatIds([])} icon={<RotateCcw className="size-4" />}>Clear</ToolbarButton>
              </div>
            </EditorCard>

            <EditorCard title="Quick Actions">
              <ToolbarButton onClick={loadAuditoriumStarter} icon={<Layers3 className="size-4" />}>Load auditorium starter</ToolbarButton>
              <ToolbarButton onClick={() => { setTool("stage"); setMessage("Stage tool active. Click the canvas to place another stage."); }} icon={<Square className="size-4" />}>Add stage</ToolbarButton>
              <ToolbarButton onClick={() => { setTool("entry"); setMessage("Entry tool active. Click the canvas to place a gate."); }} icon={<Move className="size-4" />}>Add gate</ToolbarButton>
              <ToolbarButton onClick={() => setSelectedSeatIds(selectedTemplate.seats.map((seat) => seat.id))} icon={<MousePointer2 className="size-4" />}>Select all seats</ToolbarButton>
              <ToolbarButton onClick={duplicateSelected} icon={<Copy className="size-4" />}>Duplicate selected</ToolbarButton>
              <ToolbarButton onClick={deleteSelected} icon={<Trash2 className="size-4" />}>Delete selected</ToolbarButton>
              <div className="grid grid-cols-2 gap-2">
                <ToolbarButton onClick={exportJson} icon={<Download className="size-4" />}>Export JSON</ToolbarButton>
                <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<Upload className="size-4" />}>Import JSON</ToolbarButton>
              </div>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
            </EditorCard>
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMessage("Main Floor selected. Multi-floor support is API-ready and can be connected later.")} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800">
                Main Floor <ChevronDown className="size-4" />
              </button>
              <ChipButton active={selectedTemplate.canvas.showGrid} onClick={() => updateCanvas({ showGrid: !selectedTemplate.canvas.showGrid })}>Grid</ChipButton>
              <ChipButton active={selectedTemplate.canvas.snapToGrid} onClick={() => updateCanvas({ snapToGrid: !selectedTemplate.canvas.snapToGrid })}>Snap</ChipButton>
            </div>
            <p className="hidden text-xs font-black text-slate-500 lg:block">
              {previewMode ? "Customer preview: only available online seats are selectable." : "Click seats or drag to select multiple seats."}
            </p>
            <ToolbarButton onClick={() => updateCanvas({ panX: 0, panY: 0, zoom: 1 })} icon={<RotateCcw className="size-4" />}>Reset</ToolbarButton>
          </div>

          <div
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative min-h-[430px] touch-none overflow-hidden rounded-[22px] border border-slate-200 bg-[#FBFCFE] sm:min-h-[560px] xl:min-h-[680px] ${spaceDown || tool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
          >
            {selectedTemplate.canvas.showGrid ? <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)", backgroundSize: "28px 28px" }} /> : null}
            <div
              className="absolute inset-0 origin-top-left"
              style={{ transform: `translate(${selectedTemplate.canvas.panX}px, ${selectedTemplate.canvas.panY}px) scale(${selectedTemplate.canvas.zoom})` }}
            >
              {selectedTemplate.objects.map((object) => {
                const selected = selectedObjectIds.includes(object.id);
                return (
                  <div
                    key={object.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(event) => handleObjectPointerDown(event, object.id)}
                    className={`absolute select-none ${selected ? "z-30 ring-2 ring-[#EC1B72] ring-offset-2" : "z-10"}`}
                    style={{
                      left: `${object.x}%`,
                      top: `${object.y}%`,
                      width: `${object.width}%`,
                      height: `${object.height}%`,
                      transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
                    }}
                  >
                    <CanvasObjectView object={object} />
                    {selected && !previewMode ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onPointerDown={(event) => handleResizeObjectPointerDown(event, object.id)}
                        className="absolute -bottom-2 -right-2 z-40 size-4 rounded-full border-2 border-white bg-[#EC1B72] shadow"
                        title="Resize"
                      />
                    ) : null}
                  </div>
                );
              })}

              {selectedTemplate.sections.map((section) => (
                <div key={section.id} className="pointer-events-none absolute rounded-3xl border-2 border-dashed opacity-20" style={{ borderColor: section.color, left: `${section.x}%`, top: `${section.y}%`, width: `${section.width}%`, height: `${section.height}%`, transform: `translate(-50%, -50%) rotate(${section.rotation}deg)` }} />
              ))}

              {selectedTemplate.seats.map((seat) => {
                const selected = selectedSeatIds.includes(seat.id);
                const tier = selectedTemplate.tiers.find((item) => item.id === seat.tierId);
                const disabledInPreview = previewMode && (seat.status !== "available" || seat.channel !== "online");
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={disabledInPreview}
                    onPointerDown={(event) => handleSeatPointerDown(event, seat.id)}
                    className={`absolute grid place-items-center rounded-full border text-[10px] font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "z-40 border-[#EC1B72] bg-[#EC1B72] text-white ring-2 ring-[#EC1B72]/30" : "border-white"}`}
                    style={{
                      left: `${seat.x}%`,
                      top: `${seat.y}%`,
                      width: `${seat.radius * 2.15}%`,
                      height: `${seat.radius * 2.15}%`,
                      minWidth: 22,
                      minHeight: 22,
                      transform: `translate(-50%, -50%) rotate(${seat.rotation}deg)`,
                      backgroundColor: selected ? "#EC1B72" : statusColor(seat.status, tier?.color, seat.channel),
                      color: selected || seat.status !== "available" || seat.channel !== "online" ? "#FFFFFF" : "#047857",
                    }}
                    title={`${seat.sectionName} ${seat.row}-${seat.number} • ${statusLabel(seat.status)} • ${channelLabel(seat.channel)}`}
                  >
                    {seat.number}
                  </button>
                );
              })}
            </div>

            {drag?.kind === "box" && drag.box ? <SelectionBox box={drag.box} /> : null}
            <CanvasLegend />
            <div className="absolute bottom-3 right-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
              Tool: {tool} • {selectedSeatIds.length} seats • {selectedObjectIds.length} objects
            </div>
          </div>
        </main>

        <aside className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-2">
            <div className="flex gap-1 overflow-x-auto">
              {inspectorTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold transition ${tab === item.id ? "bg-white text-[#EC1B72] shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
                >
                  {item.label}
                  {tab === item.id ? <span className="absolute inset-x-4 -bottom-2 h-1 rounded-full bg-gradient-to-r from-[#EC1B72] to-[#7C2BD9]" /> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 xl:max-h-[calc(100dvh-230px)] xl:overflow-y-auto">
            {tab === "properties" ? (
              <PropertiesInspector
                template={selectedTemplate}
                selectedSeats={selectedSeats}
                selectedObjects={selectedObjects}
                onPatchTemplate={patchTemplate}
                onPatchSeats={bulkPatchSeats}
                onPatchObject={(objectId, patch) => commit({ ...selectedTemplate, objects: selectedTemplate.objects.map((object) => (object.id === objectId ? { ...object, ...patch } : object)) }, "Object updated.")}
                onDelete={deleteSelected}
              />
            ) : null}
            {tab === "sections" ? (
              <SectionsPanel
                template={selectedTemplate}
                selectedSections={selectedSections}
                onUpdateSection={updateSection}
                onAddSection={() => addSectionAt(20 + selectedTemplate.sections.length * 8, 55)}
                onSelectSection={(sectionId) => setSelectedSeatIds(selectedTemplate.seats.filter((seat) => seat.sectionId === sectionId).map((seat) => seat.id))}
              />
            ) : null}
            {tab === "tiers" ? (
              <TiersPanel template={selectedTemplate} selectedSeatIds={selectedSeatIds} onAddTier={addTier} onUpdateTier={updateTier} onDeleteTier={deleteTier} onAssignTier={(tierId) => bulkPatchSeats({ tierId })} />
            ) : null}
            {tab === "templates" ? (
              <TemplatesPanel templates={templates} selectedId={selectedTemplate.id} onSelect={setSelectedId} onDuplicate={duplicateTemplate} onArchive={archiveTemplate} onPublish={publishTemplate} onExport={exportJson} onImport={() => fileInputRef.current?.click()} />
            ) : null}
            {tab === "setup" ? (
              <VenueSetupPanel template={selectedTemplate} onPatch={updateSetupTemplate} onScratch={createFromScratch} onLoadStarter={loadAuditoriumStarter} onPublish={publishTemplate} />
            ) : null}
          </div>
        </aside>
      </section>

      {previewMode ? (
        <section className="rounded-[24px] border border-[#6626B9]/20 bg-[#F4F0FF] p-4">
          <CustomerSeatMapPreview eventName="Customer Preview" template={selectedTemplate} />
        </section>
      ) : null}
    </section>
  );
}

export function OrganizerSeatMapPersonalizationPanel({
  eventId,
  eventName = "Live in Concert",
  organizerId,
  initialTemplateId,
  initialOverrideId,
  onSave,
  mode = "embedded",
}: {
  eventId: string;
  eventName?: string;
  organizerId: string;
  initialTemplateId?: string;
  initialOverrideId?: string;
  onSave?: (payload: { templateId: string; overrideId: string; summary: SeatMapCounts }) => void;
  mode?: "embedded" | "page";
}) {
  const [templates, setTemplates] = useState<SeatMapTemplate[]>([]);
  const [templateId, setTemplateId] = useState(initialTemplateId || "");
  const [override, setOverride] = useState<SeatMapEventOverride | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<SeatStatus>("available");
  const [bulkChannel, setBulkChannel] = useState<SeatSalesChannel>("online");
  const [seatPlan, setSeatPlan] = useState<OrganizerSeatPlan>("use-approved");
  const [venueSearch, setVenueSearch] = useState("");
  const [requestForm, setRequestForm] = useState({
    venueName: "",
    city: "Pune",
    eventType: "Event",
    expectedCapacity: "",
    notes: "",
  });
  const [message, setMessage] = useState("Choose if this event needs a venue seat map. Not every event, activity, or play needs the same venue design.");

  useEffect(() => {
    const active = readPublishedSeatMapTemplates();
    const savedPlan = readOrganizerSeatPlan(eventId);
    const firstTemplateId =
      initialTemplateId ||
      savedPlan.templateId ||
      active.find((template) => template.isDefaultForOrganizers)?.id ||
      active[0]?.id ||
      "";

    setTemplates(active);
    setTemplateId(firstTemplateId);
    setSeatPlan(savedPlan.plan ?? (active.length ? "use-approved" : "request-design"));
    setRequestForm((current) => ({
      ...current,
      venueName: active.find((template) => template.id === firstTemplateId)?.venueName || current.venueName,
      city: active.find((template) => template.id === firstTemplateId)?.city || current.city,
    }));
  }, [eventId, initialTemplateId]);

  const filteredTemplates = templates.filter((item) => {
    const query = venueSearch.trim().toLowerCase();
    if (!query) return true;
    return `${item.venueName} ${item.city} ${item.venueCode} ${item.venueType}`.toLowerCase().includes(query);
  });
  const template = templates.find((item) => item.id === templateId) || templates[0];

  useEffect(() => {
    if (!template || seatPlan !== "use-approved") return;
    const savedOverride = initialOverrideId
      ? readOrganizerOverrideById(initialOverrideId)
      : undefined;
    setOverride(
      savedOverride?.templateId === template.id
        ? savedOverride
        : readOrCreateOrganizerOverride(eventId, organizerId, eventName, template.id),
    );
  }, [eventId, eventName, initialOverrideId, organizerId, seatPlan, template?.id]);

  function handlePlanChange(plan: OrganizerSeatPlan) {
    setSeatPlan(plan);
    saveOrganizerSeatPlan(
      plan === "use-approved" && template?.id
        ? { eventId, plan, templateId: template.id }
        : { eventId, plan },
    );
    if (plan === "not-needed") {
      setSelectedSeatIds([]);
      setMessage("Seat map disabled for this event. Customers will book by ticket type/quantity like normal ticket cards.");
      onSave?.({ templateId: "", overrideId: "no-seat-map-needed", summary: emptySeatMapCounts() });
      return;
    }
    if (plan === "request-design") {
      setMessage("Request venue design from Buizz support. Admin/Super Admin will review it in Support Tickets.");
      return;
    }
    setMessage("Choose an approved venue map, then update only event-specific availability and sales channels.");
  }

  function handleTemplateSelect(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    setSelectedSeatIds([]);
    saveOrganizerSeatPlan({ eventId, plan: "use-approved", templateId: nextTemplateId });
    const nextTemplate = templates.find((item) => item.id === nextTemplateId);
    if (nextTemplate) {
      setRequestForm((current) => ({ ...current, venueName: nextTemplate.venueName, city: nextTemplate.city }));
      setOverride(readOrCreateOrganizerOverride(eventId, organizerId, eventName, nextTemplate.id));
      setMessage(`${nextTemplate.venueName} loaded. Master structure is locked; edit only allocation for this event.`);
    }
  }

  function submitVenueDesignSupportTicket() {
    const ticket = createVenueDesignSupportTicket({
      eventId,
      eventName,
      organizerId,
      venueName: requestForm.venueName.trim() || "Venue design request",
      city: requestForm.city.trim() || "City not provided",
      eventType: requestForm.eventType.trim() || "Event",
      expectedCapacity: requestForm.expectedCapacity.trim() || "Not provided",
      notes: requestForm.notes.trim(),
    });
    setMessage(`Venue design support ticket ${ticket.id} created. Admin/Super Admin will see it in Support Tickets.`);
    setSeatPlan("request-design");
    saveOrganizerSeatPlan({ eventId, plan: "request-design", supportTicketId: ticket.id });
  }

  function openSupportPage() {
    if (typeof window === "undefined") return;
    window.location.href = "/organizer/support";
  }

  if (seatPlan === "not-needed") {
    const shellClass = mode === "page" ? "mx-auto grid w-full max-w-[1720px] gap-4 overflow-x-hidden" : "grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4";
    return (
      <section className={shellClass}>
        <OrganizerSeatPlanChooser
          seatPlan={seatPlan}
          activeTemplates={templates.length}
          onPlanChange={handlePlanChange}
        />
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">No seat-map event</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.03em]">{eventName}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                This event will use normal ticket quantity cards instead of a seat map. This is best for activities, workshops, general admission, standing shows, and events where exact seats are not required.
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <ToolbarButton onClick={() => handlePlanChange("use-approved")} icon={<MapPin className="size-4" />}>Use Venue Map</ToolbarButton>
              <PrimaryButton onClick={() => onSave?.({ templateId: "", overrideId: "no-seat-map-needed", summary: emptySeatMapCounts() })} icon={<Save className="size-4" />}>Save No Map</PrimaryButton>
            </div>
          </div>
          <p className="mt-4 rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3 text-sm font-bold text-[#15803D]">{message}</p>
        </section>
      </section>
    );
  }

  if (seatPlan === "request-design" || !templates.length) {
    const shellClass = mode === "page" ? "mx-auto grid w-full max-w-[1720px] gap-4 overflow-x-hidden" : "grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4";
    return (
      <section className={shellClass}>
        <OrganizerSeatPlanChooser
          seatPlan="request-design"
          activeTemplates={templates.length}
          onPlanChange={handlePlanChange}
        />
        <section className="grid gap-4 rounded-[28px] border border-[#EC1B72]/20 bg-white p-4 shadow-[0_18px_50px_rgba(236,27,114,0.08)] sm:p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Venue design request</p>
            <h1 className="mt-2 break-words text-2xl font-black tracking-[-0.03em]">Ask Buizz to create this venue design</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              No approved venue map is available, or this event needs a different seating design. Submit a support ticket and Admin/Super Admin will review it in Support Tickets, create/approve the venue map, and then it will appear here.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextInput label="Venue name" value={requestForm.venueName} onChange={(value) => setRequestForm((current) => ({ ...current, venueName: value }))} />
              <TextInput label="City" value={requestForm.city} onChange={(value) => setRequestForm((current) => ({ ...current, city: value }))} />
              <SelectInput label="Event type" value={requestForm.eventType} options={["Event", "Activity", "Play", "Concert", "Workshop", "Sports", "Other"].map((item) => ({ value: item, label: item }))} onChange={(value) => setRequestForm((current) => ({ ...current, eventType: value }))} />
              <TextInput label="Expected capacity" value={requestForm.expectedCapacity} onChange={(value) => setRequestForm((current) => ({ ...current, expectedCapacity: value }))} />
              <label className="grid gap-1 text-xs font-black text-slate-600 sm:col-span-2">
                Seating/design notes
                <textarea
                  value={requestForm.notes}
                  onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Example: stage at top, 4 sections, VIP front rows, balcony, blocked camera seats..."
                  className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#EC1B72]"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <PrimaryButton onClick={submitVenueDesignSupportTicket} icon={<MessageCircle className="size-4" />}>Create Support Ticket</PrimaryButton>
              <ToolbarButton onClick={openSupportPage} icon={<HelpCircle className="size-4" />}>Go to Support Page</ToolbarButton>
              {templates.length ? <ToolbarButton onClick={() => handlePlanChange("use-approved")} icon={<MapPin className="size-4" />}>Use Existing Venue Map</ToolbarButton> : null}
            </div>
            <p className="mt-4 rounded-2xl border border-[#6626B9]/20 bg-[#F4F0FF] px-4 py-3 text-sm font-bold text-[#3B2572]">{message}</p>
          </div>
          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <PanelTitle title="How this works" subtitle="Organizer cannot redesign master venue maps." />
            {[
              "Submit request from here or Support page.",
              "Admin/Super Admin sees the ticket in Support Tickets.",
              "Admin/Super Admin creates or approves venue seat map.",
              "Published venue design appears in this selector.",
              "Organizer edits only availability, online/offline, reserved, blocked, VIP/staff usage.",
            ].map((item) => (
              <p key={item} className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold leading-5 text-slate-600">{item}</p>
            ))}
          </aside>
        </section>
      </section>
    );
  }

  if (!template || !override) {
    return <EmptyState title="Loading approved venue map" message="Preparing the organizer event copy. Please wait." />;
  }

  const resolvedSeats = resolveOrganizerOverrideSeats(template, override);
  const counts = getSeatCounts(resolvedSeats);
  const selectedSeats = resolvedSeats.filter((seat) => selectedSeatIds.includes(seat.id));

  function patchSelectedSeats() {
    if (!override) {
      setMessage("Seat allocation is still loading. Please try again.");
      return;
    }

    if (!selectedSeatIds.length) {
      setMessage("Select seats first.");
      return;
    }

    if (selectedSeats.some((seat) => seat.status === "sold")) {
      setMessage("Sold/taken seats are locked and cannot be edited by organizer.");
      return;
    }

    const currentOverride = override;
    const next: SeatMapEventOverride = {
      id: currentOverride.id,
      templateId: currentOverride.templateId,
      eventId: currentOverride.eventId,
      eventName: currentOverride.eventName,
      organizerId: currentOverride.organizerId,
      statusOverrides: { ...currentOverride.statusOverrides },
      channelOverrides: { ...currentOverride.channelOverrides },
      tierOverrides: { ...currentOverride.tierOverrides },
      notes: { ...currentOverride.notes },
      updatedAt: new Date().toISOString(),
    };

    for (const seatId of selectedSeatIds) {
      next.statusOverrides[seatId] = bulkStatus;
      next.channelOverrides[seatId] = bulkChannel;
    }

    saveOrganizerOverride(next);
    setOverride(next);
    setMessage(`${selectedSeatIds.length} seats updated for this event only. Master venue map is unchanged.`);
  }

  function saveOrganizerDraft() {
    if (!override) {
      setMessage("Seat allocation is still loading. Please try again.");
      return;
    }

    const savedOverride = saveOrganizerOverride({
      ...override,
      approvalStatus: "Pending Review",
      submittedAt: override.submittedAt ?? new Date().toISOString(),
    });
    saveOrganizerSeatPlan({ eventId, plan: "use-approved", templateId: template.id, overrideId: override.id });
    setOverride(savedOverride);
    onSave?.({ templateId: template.id, overrideId: savedOverride.id, summary: counts });
    setMessage("Organizer seat allocation saved as event copy/override.");
  }

  const shellClass = mode === "page" ? "mx-auto grid w-full max-w-[1720px] gap-4 overflow-x-hidden" : "grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4";

  return (
    <section className={shellClass}>
      <OrganizerSeatPlanChooser
        seatPlan={seatPlan}
        activeTemplates={templates.length}
        onPlanChange={handlePlanChange}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Organizer Seat Allocation</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em]">{eventName}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Use the approved venue master map. Change only availability, online/offline channel, reserved, blocked, VIP, staff, and hold seats for this event.</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap xl:justify-end">
            <ToolbarButton onClick={saveOrganizerDraft} icon={<Save className="size-4" />}>Save Event Copy</ToolbarButton>
            <PrimaryButton onClick={saveOrganizerDraft} icon={<ShieldCheck className="size-4" />}>Submit for Review</PrimaryButton>
          </div>
        </div>
        <p className="mt-4 rounded-2xl border border-[#6626B9]/20 bg-[#F4F0FF] px-4 py-3 text-sm font-bold text-[#3B2572]">{message}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4 xl:grid-cols-8">
        <SummaryTile label="Template" value={template.venueName} />
        <SummaryTile label="Total Seats" value={String(counts.total)} />
        <SummaryTile label="Available" value={String(counts.available)} />
        <SummaryTile label="Online" value={String(counts.online)} />
        <SummaryTile label="Offline" value={String(counts.offline)} />
        <SummaryTile label="Reserved" value={String(counts.reserved)} />
        <SummaryTile label="Blocked" value={String(counts.blocked + counts.disabled)} />
        <SummaryTile label="Sold/Taken" value={String(counts.sold)} />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <PanelTitle title="Event Seat Controls" subtitle="Structure editing is locked for organizer." />
          <TextInput label="Search venue" value={venueSearch} onChange={setVenueSearch} />
          <SelectInput label="Approved Venue Map" value={template.id} options={(filteredTemplates.length ? filteredTemplates : templates).map((item) => ({ value: item.id, label: `${item.venueName} • ${item.city}` }))} onChange={handleTemplateSelect} />
          <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Need another venue?</p>
            <ToolbarButton onClick={() => handlePlanChange("request-design")} icon={<MessageCircle className="size-4" />}>Request Venue Design</ToolbarButton>
          </div>
          <EditorCard title="Bulk allocation">
            <SelectInput label="Seat status" value={bulkStatus} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => setBulkStatus(value as SeatStatus)} />
            <SelectInput label="Sales channel" value={bulkChannel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => setBulkChannel(value as SeatSalesChannel)} />
            <PrimaryButton onClick={patchSelectedSeats} icon={<CheckCircle2 className="size-4" />}>Apply to selected</PrimaryButton>
            <ToolbarButton onClick={() => setSelectedSeatIds([])} icon={<RotateCcw className="size-4" />}>Clear selection</ToolbarButton>
          </EditorCard>
          <EditorCard title="What organizer can edit">
            {[
              "Available / blocked / reserved / hold",
              "Online vs offline booking channel",
              "VIP / staff / complimentary usage",
              "Event-specific tier assignment",
              "Cannot move seats, stage, gates, sections",
            ].map((item) => <p key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">{item}</p>)}
          </EditorCard>
        </aside>
        <main className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
          <OrganizerLockedCanvas template={{ ...template, seats: resolvedSeats }} selectedIds={selectedSeatIds} onSelect={(id, additive) => setSelectedSeatIds((current) => additive ? toggle(current, id) : [id])} />
        </main>
        <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <PanelTitle title="Selection" subtitle={`${selectedSeatIds.length} seats selected`} />
          {selectedSeats.length ? (
            <div className="grid gap-2">
              {selectedSeats.slice(0, 12).map((seat) => (
                <div key={seat.id} className="rounded-2xl border border-slate-200 p-3 text-sm font-bold">
                  {seat.sectionName} {seat.row}-{seat.number}
                  <span className="block text-xs text-slate-500">{statusLabel(seat.status)} • {channelLabel(seat.channel)}</span>
                </div>
              ))}
              {selectedSeats.length > 12 ? <p className="text-xs font-bold text-slate-500">+{selectedSeats.length - 12} more selected</p> : null}
            </div>
          ) : <EmptyState title="No seats selected" message="Click seats on the map. Shift-click to select multiple seats." compact />}
        </aside>
      </section>
    </section>
  );
}

function OrganizerSeatPlanChooser({ seatPlan, activeTemplates, onPlanChange }: { seatPlan: OrganizerSeatPlan; activeTemplates: number; onPlanChange: (plan: OrganizerSeatPlan) => void }) {
  const cards: Array<{ id: OrganizerSeatPlan; title: string; text: string; icon: ReactNode; badge: string }> = [
    {
      id: "use-approved",
      title: "Use approved venue design",
      text: "Choose a published Admin/Super Admin venue map and update event seat usage only.",
      icon: <MapPin className="size-5" />,
      badge: `${activeTemplates} maps`,
    },
    {
      id: "not-needed",
      title: "No seat map needed",
      text: "Use normal ticket quantity cards for activities, workshops, GA, or non-seat events.",
      icon: <Ticket className="size-5" />,
      badge: "Ticket types",
    },
    {
      id: "request-design",
      title: "Request venue design",
      text: "Create a support ticket so Buizz/Admin can make or approve the venue map.",
      icon: <MessageCircle className="size-5" />,
      badge: "Support",
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Seat map decision</p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.02em]">Choose how this event will handle seating</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Different events, activities, and plays can use different venue layouts, or no seat map at all.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onPlanChange(card.id)}
            className={`min-w-0 rounded-3xl border p-4 text-left transition ${seatPlan === card.id ? "border-[#EC1B72] bg-[#EC1B72]/5 shadow-[0_14px_34px_rgba(236,27,114,0.12)]" : "border-slate-200 bg-slate-50 hover:border-[#EC1B72]/50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${seatPlan === card.id ? "bg-[#EC1B72] text-white" : "bg-white text-slate-700"}`}>{card.icon}</span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{card.badge}</span>
            </div>
            <h3 className="mt-3 break-words text-sm font-black text-slate-950">{card.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{card.text}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function CustomerSeatMapPreview({ eventName, template }: { eventName: string; template: SeatMapTemplate }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSeats = template.seats.filter((seat) => selectedIds.includes(seat.id));
  const total = selectedSeats.reduce((sum, seat) => sum + (template.tiers.find((tier) => tier.id === seat.tierId)?.price || 0), 0);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <OrganizerLockedCanvas
        template={template}
        selectedIds={selectedIds}
        previewCustomer
        onSelect={(id) => setSelectedIds((current) => toggle(current, id))}
      />
      <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black">{eventName}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">{template.venueName}, {template.city}</p>
        <div className="mt-4 grid gap-2">
          {selectedSeats.length ? selectedSeats.map((seat) => {
            const tier = template.tiers.find((item) => item.id === seat.tierId);
            return (
              <div key={seat.id} className="rounded-2xl border border-slate-200 p-3 text-sm font-bold">
                {seat.sectionName} {seat.row}-{seat.number}
                <span className="block text-xs text-slate-500">{tier?.name || "General"} • {tier?.priceLabel || "₹0"}</span>
              </div>
            );
          }) : <EmptyState title="Select seats" message="Only available online seats are selectable in customer preview." compact />}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex justify-between text-sm font-black"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
          <button type="button" disabled className="mt-4 min-h-11 w-full rounded-2xl bg-slate-200 px-4 text-sm font-black text-slate-500">Proceed disabled in preview</button>
        </div>
      </aside>
    </div>
  );
}

export function EventSeatMapPreview({
  eventId,
  templateId,
  overrideId,
  eventName = "Event seat map",
}: {
  eventId?: string;
  templateId?: string;
  overrideId?: string;
  eventName?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<OrganizerSeatMapSnapshot>();

  useEffect(() => {
    setSelectedIds([]);
    setSnapshot(
      readOrganizerSeatMapSnapshot({
        eventId,
        templateId,
        overrideId,
      }),
    );
  }, [eventId, overrideId, templateId]);

  if (!snapshot) {
    return (
      <EmptyState
        title="Event-specific seat map not saved"
        message="Save event-specific seat map before continuing."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Event" value={eventName} />
        <SummaryTile label="Venue design" value={snapshot.template.venueName} />
        <SummaryTile label="Override" value={snapshot.override.id} />
        <SummaryTile label="Available" value={snapshot.counts.available} />
        <SummaryTile
          label="Blocked / reserved"
          value={`${snapshot.counts.blocked + snapshot.counts.disabled} / ${snapshot.counts.reserved}`}
        />
      </div>
      <OrganizerLockedCanvas
        template={snapshot.resolvedTemplate}
        selectedIds={selectedIds}
        previewCustomer
        onSelect={(id) => setSelectedIds((current) => toggle(current, id))}
      />
    </div>
  );
}

function OrganizerLockedCanvas({ template, selectedIds, onSelect, previewCustomer = false }: { template: SeatMapTemplate; selectedIds: string[]; onSelect: (id: string, additive: boolean) => void; previewCustomer?: boolean }) {
  return (
    <div className="relative min-h-[420px] overflow-hidden sm:min-h-[520px] xl:min-h-[620px] rounded-[22px] border border-slate-200 bg-[#FBFCFE]">
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      {template.objects.map((object) => (
        <div key={object.id} className="absolute select-none" style={{ left: `${object.x}%`, top: `${object.y}%`, width: `${object.width}%`, height: `${object.height}%`, transform: `translate(-50%, -50%) rotate(${object.rotation}deg)` }}>
          <CanvasObjectView object={object} />
        </div>
      ))}
      {template.seats.map((seat) => {
        const tier = template.tiers.find((item) => item.id === seat.tierId);
        const selected = selectedIds.includes(seat.id);
        const disabled = previewCustomer && (seat.status !== "available" || seat.channel !== "online");
        return (
          <button
            key={seat.id}
            type="button"
            disabled={disabled}
            onClick={(event) => onSelect(seat.id, event.shiftKey || event.metaKey || event.ctrlKey)}
            className={`absolute grid place-items-center rounded-full border text-[10px] font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "z-30 border-[#EC1B72] bg-[#EC1B72] text-white ring-2 ring-[#EC1B72]/30" : "border-white"}`}
            style={{ left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.radius * 2.15}%`, height: `${seat.radius * 2.15}%`, minWidth: 22, minHeight: 22, transform: "translate(-50%, -50%)", backgroundColor: selected ? "#EC1B72" : statusColor(seat.status, tier?.color, seat.channel), color: selected || seat.status !== "available" || seat.channel !== "online" ? "#FFFFFF" : "#047857" }}
          >
            {seat.number}
          </button>
        );
      })}
      <CanvasLegend />
    </div>
  );
}

function VenueSetupCard({ template, mode, templates, onMode, onPatch, onSelectTemplate, onStartScratch, onLoadStarter, onClose }: { template: SeatMapTemplate; mode: SetupMode; templates: SeatMapTemplate[]; onMode: (mode: SetupMode) => void; onPatch: (patch: Partial<SeatMapTemplate>) => void; onSelectTemplate: (id: string) => void; onStartScratch: () => void; onLoadStarter: () => void; onClose: () => void }) {
  return (
    <section className="rounded-[28px] border border-[#EC1B72]/20 bg-white p-5 shadow-[0_18px_50px_rgba(236,27,114,0.08)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC1B72]">Step 1 • Venue information first</p>
          <h2 className="mt-2 text-xl font-black">Create from scratch or edit existing design</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Set venue details before designing. This saved master template becomes the default map organizer can only allocate for events.</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white"><X className="size-4" /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ChipButton active={mode === "edit"} onClick={() => onMode("edit")}>Edit Existing</ChipButton>
        <ChipButton active={mode === "scratch"} onClick={() => onMode("scratch")}>Create From Scratch</ChipButton>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TextInput label="Venue Name" value={template.venueName} onChange={(value) => onPatch({ venueName: value })} />
          <TextInput label="City" value={template.city} onChange={(value) => onPatch({ city: value })} />
          <SelectInput label="Venue Type" value={template.venueType} options={venueTypes.map((item) => ({ value: item, label: titleCase(item) }))} onChange={(value) => onPatch({ venueType: value as VenueType })} />
          <TextInput label="Venue Code" value={template.venueCode} onChange={(value) => onPatch({ venueCode: value })} />
          <label className="grid gap-1 text-xs font-black sm:col-span-2 xl:col-span-4">
            Address / location notes
            <textarea value={template.address} onChange={(event) => onPatch({ address: event.target.value })} className="min-h-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#EC1B72]" />
          </label>
        </div>
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {mode === "edit" ? (
            <>
              <SelectInput label="Saved Design" value={template.id} options={templates.map((item) => ({ value: item.id, label: `${item.venueName} • ${titleCase(item.status)}` }))} onChange={onSelectTemplate} />
              <ToolbarButton onClick={onClose} icon={<Edit3 className="size-4" />}>Edit selected</ToolbarButton>
              <ToolbarButton onClick={onLoadStarter} icon={<Layers3 className="size-4" />}>Load auditorium starter</ToolbarButton>
            </>
          ) : (
            <>
              <p className="text-sm font-bold leading-6 text-slate-600">Scratch mode keeps venue info and starts an empty canvas with only starter stage/gates.</p>
              <PrimaryButton onClick={onStartScratch} icon={<Plus className="size-4" />}>Start Blank Canvas</PrimaryButton>
              <ToolbarButton onClick={onLoadStarter} icon={<Layers3 className="size-4" />}>Use Auditorium Starter</ToolbarButton>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PropertiesInspector({ template, selectedSeats, selectedObjects, onPatchTemplate, onPatchSeats, onPatchObject, onDelete }: { template: SeatMapTemplate; selectedSeats: SeatNode[]; selectedObjects: CanvasObject[]; onPatchTemplate: (patch: Partial<SeatMapTemplate>, notice?: string) => void; onPatchSeats: (patch: Partial<SeatNode>) => void; onPatchObject: (objectId: string, patch: Partial<CanvasObject>) => void; onDelete: () => void }) {
  const firstSeat = selectedSeats[0];
  const firstObject = selectedObjects[0];
  return (
    <div className="grid gap-4">
      <EditorCard title="Template Details">
        <TextInput label="Venue Name" value={template.venueName} onChange={(value) => onPatchTemplate({ venueName: value })} />
        <TextInput label="City" value={template.city} onChange={(value) => onPatchTemplate({ city: value })} />
        <SelectInput label="Status" value={template.status} options={["draft", "active", "inactive", "archived"].map((item) => ({ value: item, label: titleCase(item) }))} onChange={(value) => onPatchTemplate({ status: value as TemplateStatus })} />
        <Checkbox label="Allow organizer structure edits" checked={template.allowOrganizerStructureEdits} onChange={(value) => onPatchTemplate({ allowOrganizerStructureEdits: value })} />
        <Checkbox label="Default for organizers" checked={template.isDefaultForOrganizers} onChange={(value) => onPatchTemplate({ isDefaultForOrganizers: value })} />
      </EditorCard>

      <EditorCard title="Inspector">
        {selectedSeats.length > 1 ? (
          <>
            <p className="rounded-2xl bg-[#EC1B72]/5 p-3 text-sm font-black text-[#EC1B72]">{selectedSeats.length} seats selected</p>
            <SelectInput label="Bulk status" value={firstSeat?.status || "available"} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => onPatchSeats({ status: value as SeatStatus })} />
            <SelectInput label="Bulk channel" value={firstSeat?.channel || "online"} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => onPatchSeats({ channel: value as SeatSalesChannel })} />
            <SelectInput label="Bulk tier" value={firstSeat?.tierId || ""} options={template.tiers.map((tier) => ({ value: tier.id, label: tier.name }))} onChange={(value) => onPatchSeats({ tierId: value })} />
            <ToolbarButton onClick={onDelete} icon={<Trash2 className="size-4" />}>Delete selected</ToolbarButton>
          </>
        ) : firstSeat ? (
          <>
            <TextInput label="Seat label" value={firstSeat.label} onChange={(value) => onPatchSeats({ label: value })} />
            <TextInput label="Row" value={firstSeat.row} onChange={(value) => onPatchSeats({ row: value.toUpperCase() })} />
            <TextInput label="Seat number" value={firstSeat.number} onChange={(value) => onPatchSeats({ number: value })} />
            <SelectInput label="Section" value={firstSeat.sectionId} options={template.sections.map((section) => ({ value: section.id, label: section.name }))} onChange={(value) => {
              const section = template.sections.find((item) => item.id === value);
              onPatchSeats({ sectionId: value, sectionName: section?.name || "Section" });
            }} />
            <SelectInput label="Status" value={firstSeat.status} options={statusOptions.map((item) => ({ value: item, label: statusLabel(item) }))} onChange={(value) => onPatchSeats({ status: value as SeatStatus })} />
            <SelectInput label="Booking Channel" value={firstSeat.channel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => onPatchSeats({ channel: value as SeatSalesChannel })} />
            <SelectInput label="Tier" value={firstSeat.tierId} options={template.tiers.map((tier) => ({ value: tier.id, label: tier.name }))} onChange={(value) => onPatchSeats({ tierId: value })} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput label="X %" type="number" value={String(Math.round(firstSeat.x * 10) / 10)} onChange={(value) => onPatchSeats({ x: Number(value) })} />
              <TextInput label="Y %" type="number" value={String(Math.round(firstSeat.y * 10) / 10)} onChange={(value) => onPatchSeats({ y: Number(value) })} />
            </div>
            <Checkbox label="Accessible seat" checked={firstSeat.isAccessible} onChange={(value) => onPatchSeats({ isAccessible: value })} />
            <Checkbox label="Companion seat" checked={firstSeat.isCompanion} onChange={(value) => onPatchSeats({ isCompanion: value })} />
            <ToolbarButton onClick={onDelete} icon={<Trash2 className="size-4" />}>Delete seat</ToolbarButton>
          </>
        ) : firstObject ? (
          <>
            <TextInput label="Label" value={firstObject.label} onChange={(value) => onPatchObject(firstObject.id, { label: value })} />
            {firstObject.type === "label" ? <TextInput label="Text" value={firstObject.text || ""} onChange={(value) => onPatchObject(firstObject.id, { text: value })} /> : null}
            <div className="grid grid-cols-2 gap-2">
              <TextInput label="X %" type="number" value={String(Math.round(firstObject.x * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { x: Number(value) })} />
              <TextInput label="Y %" type="number" value={String(Math.round(firstObject.y * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { y: Number(value) })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextInput label="Width %" type="number" value={String(Math.round(firstObject.width * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { width: Number(value) })} />
              <TextInput label="Height %" type="number" value={String(Math.round(firstObject.height * 10) / 10)} onChange={(value) => onPatchObject(firstObject.id, { height: Number(value) })} />
            </div>
            <TextInput label="Rotation" type="number" value={String(firstObject.rotation)} onChange={(value) => onPatchObject(firstObject.id, { rotation: Number(value) })} />
            <ColorInput label="Object color" value={firstObject.color} onChange={(value) => onPatchObject(firstObject.id, { color: value })} />
            <ToolbarButton onClick={onDelete} icon={<Trash2 className="size-4" />}>Delete object</ToolbarButton>
          </>
        ) : (
          <EmptyState title="Select a seat or zone" message="Use Select tool, click a seat/object, or drag on canvas to box-select multiple seats." compact />
        )}
      </EditorCard>
    </div>
  );
}

function SectionsPanel({ template, selectedSections, onUpdateSection, onAddSection, onSelectSection }: { template: SeatMapTemplate; selectedSections: SeatSection[]; onUpdateSection: (sectionId: string, patch: Partial<SeatSection>) => void; onAddSection: () => void; onSelectSection: (sectionId: string) => void }) {
  return (
    <div className="grid gap-3">
      <PanelTitle title="Sections" subtitle={`${template.sections.length} sections • ${selectedSections.length} selected`} />
      <PrimaryButton onClick={onAddSection} icon={<Plus className="size-4" />}>Add Section</PrimaryButton>
      {template.sections.map((section) => {
        const seatCount = template.seats.filter((seat) => seat.sectionId === section.id).length;
        return (
          <article key={section.id} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-start gap-3">
              <input type="color" value={section.color} onChange={(event) => onUpdateSection(section.id, { color: event.target.value })} className="mt-1 size-9 shrink-0 rounded-lg" aria-label={`${section.name} color`} />
              <div className="min-w-0 flex-1">
                <input value={section.name} onChange={(event) => onUpdateSection(section.id, { name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black outline-none focus:border-[#EC1B72]" />
                <p className="mt-1 text-xs font-bold text-slate-500">{seatCount} seats • {titleCase(section.type)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onSelectSection(section.id)} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black hover:border-[#EC1B72]">Focus</button>
              <button type="button" onClick={() => onUpdateSection(section.id, { locked: !section.locked })} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black hover:border-[#EC1B72]">{section.locked ? "Unlock" : "Lock"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TiersPanel({ template, selectedSeatIds, onAddTier, onUpdateTier, onDeleteTier, onAssignTier }: { template: SeatMapTemplate; selectedSeatIds: string[]; onAddTier: () => void; onUpdateTier: (tierId: string, patch: Partial<SeatTier>) => void; onDeleteTier: (tierId: string) => void; onAssignTier: (tierId: string) => void }) {
  return (
    <div className="grid gap-3">
      <PanelTitle title="Tiers & Pricing" subtitle="Create colored categories like Seats.io categories." />
      <PrimaryButton onClick={onAddTier} icon={<Plus className="size-4" />}>Add Tier</PrimaryButton>
      {template.tiers.map((tier) => {
        const seats = template.seats.filter((seat) => seat.tierId === tier.id);
        return (
          <article key={tier.id} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <input type="color" value={tier.color} onChange={(event) => onUpdateTier(tier.id, { color: event.target.value })} className="size-9 rounded-lg" aria-label={`${tier.name} color`} />
              <input value={tier.name} onChange={(event) => onUpdateTier(tier.id, { name: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black outline-none focus:border-[#EC1B72]" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TextInput label="Price" type="number" value={String(tier.price)} onChange={(value) => onUpdateTier(tier.id, { price: Number(value), priceLabel: `₹${Number(value).toLocaleString("en-IN")}` })} />
              <SelectInput label="Default channel" value={tier.channel} options={channelOptions.map((item) => ({ value: item, label: channelLabel(item) }))} onChange={(value) => onUpdateTier(tier.id, { channel: value as SeatSalesChannel })} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{seats.length} seats assigned</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={!selectedSeatIds.length} onClick={() => onAssignTier(tier.id)} className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-black disabled:opacity-45">Assign selected</button>
              <button type="button" onClick={() => onDeleteTier(tier.id)} className="min-h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600">Delete</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TemplatesPanel({ templates, selectedId, onSelect, onDuplicate, onArchive, onPublish, onExport, onImport }: { templates: SeatMapTemplate[]; selectedId: string; onSelect: (id: string) => void; onDuplicate: () => void; onArchive: () => void; onPublish: () => void; onExport: () => void; onImport: () => void }) {
  return (
    <div className="grid gap-3">
      <PanelTitle title="Templates" subtitle="Load, duplicate, publish, export, or import master maps." />
      <div className="grid grid-cols-2 gap-2">
        <ToolbarButton onClick={onDuplicate} icon={<Copy className="size-4" />}>Duplicate</ToolbarButton>
        <ToolbarButton onClick={onPublish} icon={<ShieldCheck className="size-4" />}>Publish</ToolbarButton>
        <ToolbarButton onClick={onExport} icon={<FileJson className="size-4" />}>Export</ToolbarButton>
        <ToolbarButton onClick={onImport} icon={<Upload className="size-4" />}>Import</ToolbarButton>
      </div>
      {templates.map((template) => (
        <button key={template.id} type="button" onClick={() => onSelect(template.id)} className={`rounded-2xl border p-3 text-left ${selectedId === template.id ? "border-[#EC1B72] bg-[#EC1B72]/5" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-black">{template.venueName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{template.city} • {template.totalCapacity} seats • {titleCase(template.status)}</p>
            </div>
            {template.isDefaultForOrganizers ? <StatusPill label="Default" tone="brand" /> : null}
          </div>
        </button>
      ))}
      <button type="button" onClick={onArchive} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700">
        <Archive className="mr-2 inline size-4" /> Archive current
      </button>
    </div>
  );
}

function VenueSetupPanel({ template, onPatch, onScratch, onLoadStarter, onPublish }: { template: SeatMapTemplate; onPatch: (patch: Partial<SeatMapTemplate>) => void; onScratch: () => void; onLoadStarter: () => void; onPublish: () => void }) {
  return (
    <div className="grid gap-3">
      <PanelTitle title="Venue Setup" subtitle="Backend-ready venue metadata before designing." />
      <TextInput label="Venue name" value={template.venueName} onChange={(value) => onPatch({ venueName: value })} />
      <TextInput label="City" value={template.city} onChange={(value) => onPatch({ city: value })} />
      <TextInput label="Venue code" value={template.venueCode} onChange={(value) => onPatch({ venueCode: value })} />
      <SelectInput label="Venue type" value={template.venueType} options={venueTypes.map((item) => ({ value: item, label: titleCase(item) }))} onChange={(value) => onPatch({ venueType: value as VenueType })} />
      <Checkbox label="Default for organizers" checked={template.isDefaultForOrganizers} onChange={(value) => onPatch({ isDefaultForOrganizers: value })} />
      <Checkbox label="Allow organizer structure edits" checked={template.allowOrganizerStructureEdits} onChange={(value) => onPatch({ allowOrganizerStructureEdits: value })} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ToolbarButton onClick={onScratch} icon={<Plus className="size-4" />}>Scratch</ToolbarButton>
        <ToolbarButton onClick={onLoadStarter} icon={<Layers3 className="size-4" />}>Auditorium starter</ToolbarButton>
        <PrimaryButton onClick={onPublish} icon={<ShieldCheck className="size-4" />}>Publish</PrimaryButton>
      </div>
    </div>
  );
}

function CanvasObjectView({ object }: { object: CanvasObject }) {
  if (object.type === "stage") {
    return <div className="grid size-full place-items-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg">{object.label || "STAGE"}</div>;
  }
  if (object.type === "entry" || object.type === "exit") {
    return <div className={`grid size-full place-items-center rounded-2xl border px-3 text-center text-xs font-black ${object.type === "exit" ? "border-orange-200 bg-orange-50 text-orange-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{object.label}</div>;
  }
  if (object.type === "standing") {
    return <div className="grid size-full place-items-center rounded-3xl border-2 border-dashed border-amber-300 bg-amber-100/60 text-center text-xs font-black text-amber-700">{object.label}<span className="block text-[10px]">{object.capacity || 0} capacity</span></div>;
  }
  if (object.type === "section-box") {
    return <div className="grid size-full place-items-center rounded-3xl border-2 border-dashed bg-white/50 text-center text-xs font-black" style={{ borderColor: object.color, color: object.color }}>{object.label}</div>;
  }
  return <div className="grid size-full place-items-center rounded-2xl border border-slate-200 bg-white/90 p-2 text-center text-xs font-black text-slate-700 shadow-sm">{object.text || object.label}</div>;
}

function SelectionBox({ box }: { box: { x1: number; y1: number; x2: number; y2: number } }) {
  const normalized = normalizeBox(box);
  return <div className="pointer-events-none absolute z-50 border-2 border-[#EC1B72] bg-[#EC1B72]/10" style={{ left: `${normalized.x1}%`, top: `${normalized.y1}%`, width: `${normalized.x2 - normalized.x1}%`, height: `${normalized.y2 - normalized.y1}%` }} />;
}

function CanvasLegend() {
  const items: Array<{ label: string; color: string }> = [
    { label: "Available", color: "#22C55E" },
    { label: "Blocked", color: "#111827" },
    { label: "Reserved", color: "#7C3AED" },
    { label: "Sold / taken", color: "#9CA3AF" },
    { label: "Hold", color: "#F59E0B" },
    { label: "VIP", color: "#EC1B72" },
    { label: "Offline", color: "#3B82F6" },
  ];
  return (
    <div className="absolute inset-x-2 bottom-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 px-2 py-2 text-[10px] font-black text-slate-600 shadow-sm sm:inset-x-3 sm:bottom-3 sm:gap-3 sm:px-3 sm:text-[11px]">
      {items.map((item) => <span key={item.label} className="inline-flex items-center gap-1"><span className="size-3 rounded-full" style={{ backgroundColor: item.color }} /> {item.label}</span>)}
    </div>
  );
}

function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-4 grid gap-3 rounded-[20px] border border-slate-200 bg-white p-3"><h3 className="font-black text-slate-900">{title}</h3>{children}</section>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="mb-3"><h2 className="text-base font-black uppercase tracking-[0.02em] text-slate-950">{title}</h2>{subtitle ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p> : null}</div>;
}

function SummaryTile({ label, value, className = "" }: { label: string; value: string | number; className?: string }) {
  return <article className={`min-w-0 rounded-[20px] bg-slate-100 px-4 py-3 ${className}`}><p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p></article>;
}

function StatusPill({ label, tone = "muted" }: { label: string; tone?: "success" | "warning" | "brand" | "muted" }) {
  const className = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : tone === "brand" ? "border-[#EC1B72]/25 bg-[#EC1B72]/10 text-[#EC1B72]" : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase ${className}`}>{label}</span>;
}

function ToolbarButton({ children, icon, onClick, disabled = false }: { children: ReactNode; icon?: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#EC1B72] hover:text-[#EC1B72] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-4">{icon}{children}</button>;
}

function PrimaryButton({ children, icon, onClick }: { children: ReactNode; icon?: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC1B72] to-[#7C2BD9] px-3 text-xs font-black text-white shadow-lg shadow-pink-100 transition active:scale-[0.98] sm:w-auto sm:px-4">{icon}{children}</button>;
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-2xl border px-4 text-sm font-semibold transition ${active ? "border-[#EC1B72] bg-[#EC1B72]/5 text-[#EC1B72]" : "border-slate-200 bg-white text-slate-700"}`}>{children}</button>;
}

function ZoomControl({ zoom, onZoomIn, onZoomOut }: { zoom: number; onZoomIn: () => void; onZoomOut: () => void }) {
  return <div className="inline-flex min-h-10 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white"><button type="button" onClick={onZoomOut} className="grid size-10 place-items-center"><ZoomOut className="size-4" /></button><span className="min-w-16 text-center text-xs font-black">{Math.round(zoom * 100)}%</span><button type="button" onClick={onZoomIn} className="grid size-10 place-items-center"><ZoomIn className="size-4" /></button></div>;
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-1 text-xs font-black text-slate-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-[#EC1B72]" /></label>;
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-black text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-[#EC1B72]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-black text-slate-600">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-10 rounded-lg" /></label>;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#EC1B72]" /></label>;
}

function EmptyState({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? "p-4" : "p-8"}`}>
      <div>
        <ImageIcon className="mx-auto size-8 text-slate-400" />
        <p className="mt-3 font-black text-slate-900">{title}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{message}</p>
      </div>
    </div>
  );
}


type OrganizerSeatPlanRecord = {
  eventId: string;
  plan: OrganizerSeatPlan;
  templateId?: string;
  overrideId?: string;
  supportTicketId?: string;
  updatedAt: string;
};

const organizerSeatPlanStorageKey = "buizz-organizer-event-seat-plan-v1";

function emptySeatMapCounts(): SeatMapCounts {
  return {
    total: 0,
    available: 0,
    online: 0,
    offline: 0,
    reserved: 0,
    blocked: 0,
    sold: 0,
    disabled: 0,
    hold: 0,
    vip: 0,
    staff: 0,
  };
}

function readOrganizerSeatPlan(eventId: string): Partial<OrganizerSeatPlanRecord> {
  if (typeof window === "undefined") return {};
  try {
    const records = JSON.parse(window.localStorage.getItem(organizerSeatPlanStorageKey) || "[]") as OrganizerSeatPlanRecord[];
    return records.find((record) => record.eventId === eventId) || {};
  } catch {
    return {};
  }
}

function saveOrganizerSeatPlan(record: Omit<OrganizerSeatPlanRecord, "updatedAt">) {
  if (typeof window === "undefined") return;
  const records = (() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(organizerSeatPlanStorageKey) || "[]") as OrganizerSeatPlanRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const nextRecord: OrganizerSeatPlanRecord = { ...record, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(
    organizerSeatPlanStorageKey,
    JSON.stringify([nextRecord, ...records.filter((item) => item.eventId !== record.eventId)]),
  );
}

function createVenueDesignSupportTicket({
  eventId,
  eventName,
  organizerId,
  venueName,
  city,
  eventType,
  expectedCapacity,
  notes,
}: {
  eventId: string;
  eventName: string;
  organizerId: string;
  venueName: string;
  city: string;
  eventType: string;
  expectedCapacity: string;
  notes: string;
}): SupportTicket {
  const now = getSupportTimestamp();
  const category = "Technical Issue" as SupportTicket["category"];
  const ticket: SupportTicket = {
    id: createSupportTicketId(),
    sourceType: "Organizer",
    requesterName: "FestLane Studios",
    requesterEmail: "ayaan@festlane.local",
    subject: `Venue seat-map design request: ${venueName}`,
    description: [
      `Organizer ID: ${organizerId}`,
      `Event: ${eventName}`,
      `Event ID: ${eventId}`,
      `Event type: ${eventType}`,
      `Venue: ${venueName}`,
      `City: ${city}`,
      `Expected capacity: ${expectedCapacity}`,
      notes ? `Notes: ${notes}` : "Notes: No extra notes added.",
      "",
      "Request: Please create or approve a venue seat-map design so this organizer can use it for event-specific allocation.",
    ].join("\n"),
    category,
    priority: getAutoSupportPriority(category),
    status: "Open",
    assignedTo: "Unassigned",
    createdAt: now,
    lastUpdated: now,
  };

  const current = getSupportTickets();
  saveSupportTickets([ticket, ...current]);
  return ticket;
}

export function readSeatMapTemplates(): SeatMapTemplate[] {
  if (typeof window === "undefined") return [createAuditoriumSeedTemplate("super-admin")];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(seatMapStorageKey) || "[]") as SeatMapTemplate[];
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeTemplate) : [createAuditoriumSeedTemplate("super-admin")];
  } catch {
    return [createAuditoriumSeedTemplate("super-admin")];
  }
}

export function writeSeatMapTemplates(templates: SeatMapTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seatMapStorageKey, JSON.stringify(templates.map(normalizeTemplate)));
  // TODO: Replace localStorage save with POST/PATCH /api/admin/seat-map-templates.
}

export function readPublishedSeatMapTemplates(): SeatMapTemplate[] {
  return readSeatMapTemplates().filter(
    (template) => template.status === "active" || template.isDefaultForOrganizers,
  );
}

export function getDefaultSeatMapTemplateForVenue(venueName?: string, city?: string) {
  const normalizedVenue = venueName?.trim().toLowerCase();
  const normalizedCity = city?.trim().toLowerCase();
  const publishedTemplates = readPublishedSeatMapTemplates();

  return (
    publishedTemplates.find(
      (template) =>
        (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
        (!normalizedCity || template.city.toLowerCase() === normalizedCity) &&
        template.isDefaultForOrganizers,
    ) ??
    publishedTemplates.find(
      (template) =>
        (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
        (!normalizedCity || template.city.toLowerCase() === normalizedCity),
    ) ??
    publishedTemplates.find((template) => template.isDefaultForOrganizers) ??
    publishedTemplates[0]
  );
}

export function getSeatMapTemplatesForVenue(venueName?: string, city?: string) {
  const normalizedVenue = venueName?.trim().toLowerCase();
  const normalizedCity = city?.trim().toLowerCase();

  return readSeatMapTemplates().filter(
    (template) =>
      (!normalizedVenue || template.venueName.toLowerCase() === normalizedVenue) &&
      (!normalizedCity || template.city.toLowerCase() === normalizedCity),
  );
}

function readSelectedTemplateId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(selectedSeatMapStorageKey) || "";
}

function saveSelectedTemplateId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(selectedSeatMapStorageKey, id);
}

export function readOrCreateOrganizerOverride(eventId: string, organizerId: string, eventName: string, templateId: string): SeatMapEventOverride {
  if (typeof window === "undefined") return createOrganizerOverride(eventId, organizerId, eventName, templateId);
  try {
    const records = JSON.parse(window.localStorage.getItem(organizerOverrideStorageKey) || "[]") as SeatMapEventOverride[];
    const existing = records.find((record) => record.eventId === eventId && record.templateId === templateId);
    if (existing) {
      const template = readSeatMapTemplates().find((item) => item.id === existing.templateId);
      return template ? normalizeOrganizerEventOverride(existing, template) : existing;
    }
  } catch {
    // fallback below
  }
  const created = createOrganizerOverride(eventId, organizerId, eventName, templateId);
  return saveOrganizerOverride(created);
}

export function saveOrganizerOverride(override: SeatMapEventOverride) {
  const template = readSeatMapTemplates().find((item) => item.id === override.templateId);
  const normalized = template ? normalizeOrganizerEventOverride(override, template) : override;
  if (typeof window === "undefined") return normalized;
  const records = (() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(organizerOverrideStorageKey) || "[]") as SeatMapEventOverride[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const next = [normalized, ...records.filter((record) => record.id !== normalized.id)];
  window.localStorage.setItem(organizerOverrideStorageKey, JSON.stringify(next));
  // TODO: Replace with POST /api/organizer/events/:eventId/seat-map-copy.
  return normalized;
}

export function readOrganizerOverrideById(overrideId: string) {
  if (!overrideId || typeof window === "undefined") return undefined;
  try {
    const records = JSON.parse(window.localStorage.getItem(organizerOverrideStorageKey) || "[]") as SeatMapEventOverride[];
    const override = records.find((record) => record.id === overrideId);
    if (!override) return undefined;
    const template = readSeatMapTemplates().find((item) => item.id === override.templateId);
    return template ? normalizeOrganizerEventOverride(override, template) : override;
  } catch {
    return undefined;
  }
}

export type OrganizerSeatMapSnapshot = {
  template: SeatMapTemplate;
  override: SeatMapEventOverride;
  resolvedTemplate: SeatMapTemplate;
  counts: SeatMapCounts;
  ticketTiers: Array<{
    tierId: string;
    name: string;
    price: number;
    color: string;
    totalQuantity: number;
    onlineQuantity: number;
    offlineQuantity: number;
    reservedQuantity: number;
  }>;
};

export function readOrganizerSeatMapSnapshot({
  overrideId,
  eventId,
  templateId,
}: {
  overrideId?: string;
  eventId?: string;
  templateId?: string;
}): OrganizerSeatMapSnapshot | undefined {
  if (typeof window === "undefined") return undefined;

  const templates = readSeatMapTemplates();
  let records: SeatMapEventOverride[] = [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(organizerOverrideStorageKey) || "[]") as SeatMapEventOverride[];
    records = Array.isArray(parsed) ? parsed : [];
  } catch {
    records = [];
  }

  const override = overrideId
    ? records.find((record) => record.id === overrideId)
    : records.find(
      (record) =>
        (!eventId || record.eventId === eventId) &&
        (!templateId || record.templateId === templateId),
    );

  if (!override) return undefined;

  const template = templates.find((item) => item.id === override.templateId);
  if (!template) return undefined;

  const normalizedOverride = normalizeOrganizerEventOverride(override, template);
  const resolvedSeats = resolveOrganizerOverrideSeats(template, normalizedOverride);
  const resolvedTemplate: SeatMapTemplate = {
    ...template,
    seats: resolvedSeats,
    tiers: template.tiers.map((tier) => {
      const savedTier = normalizedOverride.tiers?.find((item) => item.id === tier.id);
      return savedTier
        ? {
          ...tier,
          name: savedTier.name,
          price: savedTier.price,
          priceLabel: `₹${savedTier.price.toLocaleString("en-IN")}`,
          color: savedTier.color,
          description: savedTier.description ?? tier.description,
        }
        : tier;
    }),
  };

  const counts = getSeatCounts(resolvedSeats);
  const ticketTiers = resolvedTemplate.tiers
    .map((tier) => {
      const seats = resolvedSeats.filter(
        (seat) => seat.tierId === tier.id && seat.status === "available",
      );
      const onlineQuantity = seats.filter(
        (seat) => seat.channel === "online",
      ).length;
      const offlineQuantity = seats.filter((seat) => seat.channel === "offline").length;
      const reservedQuantity = Math.max(seats.length - onlineQuantity - offlineQuantity, 0);

      return {
        tierId: tier.id,
        name: tier.name,
        price: tier.price,
        color: tier.color,
        totalQuantity: seats.length,
        onlineQuantity,
        offlineQuantity,
        reservedQuantity,
      };
    })
    .filter((tier) => tier.totalQuantity > 0);

  return {
    template,
    override: normalizedOverride,
    resolvedTemplate,
    counts,
    ticketTiers,
  };
}

function resolveOrganizerOverrideSeats(
  template: SeatMapTemplate,
  override: SeatMapEventOverride,
) {
  return template.seats.map((seat) => ({
    ...seat,
    status:
      override.statusOverrides?.[seat.id] ??
      override.nodeOverrides?.[seat.id]?.status ??
      seat.status,
    channel:
      override.channelOverrides?.[seat.id] ??
      fromCanonicalSalesChannel(override.nodeOverrides?.[seat.id]?.salesChannel) ??
      seat.channel,
    tierId:
      override.tierOverrides?.[seat.id] ??
      override.nodeOverrides?.[seat.id]?.tierId ??
      seat.tierId,
    notes: override.nodeOverrides?.[seat.id]?.notes ?? seat.notes,
  }));
}

function normalizeOrganizerEventOverride(
  override: SeatMapEventOverride,
  template: SeatMapTemplate,
): SeatMapEventOverride {
  const resolvedSeats = resolveOrganizerOverrideSeats(template, override);
  const counts = getSeatCounts(resolvedSeats);
  const nodeOverrides = Object.fromEntries(
    resolvedSeats.map((seat) => [
      seat.id,
      {
        status: seat.status,
        tierId: seat.tierId,
        notes: seat.notes,
        salesChannel: toCanonicalSalesChannel(seat.channel),
      },
    ]),
  );

  return {
    ...override,
    statusOverrides: override.statusOverrides ?? {},
    channelOverrides: override.channelOverrides ?? {},
    tierOverrides: override.tierOverrides ?? {},
    notes: override.notes ?? {},
    nodeOverrides,
    approvalStatus: override.approvalStatus ?? "Draft",
    tiers: template.tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: tier.price,
      color: tier.color,
      description: tier.description,
    })),
    totalActiveSeats: counts.available,
    totalBlockedSeats: counts.blocked + counts.disabled,
    totalReservedSeats: counts.reserved,
    updatedAt: override.updatedAt || new Date().toISOString(),
  };
}

function toCanonicalSalesChannel(
  channel: SeatSalesChannel,
): NonNullable<NonNullable<SeatMapEventOverride["nodeOverrides"]>[string]["salesChannel"]> {
  if (channel === "offline") return "offline_counter";
  if (channel === "reserved") return "reserved";
  if (channel === "complimentary") return "complimentary";
  if (channel === "none") return "none";
  return "buizz_online";
}

function fromCanonicalSalesChannel(
  channel?: NonNullable<NonNullable<SeatMapEventOverride["nodeOverrides"]>[string]["salesChannel"]>,
): SeatSalesChannel | undefined {
  if (channel === "offline_counter") return "offline";
  if (channel === "reserved") return "reserved";
  if (channel === "complimentary") return "complimentary";
  if (channel === "none") return "none";
  if (channel === "buizz_online") return "online";
  return undefined;
}

function createOrganizerOverride(eventId: string, organizerId: string, eventName: string, templateId: string): SeatMapEventOverride {
  return { id: createId("event-seat-copy"), templateId, eventId, eventName, organizerId, statusOverrides: {}, channelOverrides: {}, tierOverrides: {}, notes: {}, updatedAt: new Date().toISOString() };
}

function createAuditoriumSeedTemplate(role: MasterRole): SeatMapTemplate {
  const tiers: SeatTier[] = [
    { id: "tier-vip", name: "VIP", color: "#EC1B72", price: 2499, priceLabel: "₹2,499", channel: "online", description: "Closest premium seats", active: true },
    { id: "tier-premium", name: "Premium", color: "#EF4444", price: 1499, priceLabel: "₹1,499", channel: "online", description: "Ground floor premium", active: true },
    { id: "tier-balcony", name: "Balcony", color: "#84CC16", price: 899, priceLabel: "₹899", channel: "online", description: "Balcony seats", active: true },
    { id: "tier-silver", name: "Silver", color: "#3B82F6", price: 599, priceLabel: "₹599", channel: "offline", description: "Offline counter block", active: true },
  ];
  const sections: SeatSection[] = [
    { id: "section-vip", name: "VIP Center", type: "vip", color: "#EC1B72", tierId: "tier-vip", capacity: 0, x: 50, y: 35, width: 32, height: 18, rotation: 0, locked: false },
    { id: "section-ground", name: "Ground Floor", type: "seated", color: "#EF4444", tierId: "tier-premium", capacity: 0, x: 50, y: 55, width: 42, height: 28, rotation: 0, locked: false },
    { id: "section-left-balcony", name: "Left Balcony", type: "balcony", color: "#84CC16", tierId: "tier-balcony", capacity: 0, x: 23, y: 58, width: 24, height: 42, rotation: -16, locked: false },
    { id: "section-right-balcony", name: "Right Balcony", type: "balcony", color: "#84CC16", tierId: "tier-balcony", capacity: 0, x: 77, y: 58, width: 24, height: 42, rotation: 16, locked: false },
    { id: "section-silver", name: "Back Silver", type: "seated", color: "#3B82F6", tierId: "tier-silver", capacity: 0, x: 50, y: 82, width: 36, height: 12, rotation: 0, locked: false },
  ];
  const seats = [
    ...buildRowSeats({ section: sections[0], row: "A", startNo: 1, endNo: 12, startX: 38, startY: 31, spacing: 3.8, rowAngle: 0, arcDepth: 1, shape: "arc", tier: tiers[0], status: "available", channel: "online" }),
    ...buildRowSeats({ section: sections[0], row: "B", startNo: 1, endNo: 12, startX: 38, startY: 37, spacing: 3.8, rowAngle: 0, arcDepth: 1, shape: "arc", tier: tiers[0], status: "available", channel: "online" }),
    ...buildRowSeats({ section: sections[1], row: "C", startNo: 1, endNo: 16, startX: 32, startY: 47, spacing: 3.1, rowAngle: 0, arcDepth: 0, shape: "straight", tier: tiers[1], status: "available", channel: "online" }),
    ...buildRowSeats({ section: sections[1], row: "D", startNo: 1, endNo: 16, startX: 32, startY: 53, spacing: 3.1, rowAngle: 0, arcDepth: 0, shape: "straight", tier: tiers[1], status: "available", channel: "online" }),
    ...buildRowSeats({ section: sections[1], row: "E", startNo: 1, endNo: 16, startX: 32, startY: 61, spacing: 3.1, rowAngle: 0, arcDepth: 0, shape: "straight", tier: tiers[1], status: "reserved", channel: "reserved" }),
    ...buildRowSeats({ section: sections[2], row: "F", startNo: 1, endNo: 11, startX: 10, startY: 35, spacing: 3.6, rowAngle: 78, arcDepth: 3, shape: "curve-left", tier: tiers[2], status: "available", channel: "online" }),
    ...buildRowSeats({ section: sections[2], row: "G", startNo: 1, endNo: 11, startX: 16, startY: 38, spacing: 3.6, rowAngle: 78, arcDepth: 3, shape: "curve-left", tier: tiers[2], status: "available", channel: "online" }),
    ...buildRowSeats({ section: sections[3], row: "H", startNo: 1, endNo: 11, startX: 90, startY: 35, spacing: 3.6, rowAngle: 102, arcDepth: 3, shape: "curve-right", tier: tiers[2], status: "available", channel: "online", reverse: true }),
    ...buildRowSeats({ section: sections[3], row: "I", startNo: 1, endNo: 11, startX: 84, startY: 38, spacing: 3.6, rowAngle: 102, arcDepth: 3, shape: "curve-right", tier: tiers[2], status: "available", channel: "online", reverse: true }),
    ...buildRowSeats({ section: sections[4], row: "J", startNo: 1, endNo: 18, startX: 28, startY: 80, spacing: 2.6, rowAngle: 0, arcDepth: -2, shape: "arc", tier: tiers[3], status: "available", channel: "offline" }),
  ];
  const objects: CanvasObject[] = [
    { id: "object-stage-main", type: "stage", label: "STAGE", x: 50, y: 13, width: 19, height: 7, rotation: 0, color: "#111827" },
    { id: "object-ga", type: "standing", label: "General Admission", x: 50, y: 23, width: 23, height: 7, rotation: 0, color: "#EF4444", capacity: 180, tierId: "tier-premium" },
    { id: "object-gate-a", type: "entry", label: "GATE A", x: 22, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
    { id: "object-gate-b", type: "entry", label: "GATE B", x: 78, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
    { id: "object-organ", type: "label", label: "ORGAN", text: "ORGAN", x: 50, y: 96, width: 14, height: 5, rotation: 0, color: "#64748B" },
  ];
  return normalizeTemplate({
    id: "venue-template-grand-auditorium",
    venueName: "Buizz Grand Auditorium",
    venueCode: "BGA-PUNE-001",
    city: "Pune",
    address: "Pune, Maharashtra",
    venueType: "auditorium",
    status: "active",
    version: 1,
    totalCapacity: seats.length + 180,
    allowOrganizerStructureEdits: false,
    isDefaultForOrganizers: true,
    sections,
    tiers,
    seats,
    objects,
    canvas: { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 },
    createdAt: dateSeed,
    updatedAt: dateSeed,
    createdByRole: role,
    updatedByRole: role,
    publishedAt: dateSeed,
    publishedBy: role,
  });
}

function createScratchTemplate(role: MasterRole, base?: SeatMapTemplate): SeatMapTemplate {
  const tier = createDefaultTier();
  const section = createDefaultSection();
  return normalizeTemplate({
    id: createId("venue-template"),
    venueName: base?.venueName ? `${base.venueName} Blank` : "New Venue Seat Map",
    venueCode: base?.venueCode ? `${base.venueCode}-NEW` : "VENUE-NEW",
    city: base?.city || "Pune",
    address: base?.address || "",
    venueType: base?.venueType || "auditorium",
    status: "draft",
    version: 1,
    totalCapacity: 0,
    allowOrganizerStructureEdits: false,
    isDefaultForOrganizers: false,
    sections: [section],
    tiers: [tier],
    seats: [],
    objects: [
      { id: createId("stage"), type: "stage", label: "STAGE", x: 50, y: 14, width: 18, height: 7, rotation: 0, color: "#111827" },
      { id: createId("entry"), type: "entry", label: "GATE A", x: 25, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
      { id: createId("entry"), type: "entry", label: "GATE B", x: 75, y: 92, width: 10, height: 5, rotation: 0, color: "#22C55E" },
    ],
    canvas: { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdByRole: role,
    updatedByRole: role,
  });
}

function createDefaultTier(): SeatTier {
  return { id: "tier-general", name: "General", color: "#22C55E", price: 999, priceLabel: "₹999", channel: "online", description: "General admission seats", active: true };
}

function createDefaultSection(): SeatSection {
  return { id: "section-general", name: "General", type: "seated", color: "#22C55E", tierId: "tier-general", capacity: 0, x: 50, y: 55, width: 40, height: 32, rotation: 0, locked: false };
}

function buildRowSeats({ section, row, startNo, endNo, startX, startY, spacing, rowAngle, arcDepth, shape, tier, status, channel, reverse = false }: { section: SeatSection; row: string; startNo: number; endNo: number; startX: number; startY: number; spacing: number; rowAngle: number; arcDepth: number; shape: RowShape; tier: SeatTier; status: SeatStatus; channel: SeatSalesChannel; reverse?: boolean }): SeatNode[] {
  const count = Math.max(0, endNo - startNo + 1);
  const angle = (rowAngle * Math.PI) / 180;
  const dx = Math.cos(angle) * spacing;
  const dy = Math.sin(angle) * spacing;
  return Array.from({ length: count }, (_, index) => {
    const seatNo = reverse ? endNo - index : startNo + index;
    const centered = index - (count - 1) / 2;
    const arcOffset = shape === "straight" ? 0 : Math.sin((index / Math.max(1, count - 1)) * Math.PI) * arcDepth;
    const curveOffset = shape === "curve-left" ? index * 0.45 : shape === "curve-right" ? -index * 0.45 : 0;
    return {
      id: createId("seat"),
      label: `${row}${seatNo}`,
      sectionId: section.id,
      sectionName: section.name,
      row,
      number: String(seatNo),
      x: clamp(startX + index * dx + curveOffset, 2, 98),
      y: clamp(startY + index * dy + arcOffset + Math.abs(centered) * 0.1, 2, 98),
      radius: 1.35,
      status,
      channel,
      tierId: tier.id,
      rotation: rowAngle,
      isAccessible: false,
      isCompanion: false,
      notes: "",
    };
  });
}

function mergeSeats(existing: SeatNode[], next: SeatNode[]) {
  const keys = new Set(next.map((seat) => `${seat.sectionId}-${seat.row}-${seat.number}`));
  return [...existing.filter((seat) => !keys.has(`${seat.sectionId}-${seat.row}-${seat.number}`)), ...next];
}

function normalizeTemplate(template: SeatMapTemplate): SeatMapTemplate {
  const seats = template.seats || [];
  const sections = (template.sections || []).map((section) => ({ ...section, capacity: seats.filter((seat) => seat.sectionId === section.id).length }));
  const standingCapacity = (template.objects || []).filter((object) => object.type === "standing").reduce((sum, object) => sum + (object.capacity || 0), 0);
  return {
    ...template,
    sections,
    seats,
    objects: template.objects || [],
    tiers: template.tiers?.length ? template.tiers : [createDefaultTier()],
    canvas: template.canvas || { width: 1200, height: 780, gridSize: 2, snapToGrid: true, showGrid: true, zoom: 1, panX: 0, panY: 0 },
    totalCapacity: seats.length + standingCapacity,
  };
}

function validateTemplate(template: SeatMapTemplate): string[] {
  const issues: string[] = [];
  if (!template.venueName.trim()) issues.push("Venue name is required before publish.");
  if (!template.city.trim()) issues.push("City is required before publish.");
  if (!template.sections.length) issues.push("At least one section is required.");
  if (!template.seats.length && !template.objects.some((object) => object.type === "standing")) issues.push("Add seats or a standing zone before publish.");
  const sectionIds = new Set(template.sections.map((section) => section.id));
  if (template.seats.some((seat) => !sectionIds.has(seat.sectionId))) issues.push("Every seat must belong to a valid section.");
  const tierIds = new Set(template.tiers.map((tier) => tier.id));
  if (template.seats.some((seat) => !tierIds.has(seat.tierId))) issues.push("Some seats have broken tier references.");
  const duplicateKeys = new Set<string>();
  const seen = new Set<string>();
  for (const seat of template.seats) {
    const key = `${seat.sectionId}-${seat.row}-${seat.number}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  }
  if (duplicateKeys.size) issues.push("Duplicate seat labels exist inside same section/row.");
  return issues;
}

function getTemplateCounts(template: SeatMapTemplate) {
  return getSeatCounts(template.seats);
}

function getSeatCounts(seats: SeatNode[]): SeatMapCounts {
  return {
    total: seats.length,
    available: seats.filter((seat) => seat.status === "available").length,
    online: seats.filter((seat) => seat.channel === "online" && seat.status === "available").length,
    offline: seats.filter((seat) => seat.channel === "offline" && seat.status === "available").length,
    reserved: seats.filter((seat) => seat.status === "reserved" || seat.channel === "reserved").length,
    blocked: seats.filter((seat) => seat.status === "blocked").length,
    sold: seats.filter((seat) => seat.status === "sold").length,
    disabled: seats.filter((seat) => seat.status === "disabled").length,
    hold: seats.filter((seat) => seat.status === "hold").length,
    vip: seats.filter((seat) => seat.status === "vip").length,
    staff: seats.filter((seat) => seat.status === "staff").length,
  };
}

function statusColor(status: SeatStatus, tierColor = "#22C55E", channel: SeatSalesChannel = "online") {
  if (status === "blocked") return "#111827";
  if (status === "reserved") return "#7C3AED";
  if (status === "sold" || status === "disabled") return "#9CA3AF";
  if (status === "hold") return "#F59E0B";
  if (status === "vip") return "#EC1B72";
  if (status === "staff") return "#0EA5E9";
  if (channel === "offline") return "#3B82F6";
  if (channel === "reserved") return "#7C3AED";
  if (channel === "complimentary") return "#14B8A6";
  return tierColor || "#BBF7D0";
}

function statusLabel(status: SeatStatus) {
  return status === "sold" ? "Taken / Sold" : titleCase(status);
}

function channelLabel(channel: SeatSalesChannel) {
  if (channel === "online") return "Online booking";
  if (channel === "offline") return "Offline counter";
  if (channel === "reserved") return "Reserved allocation";
  if (channel === "complimentary") return "Complimentary";
  return "No sale channel";
}

function objectLabel(type: CanvasObjectType, objects: CanvasObject[]) {
  if (type === "stage") return "STAGE";
  if (type === "entry") return `GATE ${objects.filter((object) => object.type === "entry").length + 1}`;
  if (type === "exit") return "EXIT";
  if (type === "standing") return `Standing Zone ${objects.filter((object) => object.type === "standing").length + 1}`;
  if (type === "section-box") return `Section Block ${objects.filter((object) => object.type === "section-box").length + 1}`;
  return "Instruction Label";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function maybeSnap(value: number, canvas: SeatMapCanvasState) {
  if (!canvas.snapToGrid) return value;
  const grid = Math.max(0.5, canvas.gridSize);
  return Math.round(value / grid) * grid;
}

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function normalizeBox(box: { x1: number; y1: number; x2: number; y2: number }) {
  return { x1: Math.min(box.x1, box.x2), y1: Math.min(box.y1, box.y2), x2: Math.max(box.x1, box.x2), y2: Math.max(box.y1, box.y2) };
}
