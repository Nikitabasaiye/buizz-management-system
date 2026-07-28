
"use client";

import {
  CalendarDays,
  Clock,
  Images,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  PartyPopper,
  QrCode,
  ShieldCheck,
  Star,
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Footer } from "@/components/common/Footer";
import { startFacebookOAuth, startGoogleOAuth } from "@/features/auth/googleOAuth";
import type { DiscoveryItem } from "@/features/discovery/data";
import {
  SeatLegend,
  SeatMapRenderer,
  type SeatMapLayout,
  type SeatMapSelectionItem,
} from "@/features/seat-map";
import { shouldShowPublicSeatMap } from "@/features/seat-map/seatMapApi";
import { PublicSeatMapSelector } from "@/features/booking/components/PublicSeatMapSelector";
import { CapacityTicketSelection } from "@/features/booking/components/CapacityTicketSelection";
import type { SelectedSeatData } from "@/features/seat-map/seatMapTypes";
import {
  resolveBookingCapacityEngine,
  type BookingType,
  type CapacityTicketBlock,
  type PricingMode,
} from "@/features/booking/capacityEngine";
import { DEFAULT_PLATFORM_FEE_SETTINGS } from "@/features/platform/platformFeeSettings";
import { getCustomerBookableTickets } from "@/lib/customerTicketVisibility";
import {
  BuizzTicketCard,
  BuizzTicketGrid,
  TicketPreview,
  buildSeatGroupsFromBooking,
  createTicketQrPayload,
} from "@/features/tickets";
import { PaymentSheet } from "@/features/booking/components/PaymentSheet";
import {
  calculateBookingFees,
  readPlatformFeeSettings,
  platformFeeSettingsStorageKey,
  platformFeeSettingsUpdatedEvent,
} from "@/features/platform/platformFeeSettings";
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
  useRegisterMutation,
  useLoginMutation,
} from "@/store/api/authApi";
import {
  useAuthStore,
  type DeliveryPreference,
  type PublicUser,
} from "@/store/auth.store";
import type { UnifiedBuizzEvent } from "@/features/integration/eventLifecycle";
import { bookingToBuizzTickets } from "@/features/account/serverTicketAdapter";
import { useGetBookingDetailsQuery, useInitiateBookingMutation } from "@/store/api/bookingsApi";
import { useVerifyRazorpayPaymentMutation } from "@/store/api/paymentsApi";
import { useGetEventGalleryImagesQuery } from "@/store/api";
import {
  type BookingLineItem,
  type BuizzTicket,
  type TicketSeatGroup,
} from "@/store/ticket.store";

type BookingStepKey = "venue" | "datetime" | "seats" | "review";
type Availability = "Available" | "Fast Filling" | "Sold Out";

type VenueOption = {
  id: string;
  name: string;
  city: string;
  address: string;
  availability: Availability;
  entryGate?: string;
  parking?: string;
  rules?: string;
};

type DateOption = {
  label: string;
  availability: Availability;
  city?: string;
  slots: TimeOption[];
};

type TimeOption = {
  label: string;
  availability: Availability;
  scheduleId?: string;
  dateId?: string;
  startTime?: string;
  endTime?: string;
};

type ExperienceZone = {
  label: string;
  price: number;
  available: number;
  description: string;
  bestFor: string;
};

type PlatformFeeMode = "per_booking" | "per_ticket" | "percentage" | "none";

type PaymentInitiationPayload = {
  bookingId: string;
  itemId: string;
  eventName: string;
  date: string;
  time: string;
  city: string;
  whatsappNumber: string;
  buyerName: string;
  lineItems: BookingLineItem[];
  ticketQuantity: number;
  subtotal: number;
  platformFeeMode: PlatformFeeMode;
  platformFeePerBooking: number;
  platformFeePerTicket: number;
  platformFee: number;
  convenienceFee: number;
  taxes: number;
  total: number;
};

type TicketBlockOption = CapacityTicketBlock;

type VenueDesignTier = {
  id: string;
  name: string;
  price: number;
  available: number;
  color?: string;
  description?: string;
};

type VenueDesignConfig = {
  venueId: string;
  venueName: string;
  city: string;
  address?: string;
  layoutImage?: string;
  mode: "venue_design" | "category_layout" | "seat_map_preview";
  tiers: VenueDesignTier[];
};

type BookingUnifiedEvent = UnifiedBuizzEvent & {
  bookingType?: BookingType;
  pricingMode?: PricingMode;
};
const stepLabels: Record<BookingStepKey, string> = {
  venue: "Venue",
  datetime: "Date & Time",
  seats: "Seats",
  review: "Review",
};

const groupOptions = [
  "Solo",
  "Friends",
  "Family",
  "Team",
  "College",
  "Celebration",
];

// Load Razorpay checkout.js script dynamically (only once)
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).Razorpay) return resolve();
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.head.appendChild(script);
  });
}

export function BookingFlow({ item }: { item: DiscoveryItem }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [initiateBooking, { isLoading: isPaymentLoading }] = useInitiateBookingMutation();
  const [verifyRazorpay] = useVerifyRazorpayPaymentMutation();

  const unifiedEvent = useMemo(
    () => findUnifiedEventForBooking(item),
    [item]
  );

  const displayItem = useMemo(
    () => (unifiedEvent ? unifiedEventToBookingDiscoveryItem(unifiedEvent, item) : item),
    [item, unifiedEvent],
  );

  const capacityFlow = useMemo(
    () => resolveBookingCapacityEngine({ event: unifiedEvent, item: displayItem }),
    [displayItem, unifiedEvent]
  );

  const bookingType = capacityFlow.bookingType;
  const pricingMode = capacityFlow.pricingMode;
  const isFreeRegistration = capacityFlow.isFreeRegistration;

  const availableVenues = useMemo(
    () => buildVenueOptions(displayItem, unifiedEvent),
    [displayItem, unifiedEvent]
  );

  const visibleSteps = useMemo<BookingStepKey[]>(() => {
    const flow: BookingStepKey[] = [];
    flow.push("venue");
    // Skip datetime step for events (only needed for movies with multiple showtimes)
    if (item.kind !== "events") {
      flow.push("datetime");
    }
    flow.push("seats", "review");
    return flow;
  }, [availableVenues.length, item.kind]);

  const [step, setStep] = useState(0);
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [seatMapSelection, setSeatMapSelection] = useState<
    SeatMapSelectionItem[]
  >([]);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<SelectedSeatData[]>([]);
  const [requestedSeatCount, setRequestedSeatCount] = useState<number | null>(null);
  const [groupMode, setGroupMode] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [continueAfterAuth, setContinueAfterAuth] = useState(false);
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryVerified, setDeliveryVerified] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState("");
  const [completedBookingId, setCompletedBookingId] = useState("");
  const [completedTickets, setCompletedTickets] = useState<BuizzTicket[]>([]);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [pendingRazorpayOrder, setPendingRazorpayOrder] = useState<{
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    orderId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
  } | null>(null);

  const numericEventId = Number(item.id);
  const canLoadServerGallery = item.kind === "events" && Number.isFinite(numericEventId) && numericEventId > 0;
  const { data: galleryImages = [] } = useGetEventGalleryImagesQuery(numericEventId, {
    skip: !canLoadServerGallery,
  });

  const currentStepKey = visibleSteps[step] ?? "datetime";
  const isReviewStep = currentStepKey === "review";
  const activeVenue =
    selectedVenue !== null && availableVenues[selectedVenue]
      ? availableVenues[selectedVenue]
      : availableVenues[0];
  const activeBookingItem = useMemo(
    () => ({
      ...displayItem,
      venue: activeVenue?.name ?? displayItem.venue,
      city: activeVenue?.city ?? displayItem.city,
    }),
    [activeVenue?.city, activeVenue?.name, displayItem]
  );
  const dateOptions = useMemo(
    () => buildDateOptions(activeBookingItem, unifiedEvent, activeVenue?.id),
    [activeBookingItem, unifiedEvent, activeVenue?.id]
  );

  const timeOptions =
    selectedDate === null ? [] : dateOptions[selectedDate]?.slots ?? [];

  const selectedDateLabel =
    selectedDate === null 
      ? (item.kind === "events" ? displayItem.date || "" : "") 
      : dateOptions[selectedDate]?.label ?? "";

  const selectedTimeLabel =
    selectedTime === null 
      ? (item.kind === "events" ? displayItem.time || "" : "") 
      : timeOptions[selectedTime]?.label ?? "";

  const selectedTimeOption =
    selectedTime === null ? undefined : timeOptions[selectedTime];

  const activeVenueId = activeVenue?.id ?? "main-venue";
  const activeScheduleId =
    selectedTimeOption?.scheduleId ??
    buildSeatMapScheduleId(activeVenueId, selectedDateLabel, selectedTimeLabel);

  const activeVenueSeatMap = useMemo(
    () => resolveVenueSeatMapConfig(unifiedEvent, activeVenueId),
    [activeVenueId, unifiedEvent]
  );

  const activeScheduleSeatMap = useMemo(
    () => resolveScheduleSeatMapConfig(unifiedEvent, activeVenueId, activeScheduleId),
    [activeScheduleId, activeVenueId, unifiedEvent]
  );

  const activeSeatMapTemplateId =
    activeScheduleSeatMap?.seatMapTemplateId ??
    activeVenueSeatMap?.seatMapTemplateId ??
    unifiedEvent?.seatMapTemplateId;

  const activeSeatMapOverrideId =
    activeScheduleSeatMap?.seatMapOverrideId ??
    activeVenueSeatMap?.seatMapOverrideId ??
    unifiedEvent?.seatMapOverrideId;

  const activeSeatMapMode = activeVenueSeatMap?.seatMapMode ?? unifiedEvent?.seatMapMode ?? "capacity_only";
  const requiresSeatMapBooking = activeSeatMapMode === "seat_map";

  const usesActiveSeatMap = useMemo(
    () =>
      shouldShowPublicSeatMap({
        eventId: activeBookingItem.id,
        seatMapMode: activeSeatMapMode,
        templateId: activeSeatMapTemplateId,
        overrideId: activeSeatMapOverrideId,
      }),
    [activeBookingItem.id, activeSeatMapMode, activeSeatMapOverrideId, activeSeatMapTemplateId],
  );

  const hasBookingAccount = Boolean(user);
  const registeredWhatsappNumber = user?.phone?.trim() ?? "";

  const ticketBlockOptions = useMemo(
    () =>
      buildTicketBlockOptions(
        unifiedEvent,
        activeBookingItem,
        bookingType,
        pricingMode
      ),
    [activeBookingItem, bookingType, pricingMode, unifiedEvent]
  );

  const activeVenueDesign = useMemo(
    () =>
      resolveVenueDesignConfig({
        event: unifiedEvent,
        venueId: activeVenueId,
        item: activeBookingItem,
        blocks: ticketBlockOptions,
      }),
    [activeBookingItem, activeVenueId, ticketBlockOptions, unifiedEvent],
  );

  const usesVenueDesignBooking = !requiresSeatMapBooking && !usesActiveSeatMap && Boolean(activeVenueDesign);
  const usesWideSeatCanvas = currentStepKey === "seats";

  const lineItems = useMemo(
    () =>
      usesActiveSeatMap
        ? buildLineItemsFromSelectedSeats(selectedSeatDetails)
        : buildLineItemsFromBlockQuantities(ticketBlockOptions, quantities),
    [quantities, seatMapSelection, selectedSeatDetails, ticketBlockOptions, usesActiveSeatMap]
  );
  const subtotal = lineItems.reduce(
    (sum, current) => sum + current.price * current.quantity,
    0
  );
  const ticketQuantity = lineItems.reduce(
    (sum, current) => sum + Math.max(0, current.quantity),
    0
  );
  const [platformFeeSettingsVersion, setPlatformFeeSettingsVersion] = useState(0);

  useEffect(() => {
    const syncPlatformFeeSettings = (event?: StorageEvent | Event) => {
      if (
        !("key" in (event ?? {})) ||
        !event ||
        (event as StorageEvent).key === platformFeeSettingsStorageKey ||
        (event as StorageEvent).key === "buizz-platform-finance-rules"
      ) {
        setPlatformFeeSettingsVersion((current) => current + 1);
      }
    };

    window.addEventListener("storage", syncPlatformFeeSettings);
    window.addEventListener(platformFeeSettingsUpdatedEvent, syncPlatformFeeSettings);

    return () => {
      window.removeEventListener("storage", syncPlatformFeeSettings);
      window.removeEventListener(platformFeeSettingsUpdatedEvent, syncPlatformFeeSettings);
    };
  }, []);

  const platformFeeSettings = useMemo(
    () => DEFAULT_PLATFORM_FEE_SETTINGS,
    [platformFeeSettingsVersion],
  );

  const feeBreakdown = useMemo(
    () =>
      calculateBookingFees({
        subtotal,
        ticketQuantity,
        isFreeRegistration,
        settings: platformFeeSettings,
      }),
    [isFreeRegistration, platformFeeSettings, subtotal, ticketQuantity],
  );

  const platformFeeMode = feeBreakdown.platformFeeMode;
  const platformFeePerBooking = feeBreakdown.platformFeePerBooking;
  const platformFeePerTicket = feeBreakdown.platformFeePerTicket;
  const platformFee = feeBreakdown.platformFee;
  const convenienceFee = feeBreakdown.convenienceFee;
  const taxes = feeBreakdown.taxes;
  const total = feeBreakdown.total;

  const capacityMessage = useMemo(() => {
    if (usesActiveSeatMap) return "";

    for (const block of ticketBlockOptions) {
      const blockId = getTicketBlockId(block);
      const selectedQuantity = quantities[blockId] ?? 0;

      if (selectedQuantity <= 0) continue;

      const available = getOnlineAvailableQuantity(block);

      if (available <= 0 || block.status === "sold_out") {
        return `${block.name} is sold out.`;
      }

      if (selectedQuantity > available) {
        return `Only ${available} ${block.name} ticket(s) are available.`;
      }
    }

    return "";
  }, [quantities, ticketBlockOptions, usesActiveSeatMap]);

  const hasValidCapacity = !capacityMessage;
  const seatMapSelectionReady =
    !usesActiveSeatMap ||
    (requestedSeatCount !== null &&
      requestedSeatCount > 0 &&
      selectedSeatDetails.length === requestedSeatCount);
  const seatMapCountMessage =
    usesActiveSeatMap && requestedSeatCount
      ? selectedSeatDetails.length === requestedSeatCount
        ? `${selectedSeatDetails.length}/${requestedSeatCount} seats selected. You can continue.`
        : `Select exactly ${requestedSeatCount} seat(s). ${selectedSeatDetails.length}/${requestedSeatCount} selected.`
      : "Choose how many seats you want before selecting from the venue map.";

  const canContinue =
    (currentStepKey === "venue" &&
      selectedVenue !== null &&
      Boolean(activeVenue) &&
      activeVenue?.availability !== "Sold Out") ||
    (currentStepKey === "datetime" &&
      selectedDate !== null &&
      selectedTime !== null) ||
    (currentStepKey === "seats" &&
      lineItems.length > 0 &&
      hasValidCapacity &&
      seatMapSelectionReady) ||
    currentStepKey === "review";

  const previewTicket = useMemo(() => {
    if (!lineItems.length) {
      return null;
    }
    // For events, date/time come from the event itself, not from selection
    if (item.kind === "events" && (!displayItem.date || !displayItem.time)) {
      return null;
    }
    // For other types (movies), require date/time selection
    if (item.kind !== "events" && (!selectedDateLabel || !selectedTimeLabel)) {
      return null;
    }

    return createTicket({
      bookingId: pendingBookingId || "BUIZZ-PREVIEW",
      item: activeBookingItem,
      buyerName: user?.name || "Buizz Customer",
      buyerEmail: user?.email,
      buyerPhone: registeredWhatsappNumber || user?.phone,
      deliveryPreference: "whatsapp",
      date: selectedDateLabel,
      time: selectedTimeLabel,
      groupMode,
      lineItems,
      ticketQuantity,
      subtotal,
      platformFeeMode,
      platformFeePerBooking,
      platformFeePerTicket,
      platformFee,
      convenienceFee,
      taxes,
      total,
      selectedSeats: selectedSeatDetails,
      seatMapTemplateId: activeSeatMapTemplateId,
      seatMapOverrideId: activeSeatMapOverrideId,
      seatLockId: selectedSeatDetails.length
        ? `preview-lock-${activeBookingItem.id}`
        : undefined,
    });
  }, [
    activeBookingItem,
    activeSeatMapOverrideId,
    activeSeatMapTemplateId,
    convenienceFee,
    groupMode,
    lineItems,
    pendingBookingId,
    platformFee,
    platformFeeMode,
    platformFeePerBooking,
    platformFeePerTicket,
    registeredWhatsappNumber,
    selectedDateLabel,
    selectedSeatDetails,
    selectedTimeLabel,
    subtotal,
    taxes,
    ticketQuantity,
    total,
    user,
  ]);



  useEffect(() => {
    setStep(0);
    setSelectedVenue(availableVenues.length === 1 ? 0 : null);
    setSelectedDate(null);
    setSelectedTime(null);
    setQuantities({});
    setSeatMapSelection([]);
    setSelectedSeatDetails([]);
    setRequestedSeatCount(null);
    setReviewConfirmed(false);
    setPaymentMessage("");
    setPendingBookingId("");
    setCompletedBookingId("");
    setCompletedTickets([]);
    setPendingRazorpayOrder(null);
  }, [item.id]);




  useEffect(() => {
    if (currentStepKey === "seats" && requiresSeatMapBooking && requestedSeatCount === null) {
      setRequestedSeatCount(1);
    }
  }, [currentStepKey, requestedSeatCount, requiresSeatMapBooking]);

  useEffect(() => {
    if (item.kind !== "events") return;
    if (selectedVenue === null) return;

    const seatsStepIndex = visibleSteps.indexOf("seats");
    if (seatsStepIndex >= 0 && currentStepKey === "venue") {
      setStep(seatsStepIndex);
    }
  }, [currentStepKey, item.kind, selectedVenue, visibleSteps]);

  useEffect(() => {
    if (item.kind !== "events") return;
    if (currentStepKey !== "seats") return;
    if (!lineItems.length || !hasValidCapacity || !seatMapSelectionReady) return;

    const reviewStepIndex = visibleSteps.indexOf("review");
    if (reviewStepIndex >= 0) {
      setStep(reviewStepIndex);
    }
  }, [currentStepKey, hasValidCapacity, item.kind, lineItems.length, seatMapSelectionReady, visibleSteps]);

  useEffect(() => {
    if (!hasBookingAccount) setShowAuthModal(true);
  }, [hasBookingAccount]);

  useEffect(() => {
    if (user?.phone && user.isPhoneVerified) {
      setDeliveryPhone(user.phone);
      setDeliveryVerified(true);
    } else if (user?.phone) {
      setDeliveryPhone(user.phone);
      setDeliveryVerified(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedTime === null) return;
    const time = timeOptions[selectedTime];
    if (!time || time.availability === "Sold Out") setSelectedTime(null);
  }, [selectedTime, timeOptions]);

  useEffect(() => {
    if (selectedDate === null) return;
    const date = dateOptions[selectedDate];

    if (!date || date.availability === "Sold Out") {
      setSelectedDate(null);
      setSelectedTime(null);
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(getDraftKey(item.id));
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as {
        selectedVenue?: number | null;
        selectedDate?: number | null;
        selectedTime?: number | null;
        quantities?: Record<string, number>;
        seatMapSelection?: SeatMapSelectionItem[];
        selectedSeatDetails?: SelectedSeatData[];
        requestedSeatCount?: number | null;
        groupMode?: string;
        deliveryPhone?: string;
        deliveryVerified?: boolean;
      };

      setSelectedVenue(
        typeof draft.selectedVenue === "number"
          ? draft.selectedVenue
          : availableVenues.length === 1
            ? 0
            : null
      );
      setSelectedDate(
        typeof draft.selectedDate === "number" ? draft.selectedDate : null
      );
      setSelectedTime(
        typeof draft.selectedTime === "number" ? draft.selectedTime : null
      );
      setQuantities(draft.quantities ?? {});
      setSeatMapSelection(
        Array.isArray(draft.seatMapSelection) ? draft.seatMapSelection : []
      );
      setSelectedSeatDetails(
        Array.isArray(draft.selectedSeatDetails) ? draft.selectedSeatDetails : []
      );
      setRequestedSeatCount(
        typeof draft.requestedSeatCount === "number" ? draft.requestedSeatCount : null
      );
      setGroupMode(draft.groupMode ?? "");
      setDeliveryPhone(draft.deliveryPhone ?? "");
      setDeliveryVerified(Boolean(draft.deliveryVerified));
    } catch {
      window.localStorage.removeItem(getDraftKey(item.id));
    }
  }, [availableVenues.length, item.id]);

  useEffect(() => {
    window.localStorage.setItem(
      getDraftKey(item.id),
      JSON.stringify({
        selectedVenue,
        selectedDate,
        selectedTime,
        quantities,
        seatMapSelection,
        selectedSeatDetails,
        requestedSeatCount,
        groupMode,
        deliveryPhone,
        deliveryVerified,
      })
    );
  }, [
    deliveryPhone,
    deliveryVerified,
    groupMode,
    item.id,
    quantities,
    requestedSeatCount,
    seatMapSelection,
    selectedSeatDetails,
    selectedDate,
    selectedTime,
    selectedVenue,
  ]);

  const goNext = () => {
    if (!hasBookingAccount) {
      setContinueAfterAuth(canContinue);
      setShowAuthModal(true);
      return;
    }

    if (!canContinue || isReviewStep) return;
    setStep((current) => Math.min(visibleSteps.length - 1, current + 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(0, current - 1));
  };
  // Opens the payment sheet — actual PhonePe call happens inside the sheet
  const openPaymentSheet = () => {
    if (
      !lineItems.length ||
      !user ||
      (item.kind !== "events" && (selectedDate === null || selectedTime === null))
    ) return;
    setPaymentMessage("");
    setPendingRazorpayOrder(null);
    setShowPaymentSheet(true);
  };

  const openRazorpayPopup = ({
    razorpayOrderId,
    razorpayKeyId,
    amount,
    orderId,
    userName,
    userEmail,
    userPhone,
    bookingId,
    firstLineItemLabel,
  }: {
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    orderId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    bookingId: string;
    firstLineItemLabel: string;
  }) => {
    const options = {
      key: razorpayKeyId,
      amount: Math.round(amount * 100),
      currency: "INR",
      name: "Buizz",
      description: `${activeBookingItem.title} - ${firstLineItemLabel || 'Ticket'}`,
      image: "/images/buizz-logo.png",
      order_id: razorpayOrderId,
      prefill: {
        name: userName || user?.name || "",
        email: userEmail || user?.email || "",
        contact: userPhone || user?.phone || "",
      },
      theme: { color: "#EC1B72" },
      modal: {
        ondismiss: () => {
          setPaymentMessage("Payment cancelled. You can try again.");
        },
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          setPaymentMessage("Verifying payment…");
          setShowPaymentSheet(false);

          const verifyResult = await verifyRazorpay({
            orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }).unwrap();

          if (verifyResult.success) {
            setPendingRazorpayOrder(null);
            handlePaymentSuccess(bookingId, { allowWithoutPending: true });
          } else {
            setPaymentMessage("Payment verification failed. Please contact support.");
          }
        } catch (verifyError: any) {
          setPaymentMessage(
            verifyError?.data?.message || "Payment verification failed. Please contact support."
          );
        }
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", (response: any) => {
      setPaymentMessage(
        response?.error?.description || "Payment failed. Please try again."
      );
    });
    rzp.open();
  };

  const handlePayment = async () => {
    if (
      !lineItems.length ||
      !user ||
      (item.kind !== "events" && (selectedDate === null || selectedTime === null))
    ) {
      return;
    }

    if (!usesActiveSeatMap) {
      const invalidLineItem = lineItems.find((line) => {
        const block = ticketBlockOptions.find(
          (ticketBlock: TicketBlockOption) => ticketBlock.name === line.label,
        );
        if (!block) return true;
        const available = getOnlineAvailableQuantity(block);
        return available <= 0 || block.status === "sold_out" || line.quantity > available;
      });

      if (invalidLineItem) {
        setPaymentMessage(
          `${invalidLineItem.label} is not available for online customer booking. Please update your ticket quantity.`,
        );
        return;
      }
    }

    const bookingId = createBookingId(activeBookingItem.id);

    if (isFreeRegistration) {
      setShowPaymentSheet(false);
      handlePaymentSuccess(bookingId, { allowWithoutPending: true });
      return;
    }

    const firstLineItem = lineItems[0];
    const matchedBlock = ticketBlockOptions.find(
      (block) => block.name === firstLineItem?.label,
    );
    const ticketTypeId = matchedBlock?.id ? Number(matchedBlock.id) : null;
    const eventIdNum = Number(unifiedEvent?.id ?? activeBookingItem.id);

    if (!ticketTypeId || isNaN(eventIdNum)) {
      handlePaymentSuccess(bookingId, { allowWithoutPending: true });
      return;
    }

    // If we already have a pending Razorpay order (user re-clicked Pay), reuse it
    if (pendingRazorpayOrder) {
      await loadRazorpayScript();
      openRazorpayPopup({
        ...pendingRazorpayOrder,
        bookingId,
        firstLineItemLabel: firstLineItem?.label || 'Ticket',
      });
      return;
    }

    try {
      setPaymentMessage("Initiating payment…");
      const result = await initiateBooking({
        eventId: eventIdNum,
        ticketTypeId,
        quantity: ticketQuantity || 1,
        platformFee,
        convenienceFee,
        taxes,
      }).unwrap();

      const gateway = result.data?.gateway;
      const orderId = result.data?.orderId;

      // ── PhonePe: redirect to payment URL ───────────────────────────────────────────
      if (gateway === 'phonepe') {
        const paymentUrl = result.data?.paymentUrl;
        if (!paymentUrl) {
          setPaymentMessage("Payment URL not received. Please try again.");
          return;
        }
        if (orderId) {
          window.sessionStorage.setItem("buizz-pending-order", orderId);
          window.sessionStorage.setItem("buizz-pending-booking-return", window.location.pathname);
        }
        window.location.href = paymentUrl;
        return;
      }

      // ── Razorpay: open popup ───────────────────────────────────────────────────────────
      if (gateway === 'razorpay') {
        const { razorpayOrderId, razorpayKeyId, amount, userName, userEmail, userPhone } = result.data!;

        if (!razorpayOrderId || !razorpayKeyId) {
          setPaymentMessage("Razorpay order not received. Please try again.");
          return;
        }

        setPaymentMessage("");

        // Store order so re-clicks reuse it instead of creating a new one
        const razorpayOrderData = {
          razorpayOrderId,
          razorpayKeyId,
          amount,
          orderId: orderId!,
          userName: userName || "",
          userEmail: userEmail || "",
          userPhone: userPhone || "",
        };
        setPendingRazorpayOrder(razorpayOrderData);

        await loadRazorpayScript();
        openRazorpayPopup({
          ...razorpayOrderData,
          bookingId,
          firstLineItemLabel: firstLineItem?.label || 'Ticket',
        });
        return;
      }

      // Fallback: no gateway returned
      setPaymentMessage("Payment gateway not available. Please try again.");
    } catch (error: any) {
      const msg =
        error?.data?.message ||
        error?.message ||
        "Payment initiation failed. Please try again.";
      setPaymentMessage(msg);
    }
  };

  const handlePaymentSuccess = (
    bookingId: string,
    options?: { allowWithoutPending?: boolean }
  ) => {
    if (
      !user ||
      (!options?.allowWithoutPending && bookingId !== pendingBookingId)
    ) {
      setPaymentMessage(
        "Payment success could not be confirmed for this booking session."
      );
      return;
    }

    const tickets = createTickets({
      bookingId,
      item: activeBookingItem,
      buyerName: user.name,
      buyerEmail: user.email,
      buyerPhone: registeredWhatsappNumber,
      deliveryPreference: "whatsapp",
      date: selectedDateLabel,
      time: selectedTimeLabel,
      groupMode,
      lineItems,
      ticketQuantity,
      subtotal,
      platformFeeMode,
      platformFeePerBooking,
      platformFeePerTicket,
      platformFee,
      convenienceFee,
      taxes,
      total,
      selectedSeats: selectedSeatDetails,
      seatMapTemplateId: activeSeatMapTemplateId,
      seatMapOverrideId: activeSeatMapOverrideId,
      seatLockId: selectedSeatDetails.length ? `local-lock-${bookingId}` : undefined,
    });

    window.localStorage.removeItem(getDraftKey(item.id));
    setCompletedBookingId(bookingId);
    setCompletedTickets(tickets);
    setPaymentMessage("");
    setPendingBookingId("");
  };

  if (completedTickets.length) {
    return (
      <>
        <BookingSuccessContent
          bookingId={completedBookingId}
          tickets={completedTickets}
        />
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] pb-28 text-[var(--app-foreground)] sm:pb-8">
        <div className="mx-auto w-full max-w-[1920px] px-3 py-4 min-[360px]:px-4 sm:px-5 sm:py-6 lg:px-8 2xl:px-10">
          <BookingHeader item={activeBookingItem} />

          <EventBookingGallery
            eventTitle={activeBookingItem.title}
            fallbackImage={activeBookingItem.image}
            images={galleryImages}
          />

          <BookingStepper
            steps={visibleSteps.map((flowStep) => stepLabels[flowStep])}
            currentStep={step}
          />

          <section className={`mt-5 grid min-w-0 gap-5 ${usesWideSeatCanvas ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]"}`}>
            <div className="min-w-0 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:rounded-3xl sm:p-5 2xl:p-6">
              {currentStepKey === "venue" ? (
                <VenueSelectionStep
                  venues={availableVenues}
                  selectedVenue={selectedVenue}
                  onSelect={(index) => {
                    setSelectedVenue(index);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setQuantities({});
                    setSeatMapSelection([]);
                    setSelectedSeatDetails([]);
                    setRequestedSeatCount(null);
                  }}
                />
              ) : null}

              {currentStepKey === "datetime" ? (
                <DateTimeSelector
                  dates={dateOptions}
                  times={timeOptions}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  venue={activeBookingItem.venue}
                  city={activeBookingItem.city}
                  onDate={(index) => {
                    setSelectedDate(index);
                    setSelectedTime(null);
                    setQuantities({});
                    setSeatMapSelection([]);
                    setSelectedSeatDetails([]);
                    setRequestedSeatCount(null);
                  }}
                  onTime={setSelectedTime}
                />
              ) : null}
              {currentStepKey === "seats" ? (
                requiresSeatMapBooking ? (
                  activeSeatMapTemplateId ? (
                    <OrganizerSeatMapBookingStep
                      item={activeBookingItem}
                      venue={activeBookingItem.venue}
                      city={activeBookingItem.city}
                      date={selectedDateLabel}
                      time={selectedTimeLabel}
                      requestedSeatCount={requestedSeatCount}
                      selectedSeatCount={selectedSeatDetails.length}
                      message={seatMapCountMessage}
                      onRequestedSeatCountChange={(count) => {
                        setRequestedSeatCount(count);
                        setSelectedSeatDetails([]);
                        setSeatMapSelection([]);
                      }}
                    >
                      {requestedSeatCount ? (
                        <PublicSeatMapSelector
                          eventId={activeBookingItem.id}
                          venueId={activeVenueId}
                          scheduleId={activeScheduleId}
                          templateId={activeSeatMapTemplateId}
                          overrideId={activeSeatMapOverrideId}
                          eventTitle={activeBookingItem.title}
                          eventImage={activeBookingItem.image}
                          venueName={activeBookingItem.venue}
                          city={activeBookingItem.city}
                          dateLabel={selectedDateLabel}
                          timeLabel={selectedTimeLabel}
                          maxSelectableSeats={requestedSeatCount}
                          selectedSeats={selectedSeatDetails}
                          onSelectionChange={(seats) => {
                            const limitedSeats = seats.slice(0, requestedSeatCount);

                            setSelectedSeatDetails((currentSeats) =>
                              areSelectedSeatsSame(currentSeats, limitedSeats)
                                ? currentSeats
                                : limitedSeats,
                            );
                          }}
                          onContinue={(seats) => {
                            const limitedSeats = seats.slice(0, requestedSeatCount);

                            setSelectedSeatDetails((currentSeats) =>
                              areSelectedSeatsSame(currentSeats, limitedSeats)
                                ? currentSeats
                                : limitedSeats,
                            );
                            setSeatMapSelection([]);

                            if (limitedSeats.length === requestedSeatCount) {
                              goNext();
                            }
                          }}
                        />
                      ) : null}
                    </OrganizerSeatMapBookingStep>
                  ) : (
                    <SeatMapSetupNotReady item={activeBookingItem} />
                  )
                ) : usesVenueDesignBooking && activeVenueDesign ? (
                  <VenueDesignTicketSelection
                    design={activeVenueDesign}
                    item={activeBookingItem}
                    date={selectedDateLabel}
                    time={selectedTimeLabel}
                    bookingType={bookingType}
                    pricingMode={pricingMode}
                    blocks={ticketBlockOptions}
                    quantities={quantities}
                    capacityMessage={capacityMessage}
                    onChange={setQuantities}
                  />
                ) : ticketBlockOptions.length ? (
                  <CapacityTicketSelection
                    bookingType={bookingType}
                    pricingMode={pricingMode}
                    blocks={ticketBlockOptions}
                    quantities={quantities}
                    capacityMessage={capacityMessage}
                    onChange={setQuantities}
                  />
                ) : (
                  <OrganizerTicketSetupPending item={activeBookingItem} />
                )
              ) : null}

              {currentStepKey === "review" ? (
                <JourneyReview
                  item={activeBookingItem}
                  date={selectedDateLabel}
                  time={selectedTimeLabel}
                  lineItems={lineItems}
                  groupMode={groupMode}
                  ticketQuantity={ticketQuantity}
                  subtotal={subtotal}
                  platformFeeMode={platformFeeMode}
                  platformFeePerBooking={platformFeePerBooking}
                  platformFeePerTicket={platformFeePerTicket}
                  platformFee={platformFee}
                  convenienceFee={convenienceFee}
                  taxes={taxes}
                  total={total}
                  confirmed={reviewConfirmed}
                  paymentMessage={paymentMessage}
                  previewTicket={previewTicket}
                  onConfirmChange={(value) => {
                    setReviewConfirmed(value);
                    setPaymentMessage("");
                    setPendingBookingId("");
                  }}
                />
              ) : null}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={goBack}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/50 disabled:opacity-45 sm:w-auto"
                >
                  Back
                </button>

                {isReviewStep ? (
                  <button
                    type="button"
                    disabled={
                      !reviewConfirmed ||
                      !lineItems.length ||
                      !hasBookingAccount ||
                      !hasValidCapacity ||
                      isPaymentLoading
                    }
                    onClick={openPaymentSheet}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.34)] transition hover:bg-[#d91665] disabled:opacity-55 sm:w-auto"
                  >
                    {!hasBookingAccount ? "Login To Book" : isFreeRegistration ? "Complete Registration" : "Proceed to Pay 💳"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={goNext}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(236,27,114,0.34)] transition hover:bg-[#d91665] disabled:opacity-55 sm:w-auto"
                  >
                    {hasBookingAccount ? "Continue" : "Login To Book"}
                  </button>
                )}
              </div>
            </div>

            {usesWideSeatCanvas || currentStepKey === "review" ? null : (
              <div className="hidden xl:block">
                <BookingSummary
                  item={activeBookingItem}
                  date={selectedDateLabel || "Select date"}
                  time={selectedTimeLabel || "Select time"}
                  lineItems={lineItems}
                  groupMode={groupMode}
                  ticketQuantity={ticketQuantity}
                  subtotal={subtotal}
                  platformFeeMode={platformFeeMode}
                  platformFeePerBooking={platformFeePerBooking}
                  platformFeePerTicket={platformFeePerTicket}
                  platformFee={platformFee}
                  convenienceFee={convenienceFee}
                  taxes={taxes}
                  total={total}
                  buyer={user}
                />
              </div>
            )}
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--app-border)] bg-[color:var(--app-elevated)]/94 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-[var(--app-foreground)] shadow-[0_-18px_50px_rgba(0,0,0,0.22)] backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[var(--app-muted)]">Total</p>
              <p className="text-lg font-black">Rs. {total.toLocaleString("en-IN")}</p>
            </div>

            <button
              type="button"
              disabled={
                isReviewStep
                  ? 
                  !reviewConfirmed ||
                  !lineItems.length ||
                  !hasBookingAccount ||
                  !hasValidCapacity ||
                  isPaymentLoading
                  : !canContinue
              }
              onClick={isReviewStep ? openPaymentSheet : goNext}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black text-white disabled:opacity-50"
            >
              {!hasBookingAccount ? "Login To Book" : isReviewStep ? (isPaymentLoading ? "Redirecting…" : isFreeRegistration ? "Register" : "Pay 💳") : "Continue"}
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {showAuthModal ? (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
            setContinueAfterAuth(false);
          }}
          onVerified={() => {
            setShowAuthModal(false);

            if (continueAfterAuth && canContinue && !isReviewStep) {
              setStep((current) =>
                Math.min(visibleSteps.length - 1, current + 1)
              );
            }

            setContinueAfterAuth(false);
          }}
          setUser={setUser}
        />
      ) : null}

      <PaymentSheet
        open={showPaymentSheet}
        onClose={() => { setShowPaymentSheet(false); setPaymentMessage(""); }}
        onPay={async () => { await handlePayment(); }}
        item={activeBookingItem}
        date={selectedDateLabel}
        time={selectedTimeLabel}
        venue={activeBookingItem.venue}
        city={activeBookingItem.city}
        lineItems={lineItems}
        ticketQuantity={ticketQuantity}
        subtotal={subtotal}
        platformFee={platformFee}
        convenienceFee={convenienceFee}
        taxes={taxes}
        total={total}
        isFreeRegistration={isFreeRegistration}
        isPaymentLoading={isPaymentLoading}
        paymentMessage={paymentMessage}
        selectedSeats={selectedSeatDetails.map((s) => s.label)}
      />
    </>
  );
}

export function BookingSuccessPage({ bookingId }: { bookingId: string }) {
  const { data, isLoading, isFetching, isError } = useGetBookingDetailsQuery(bookingId);
  const tickets = useMemo(
    () => (data?.data ? bookingToBuizzTickets(data.data) : []),
    [data]
  );

  if (isLoading || isFetching) {
    return (
      <>
        <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-3 text-center text-[var(--app-foreground)]">
          <div>
            <QrCode className="mx-auto size-12 animate-pulse text-[var(--color-brand-primary)]" />
            <h1 className="mt-4 text-3xl font-black">Loading booking</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              Fetching your confirmed ticket details from the server.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (isError || !tickets.length) {
    return (
      <>
        <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-3 text-center text-[var(--app-foreground)]">
          <div>
            <QrCode className="mx-auto size-12 text-[var(--color-brand-primary)]" />
            <h1 className="mt-4 text-3xl font-black">
              Experience pass not found
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
              We could not load this booking from the server.
            </p>
            <Link
              href="/events"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-brand-primary)] px-5 text-sm font-black !text-white"
            >
              Explore Events
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <BookingSuccessContent bookingId={bookingId} tickets={tickets} />
      <Footer />
    </>
  );
}

function BookingSuccessContent({
  bookingId,
  tickets,
}: {
  bookingId: string;
  tickets: BuizzTicket[];
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--app-background)] px-3 py-6 text-[var(--app-foreground)] min-[360px]:px-4 sm:px-5 sm:py-8 lg:px-8">
      <section className="mx-auto grid w-full max-w-[1920px] gap-6">
        <div>
          <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">
            Payment successful
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Your Buizz booking pass is ready
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">
            Booking {bookingId}. Your booking-level QR is ready for verified
            entry at the venue.
          </p>
        </div>

        <BuizzTicketGrid tickets={tickets} />
        <PlatformRatingModal bookingId={bookingId} />
      </section>
    </main>
  );
}

type StoredPlatformRating = {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  approvedBy?: "admin" | "super-admin";
};

const platformRatingsKey = "buizz-platform-ratings";
const handledRatingBookingsKey = "buizz-rating-handled-bookings";

function PlatformRatingModal({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handled = readJsonStorage<string[]>(handledRatingBookingsKey, []);
    setOpen(!handled.includes(bookingId));
  }, [bookingId]);

  const markHandled = () => {
    const handled = readJsonStorage<string[]>(handledRatingBookingsKey, []);

    window.localStorage.setItem(
      handledRatingBookingsKey,
      JSON.stringify([...new Set([...handled, bookingId])]),
    );
  };

  const closeForBooking = () => {
    markHandled();
    setOpen(false);
  };

  const submitRating = () => {
    if (!rating || !comment.trim()) return;

    const ratings = readJsonStorage<StoredPlatformRating[]>(
      platformRatingsKey,
      [],
    );

    const nextRating: StoredPlatformRating = {
      id: `rating-${Date.now().toString(36)}`,
      bookingId,
      rating,
      comment: comment.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      platformRatingsKey,
      JSON.stringify([nextRating, ...ratings]),
    );

    markHandled();
    setSubmitted(true);
  };

  if (!open) return null;

  const activeRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/45 px-4 py-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={closeForBooking}
    >
      <section
        className="w-full max-w-[350px] overflow-hidden rounded-[22px] border border-[#dfe5ee] bg-white text-[#101828] shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:max-w-[380px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Buizz Feedback
              </p>

              <h2 className="mt-1 text-lg font-black leading-tight text-[#101828]">
                {submitted ? "Thank you!" : "Add your review"}
              </h2>

              <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">
                {submitted
                  ? "Your feedback will be reviewed before publishing."
                  : "Rate your booking experience."}
              </p>
            </div>

            <button
              type="button"
              onClick={closeForBooking}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-[#dfe5ee] bg-[#f8f9fd] text-[#475467] transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              aria-label="Close feedback"
            >
              <X className="size-4" />
            </button>
          </div>

          {!submitted ? (
            <>
              <div className="mt-3 rounded-2xl border border-[#eef1f6] bg-[#f8f9fd] p-3">
                <p className="text-xs font-black text-[#101828]">
                  How would you rate this booking?
                </p>

                <div className="mt-2 flex items-center justify-between gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= activeRating;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`grid size-8 place-items-center rounded-xl border transition ${active
                          ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                          : "border-[#dfe5ee] bg-white text-[#98a2b3] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                          }`}
                        aria-label={`Rate ${value}`}
                      >
                        <Star
                          className="size-4"
                          fill={active ? "currentColor" : "none"}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="mt-2 text-[11px] font-bold text-[#667085]">
                  {rating ? `${rating}/5 selected` : "Select a rating"}
                </p>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-black text-[#101828]">
                  Your feedback
                </span>

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Write a short review..."
                  className="mt-2 min-h-[68px] w-full resize-none rounded-2xl border border-[#dfe5ee] bg-[#f8f9fd] px-3 py-2.5 text-sm font-semibold text-[#101828] outline-none transition placeholder:text-[#98a2b3] focus:border-[var(--color-brand-primary)] focus:bg-white"
                />
              </label>

              <button
                type="button"
                onClick={submitRating}
                disabled={!rating || !comment.trim()}
                className="mx-auto mt-3 flex min-h-9 w-full max-w-[220px] items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white shadow-[0_12px_26px_rgba(236,27,114,0.20)] transition hover:bg-[#d91665] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit Review
              </button>

              <button
                type="button"
                onClick={() => {
                  closeForBooking();
                  router.push('/profile/tickets');
                }}
                className="mx-auto mt-2 flex min-h-8 w-fit items-center justify-center px-3 text-xs font-black text-[#667085] transition hover:text-[var(--color-brand-primary)]"
              >
                Maybe later
              </button>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/10 p-4 text-center">
              <PartyPopper className="mx-auto size-9 text-[#16A34A]" />

              <p className="mx-auto mt-3 w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#16A34A] shadow-sm">
                You selected {rating}/5
              </p>

              <h3 className="mt-3 text-xl font-black text-[#101828]">
                Feedback submitted
              </h3>

              <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">
                Thank you for helping us improve Buizz.
              </p>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/profile/tickets');
                }}
                className="mx-auto mt-4 flex min-h-9 w-full max-w-[180px] items-center justify-center rounded-xl bg-[var(--color-brand-primary)] px-4 text-xs font-black text-white transition hover:bg-[#d91665]"
              >
                View My Tickets
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function getSelectedSeatStableKey(seat: SelectedSeatData) {
  const record = seat as unknown as Record<string, unknown>;

  return [
    record.id,
    record.seatId,
    record.label,
    record.section,
    record.sectionId,
    record.tierName,
    record.price,
  ]
    .map((value) => String(value ?? ""))
    .join("|");
}

function areSelectedSeatsSame(
  currentSeats: SelectedSeatData[],
  nextSeats: SelectedSeatData[],
) {
  if (currentSeats.length !== nextSeats.length) return false;

  return currentSeats.every(
    (seat, index) =>
      getSelectedSeatStableKey(seat) ===
      getSelectedSeatStableKey(nextSeats[index]),
  );
}

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatBookingDuration(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Duration not specified";

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    const hours = Math.floor(numeric / 60);
    const minutes = Math.round(numeric % 60);
    if (hours && minutes) return `${hours}h ${minutes}m experience`;
    if (hours) return `${hours}h experience`;
    return `${minutes}m experience`;
  }

  const lower = raw.toLowerCase();
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  const minuteMatch = lower.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);

  if (hourMatch || minuteMatch) {
    const hoursValue = hourMatch ? Number(hourMatch[1]) : 0;
    const minutesValue = minuteMatch ? Number(minuteMatch[1]) : 0;
    const wholeHours = Math.floor(hoursValue);
    const extraMinutes = Math.round((hoursValue - wholeHours) * 60);
    const totalMinutes = minutesValue + extraMinutes;
    const normalizedHours = wholeHours + Math.floor(totalMinutes / 60);
    const normalizedMinutes = totalMinutes % 60;

    if (normalizedHours && normalizedMinutes) return `${normalizedHours}h ${normalizedMinutes}m experience`;
    if (normalizedHours) return `${normalizedHours}h experience`;
    if (normalizedMinutes) return `${normalizedMinutes}m experience`;
  }

  return lower.includes("experience") ? raw : `${raw} experience`;
}

function BookingHeader({ item }: { item: DiscoveryItem }) {
  const durationLabel = formatBookingDuration(item.duration);

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#070b15] text-white shadow-[0_22px_70px_rgba(0,0,0,0.32)] sm:rounded-3xl">
      <div className="grid md:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
        <div className="relative h-[160px] sm:h-[220px] xl:h-full">
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 size-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b15] via-transparent to-black/10" />
        </div>

        <div className="min-w-0 p-4 sm:p-5 xl:p-7">
          <p className="text-xs font-black text-[var(--color-brand-secondary)] sm:text-sm">
            Build your Buizz experience
          </p>

          <h1 className="mt-2 break-words text-[clamp(1.7rem,7vw,3.2rem)] font-black leading-tight tracking-[-0.04em]">
            {item.title}
          </h1>

          <div className="mt-3 grid gap-2 text-xs font-bold text-white/75 sm:grid-cols-2 sm:text-sm xl:grid-cols-4">
            <p className="flex min-w-0 items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
              <span className="min-w-0 truncate">{item.date}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
              <span className="min-w-0 truncate">
                {item.venue}, {item.city}
              </span>
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <Clock className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
              <span>{durationLabel}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <Ticket className="size-4 shrink-0 text-[var(--color-brand-primary)]" />
              <span className="min-w-0 truncate">{item.priceLabel}</span>
            </p>
          </div>

          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/72 sm:line-clamp-none">
            {item.description}
          </p>
        </div>
      </div>
    </section>
  );
}

function EventBookingGallery({
  eventTitle,
  fallbackImage,
  images,
}: {
  eventTitle: string;
  fallbackImage?: string;
  images: Array<{
    id?: number;
    image_url?: string;
    caption?: string | null;
    is_featured?: boolean | number;
  }>;
}) {
  const gallery = useMemo(() => {
    const uploadedImages = images
      .map((image) => ({
        id: image.id ?? image.image_url,
        url: image.image_url,
        caption: image.caption?.trim() || eventTitle,
        featured: image.is_featured === true || image.is_featured === 1,
      }))
      .filter((image): image is { id: string | number; url: string; caption: string; featured: boolean } => Boolean(image.url));

    if (uploadedImages.length) {
      return [...uploadedImages].sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    return fallbackImage
      ? [{ id: "fallback", url: fallbackImage, caption: eventTitle, featured: true }]
      : [];
  }, [eventTitle, fallbackImage, images]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [gallery.length]);

  if (!gallery.length) return null;

  const activeImage = gallery[Math.min(activeIndex, gallery.length - 1)] ?? gallery[0];

  return (
    <section className="mt-5 overflow-hidden rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:rounded-3xl">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="relative min-h-[240px] bg-[#070b15] sm:min-h-[360px]">
          <img
            src={activeImage.url}
            alt={activeImage.caption}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 via-black/24 to-transparent p-4 text-white sm:p-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-black uppercase backdrop-blur">
              <Images className="size-3.5 text-[var(--color-brand-primary)]" />
              Event Gallery
            </p>
            <h2 className="mt-3 line-clamp-2 text-2xl font-black leading-tight sm:text-3xl">
              {eventTitle}
            </h2>
            <p className="mt-1 text-xs font-semibold text-white/72">
              {gallery.length} organizer uploaded image{gallery.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[var(--app-border)] bg-[var(--app-subtle)] p-3 lg:max-h-[420px] lg:grid-cols-1 lg:overflow-y-auto lg:border-l lg:border-t-0">
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-[4/3] overflow-hidden rounded-2xl border text-left transition ${index === activeIndex
                ? "border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/25"
                : "border-[var(--app-border)] hover:border-[var(--color-brand-primary)]/45"
                }`}
              aria-label={`Show event gallery image ${index + 1}`}
            >
              <img src={image.url} alt={image.caption} className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
export function AuthModal({
  onClose,
  onVerified,
  setUser,
}: {
  onClose: () => void;
  onVerified: () => void;
  setUser: (user: PublicUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Real API mutations
  const [sendEmailOtpApi] = useSendOtpMutation();
  const [verifyEmailOtpApi] = useVerifyOtpMutation();
  const [sendPhoneOtpApi] = useSendPhoneOtpMutation();
  const [verifyPhoneOtpApi] = useVerifyPhoneOtpMutation();
  const [registerApi] = useRegisterMutation();
  const [loginApi, { isLoading: isLoginLoading }] = useLoginMutation();

  const resetSignupState = () => {
    setEmailOtp("");
    setEmailOtpSent(false);
    setEmailVerified(false);
    setPhone("");
    setPhoneOtp("");
    setPhoneOtpSent(false);
    setPhoneVerified(false);
    setPhoneVerificationToken("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const login = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }
    try {
      setIsLoading(true);
      const result = await loginApi({ email: loginEmail.trim(), password: loginPassword.trim() }).unwrap();
      const u = (result.data.user ?? {}) as { id?: unknown; name?: unknown; email?: unknown; phone?: unknown; isVerified?: unknown };
      setUser({
        id: String(u.id ?? loginEmail.trim()),
        name: String(u.name ?? loginEmail.trim()),
        email: String(u.email ?? loginEmail.trim()),
        phone: String(u.phone ?? ""),
        password: String(""),
        authProvider: "email" as const,
        isEmailVerified: Boolean(u.isVerified),
        isPhoneVerified: Boolean(u.phone),
        preferredDelivery: "both" as const,
      });
      onVerified();
      onClose();
    } catch (error: any) {
      setMessage(error?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailOtp = async () => {
    if (!name.trim()) {
      setMessage("Enter your name.");
      return;
    }

    if (!email.trim()) {
      setMessage("Enter your email.");
      return;
    }

    try {
      setIsLoading(true);
      await sendEmailOtpApi({ email: email.trim() }).unwrap();
      setEmailOtpSent(true);
      setMessage("OTP sent to your email.");
    } catch (error: any) {
      setMessage(error?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setMessage("Enter the OTP.");
      return;
    }

    try {
      setIsLoading(true);
      await verifyEmailOtpApi({ email: email.trim(), otp: emailOtp.trim() }).unwrap();
      setEmailVerified(true);
      setMessage("Email verified. Add your WhatsApp ticket delivery phone.");
    } catch (error: any) {
      setMessage(error?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!phone.trim()) {
      setMessage("Enter your phone number.");
      return;
    }

    const normalised = phone.trim().startsWith("+91") ? phone.trim() : `+91${phone.trim().replace(/^0/, "")}`;

    try {
      setIsLoading(true);
      await sendPhoneOtpApi({
        phone: normalised,
        email: email.trim().toLowerCase(),
        purpose: "signup",
      }).unwrap();
      setPhone(normalised);
      setPhoneOtpSent(true);
      setMessage("OTP sent to your phone.");
    } catch (error: any) {
      setMessage(error?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) {
      setMessage("Enter the OTP.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await verifyPhoneOtpApi({
        phone: phone.trim(),
        otp: phoneOtp.trim().toUpperCase(),
        purpose: "signup",
      }).unwrap();
      const verificationToken = result.data?.verificationToken;
      if (!verificationToken) throw new Error("Phone verification token was not returned");
      setPhoneVerificationToken(verificationToken);
      setPhoneVerified(true);
      setMessage("Phone verified. Create your password.");
    } catch (error: any) {
      setMessage(error?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createSignupAccount = async () => {
    if (!phoneVerified || !phoneVerificationToken) {
      setMessage("Verify your phone before creating your account.");
      return;
    }

    const validation = validateBookingPassword(password, confirmPassword);

    if (validation) {
      setMessage(validation);
      return;
    }

    try {
      setIsLoading(true);
      const result = await registerApi({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        phoneVerificationToken,
      }).unwrap();
      const createdUser = (result.data.user ?? {}) as {
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        isVerified?: boolean;
      };
      
      setUser({
        id: createdUser.id ?? email.trim(),
        name: createdUser.name ?? name.trim(),
        email: createdUser.email ?? email.trim(),
        phone: createdUser.phone ?? phone.trim(),
        password,
        authProvider: "email",
        isEmailVerified: Boolean(createdUser.isVerified ?? emailVerified),
        isPhoneVerified: phoneVerified,
        preferredDelivery: "both",
      });
      
      onVerified();
      onClose();
    } catch (error: any) {
      setMessage(error?.data?.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const continueWithGoogle = () => {
    try {
      startGoogleOAuth("customer");
    } catch (error: any) {
      setMessage(error?.message || "Google login is not configured.");
    }
  };
  const continueWithFacebook = async () => {
    try {
      await startFacebookOAuth("customer");
    } catch (error: any) {
      setMessage(error?.message || "Facebook login is not configured.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[var(--app-foreground)]/52 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[var(--app-border)] bg-[color:var(--app-elevated)]/96 text-[var(--app-foreground)] shadow-[0_28px_90px_rgba(15,23,42,0.30)] backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-subtle),var(--app-subtle))] p-5 dark:bg-[linear-gradient(135deg,var(--color-surface-inverse),var(--app-subtle))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="grid size-10 place-items-center rounded-2xl bg-[var(--color-brand-primary)] text-white shadow-[0_14px_34px_rgba(102,38,185,0.24)]">
                <ShieldCheck className="size-5" />
              </span>
              <h2 className="mt-3 text-2xl font-black">
                Continue to booking
              </h2>
              <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                Sign in or create your Buizz account before choosing venue.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs font-black text-[var(--app-foreground)] transition hover:border-[var(--color-brand-primary)]/45"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={continueWithGoogle}
              className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--color-brand-primary)]/8"
            >
              Google
            </button>
            <button
              type="button"
              onClick={continueWithFacebook}
              className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-xs font-black transition hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--color-brand-primary)]/8"
            >
              Facebook
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetSignupState();
              }}
              className={`min-h-11 rounded-xl border px-2 text-xs font-black transition ${mode === "login"
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[var(--color-brand-primary)]/50"
                }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                resetSignupState();
              }}
              className={`min-h-11 rounded-xl border px-2 text-xs font-black transition ${mode === "signup"
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[var(--color-brand-primary)]/50"
                }`}
            >
              Signup
            </button>
          </div>

          {mode === "login" ? (
            <div className="mt-4 grid gap-3">
              <AuthInput
                icon={<Mail className="size-4" />}
                label="Email ID"
                value={loginEmail}
                onChange={setLoginEmail}
              />
              <AuthInput
                icon={<KeyRound className="size-4" />}
                label="Password"
                value={loginPassword}
                onChange={setLoginPassword}
                type="password"
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <AuthInput
                icon={<User className="size-4" />}
                label="Name"
                value={name}
                onChange={setName}
              />
              <AuthInput
                icon={<Mail className="size-4" />}
                label="Email ID"
                value={email}
                onChange={setEmail}
              />

              <div>
                <AuthInput
                  icon={<Phone className="size-4" />}
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="10-digit mobile number"
                />
                <p className="mt-2 text-xs font-semibold text-[var(--app-muted)]">
                  +91 added automatically. Used for WhatsApp ticket delivery.
                </p>
              </div>

              {!phoneVerified ? (
                <>
                  {phoneOtpSent ? (
                    <AuthInput
                      icon={<ShieldCheck className="size-4" />}
                      label="Phone OTP"
                      value={phoneOtp}
                      onChange={(value) => setPhoneOtp(value.toUpperCase().slice(0, 6))}
                    />
                  ) : null}
                  <SmallActionButton
                    label={phoneOtpSent ? "Verify Phone OTP" : "Send Phone OTP"}
                    onClick={phoneOtpSent ? verifyPhoneOtp : sendPhoneOtp}
                  />
                </>
              ) : null}

              {phoneVerified ? (
                <>
                  <AuthInput
                    icon={<KeyRound className="size-4" />}
                    label="Create Password"
                    value={password}
                    onChange={setPassword}
                    type="password"
                  />
                  <AuthInput
                    icon={<KeyRound className="size-4" />}
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    type="password"
                  />
                </>
              ) : null}
            </div>
          )}

          {message ? (
            <p
              className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${message.toLowerCase().includes("verified") ||
                message.toLowerCase().includes("sent")
                ? "bg-[#22C55E]/10 text-[#22C55E]"
                : "bg-[#EF4444]/10 text-[#EF4444]"
                }`}
            >
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={mode === "signup" && !phoneVerified}
            onClick={mode === "login" ? login : createSignupAccount}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-sm font-black text-white shadow-[0_14px_34px_rgba(102,38,185,0.24)] transition hover:bg-[#d91665] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {mode === "login"
              ? (isLoginLoading ? "Logging in…" : "Login and continue")
              : "Create account and continue"}
          </button>

          {mode === "login" ? (
            <Link
              href="/reset-password"
              className="mt-3 inline-flex w-full justify-center text-xs font-black text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              Forgot Password?
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OTPVerification() {
  return null;
}

function persistBookingSession(
  user: NonNullable<PublicUser>,
  setUser: (user: PublicUser) => void
) {
  // Persist user to store directly without mock data
  setUser(user);
}

function persistBookingUser(
  user: NonNullable<PublicUser>,
  setUser: (user: PublicUser) => void,
  onSaved: () => void
) {
  persistBookingSession(user, setUser);
  onSaved();
}

function validateBookingPassword(password: string, confirmPassword: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmPassword) return "Confirm password must match.";
  return "";
}

function AuthInput({
  icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[var(--app-muted)]">
      {label}
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[var(--app-foreground)] transition focus-within:border-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)]/40">
        {icon}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--app-muted)]"
        />
      </div>
    </label>
  );
}

function SmallActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 px-4 text-sm font-black text-[var(--color-brand-primary)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
    >
      {label}
    </button>
  );
}

export function BookingStepper({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <nav className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_14px_36px_rgba(0,0,0,0.08)]">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-full px-2 py-2 text-center text-[11px] font-black transition sm:text-xs ${index <= currentStep
              ? "bg-[var(--color-brand-primary)] text-white"
              : "bg-[var(--app-subtle)] text-[var(--app-muted)]"
              }`}
          >
            <span className="block sm:hidden">{index + 1}</span>
            <span className="hidden sm:block">{label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}
function VenueSelectionStep({
  venues,
  selectedVenue,
  onSelect,
}: {
  venues: VenueOption[];
  selectedVenue: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <SectionIntro
        eyebrow="Step 1"
        title="Choose City & Venue"
        description="Select the city and venue where you want to attend this event. Dates and time slots will update based on your selected venue."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {venues.map((venue, index) => {
          const soldOut = venue.availability === "Sold Out";

          return (
            <button
              key={venue.id}
              type="button"
              disabled={soldOut}
              onClick={() => onSelect(index)}
              className={`rounded-3xl border p-4 text-left transition duration-200 ${selectedVenue === index
                ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 shadow-[0_18px_48px_rgba(236,27,114,0.18)]"
                : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/45"
                } ${soldOut ? "cursor-not-allowed opacity-45" : ""}`}
            >
              <MapPin className="size-6 text-[var(--color-brand-primary)]" />
              <h3 className="mt-3 text-lg font-black">{venue.name}</h3>
              <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
                {venue.address}
              </p>

              <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--app-muted)]">
                <p>Entry: {venue.entryGate ?? "Gate 2 - QR entry"}</p>
                <p>Parking: {venue.parking ?? "Available near main entry"}</p>
                <p>Rules: {venue.rules ?? "Carry valid ID and QR ticket"}</p>
              </div>

              <p
                className={`mt-4 text-xs font-black ${venue.availability === "Available"
                  ? "text-[#22C55E]"
                  : venue.availability === "Fast Filling"
                    ? "text-[var(--color-brand-accent)]"
                    : "text-[var(--app-muted)]"
                  }`}
              >
                {venue.availability}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateTimeSelector({
  dates,
  times,
  selectedDate,
  selectedTime,
  venue,
  city,
  onDate,
  onTime,
}: {
  dates: DateOption[];
  times: TimeOption[];
  selectedDate: number | null;
  selectedTime: number | null;
  venue: string;
  city: string;
  onDate: (index: number) => void;
  onTime: (index: number) => void;
}) {
  return (
    <div>
      <SectionIntro
        eyebrow="Step 2"
        title="Pick Date & Time"
        description={`Choose an available date and time for ${venue}, ${city}. Unavailable dates and time slots are disabled.`}
      />

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
        <Legend tone="bg-[#22C55E]" label="Available" />
        <Legend tone="bg-[var(--color-brand-accent)]" label="Fast Filling" />
        <Legend tone="bg-[var(--app-muted)]" label="Sold Out" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {dates.map((date, index) => (
          <AvailabilityCard
            key={date.label}
            option={date}
            selected={selectedDate === index}
            onClick={() => onDate(index)}
          />
        ))}
      </div>

      <h3 className="mt-6 text-lg font-black">Time slots</h3>

      {selectedDate === null ? (
        <div className="mt-3 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-black text-[var(--app-muted)]">
          Select an available date to see organizer-controlled time slots.
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {times.map((time, index) => (
            <AvailabilityCard
              key={time.label}
              option={time}
              selected={selectedTime === index}
              onClick={() => onTime(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-[var(--color-brand-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight min-[360px]:text-3xl sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function OrganizerTicketSetupPending({ item }: { item: DiscoveryItem }) {
  return (
    <div>
      <SectionIntro
        eyebrow="Step 3"
        title="Tickets will appear here"
        description="This booking screen is ready for organizer-controlled ticket blocks, seat-map tiers, and venue-layout sections. Add ticket blocks or ticket tiers from organizer/admin/super-admin to enable customer booking."
      />

      <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center sm:rounded-3xl sm:p-8">
        <Ticket className="mx-auto size-12 text-[var(--color-brand-primary)]" />
        <h3 className="mt-4 text-2xl font-black text-[var(--app-foreground)]">
          Organizer setup pending
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-[var(--app-muted)]">
          {item.title} does not have organizer ticket blocks, venue design tiers,
          or seat-map ticket tiers connected yet. No fake customer ticket options
          are shown in production mode.
        </p>
      </div>
    </div>
  );
}

function SeatMapSetupNotReady({ item }: { item: DiscoveryItem }) {
  return (
    <div>
      <SectionIntro
        eyebrow="Step 3"
        title="Seat map is not ready for booking"
        description="This event requires an event-specific seat map. Public booking will open after the organizer saves that map for this event."
      />

      <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-6 text-center sm:rounded-3xl sm:p-8">
        <Ticket className="mx-auto size-12 text-[var(--color-brand-primary)]" />
        <h3 className="mt-4 text-2xl font-black text-[var(--app-foreground)]">
          Event-specific seat map missing
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-[var(--app-muted)]">
          {item.title} is a seat-map event, but no saved organizer override is connected yet. No template or sample map is shown to customers.
        </p>
      </div>
    </div>
  );
}


function AvailabilityCard({
  option,
  selected,
  onClick,
}: {
  option: DateOption | TimeOption;
  selected: boolean;
  onClick: () => void;
}) {
  const soldOut = option.availability === "Sold Out";

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onClick}
      className={`min-h-24 rounded-2xl border p-3 text-left transition duration-200 ${selected
        ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/16 shadow-[0_18px_48px_rgba(236,27,114,0.20)]"
        : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/45"
        } ${soldOut ? "cursor-not-allowed opacity-45" : ""}`}
    >
      <p className="text-base font-black">{option.label}</p>
      {"city" in option && option.city ? (
        <p className="mt-1 text-[11px] font-bold text-[var(--app-muted)]">
          {option.city}
        </p>
      ) : null}
      <p
        className={`mt-3 text-xs font-black ${option.availability === "Available"
          ? "text-[#22C55E]"
          : option.availability === "Fast Filling"
            ? "text-[var(--color-brand-accent)]"
            : "text-[var(--app-muted)]"
          }`}
      >
        {option.availability}
      </p>
    </button>
  );
}

function OrganizerSeatMapBookingStep({
  requestedSeatCount,
  selectedSeatCount,
  message,
  onRequestedSeatCountChange,
  children,
}: {
  item: DiscoveryItem;
  venue: string;
  city: string;
  date: string;
  time: string;
  requestedSeatCount: number | null;
  selectedSeatCount: number;
  message: string;
  onRequestedSeatCountChange: (count: number) => void;
  children: ReactNode;
}) {
  const displayCount = requestedSeatCount ?? 1;
  const isSelectionComplete =
    requestedSeatCount !== null &&
    requestedSeatCount > 0 &&
    selectedSeatCount === requestedSeatCount;

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-[var(--app-border)] bg-white shadow-[0_14px_42px_rgba(15,23,42,0.08)] sm:rounded-[1.5rem]">
      <div className="border-b border-[#eef1f6] bg-[#f8f9fd] px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Step 3
            </p>
            <p className="mt-1 text-base font-black text-[#101828] sm:text-lg">
              Pick exactly {displayCount} seat{displayCount === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#667085]">
              Select ticket count here, then choose the same number of seats on the map.
            </p>
          </div>

          <CompactSeatCountStep
            value={displayCount}
            selected={selectedSeatCount}
            max={10}
            onChange={onRequestedSeatCountChange}
          />
        </div>

        <div
          className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-black sm:text-sm ${isSelectionComplete
            ? "border-[#16A34A]/25 bg-[#16A34A]/10 text-[#15803D]"
            : "border-[var(--color-brand-primary)]/20 bg-[var(--color-brand-primary)]/8 text-[var(--color-brand-primary)]"
            }`}
        >
          {isSelectionComplete
            ? `${selectedSeatCount}/${displayCount} seats selected. You can continue.`
            : message}
        </div>
      </div>

      {requestedSeatCount ? (
        <div className="seat-map-mobile-shell min-w-0 overflow-hidden bg-white">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function CompactSeatCountStep({
  value,
  selected,
  max = 10,
  onChange,
}: {
  value: number;
  selected: number;
  max?: number;
  onChange: (count: number) => void;
}) {
  const safeValue = Math.max(1, Math.min(max, value));
  const selectedSafe = Math.max(0, Math.min(selected, safeValue));
  const avatars = ["🧑🏽‍🎤", "👨🏻‍🎤", "👩🏽‍🎤", "🧔🏽‍♂️", "👩🏻‍🎤"];

  return (
    <div className="w-full rounded-2xl border border-[#e5eaf2] bg-white p-2 shadow-sm sm:w-auto sm:min-w-[290px]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={safeValue <= 1}
          onClick={() => onChange(safeValue - 1)}
          className="grid size-10 place-items-center rounded-full border border-[#dfe5ee] bg-[#f8f9fd] text-lg font-black text-[#475467] shadow-sm transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Decrease seat count"
        >
          -
        </button>

        <div className="grid min-w-0 flex-1 place-items-center">
          <span
            key={safeValue}
            className="animate-[seatCountPop_220ms_ease-out] text-[2.6rem] font-black leading-none tracking-[-0.08em] text-[#050711] sm:text-[3rem]"
          >
            {safeValue}
          </span>
          <div className="mt-1 flex justify-center -space-x-2 overflow-hidden px-2">
            {avatars.slice(0, Math.min(safeValue, avatars.length)).map((avatar, index) => {
              const active = index < selectedSafe;

              return (
                <span
                  key={`${avatar}-${index}`}
                  className={`grid size-7 shrink-0 place-items-center rounded-full border-2 border-white text-sm shadow-sm transition sm:size-8 sm:text-base ${active ? "bg-[#22C55E]" : "bg-[linear-gradient(135deg,#eff6ff,#fdf2f8)]"
                    }`}
                >
                  {avatar}
                </span>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={safeValue >= max}
          onClick={() => onChange(safeValue + 1)}
          className="grid size-10 place-items-center rounded-full border border-[#dfe5ee] bg-[#f8f9fd] text-lg font-black text-[#475467] shadow-sm transition hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Increase seat count"
        >
          +
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#f8f9fd] px-3 py-2 text-xs font-black text-[#475467]">
        <span className="text-[var(--color-brand-primary)]">
          {selectedSafe}/{safeValue}
        </span>
        <span>selected</span>
        <span className="text-[10px] text-[#667085]">Max {max}</span>
      </div>

      <style jsx>{`
        @keyframes seatCountPop {
          0% { transform: scale(0.78); opacity: 0.35; }
          65% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}


function SeatMapBookingSelector({
  layout,
  selected,
  onChange,
}: {
  layout: SeatMapLayout;
  selected: SeatMapSelectionItem[];
  onChange: (value: SeatMapSelectionItem[]) => void;
}) {
  const subtotal = selected.reduce((sum, item) => sum + item.price, 0);

  return (
    <div>
      <SectionIntro
        eyebrow="Step 3"
        title="Select Seating"
        description="Seating arrangement is controlled by organizer and approved by admin or super admin. Booked, blocked, and reserved seats stay disabled."
      />

      <div className="mt-5 grid gap-4 overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 shadow-sm sm:rounded-3xl sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--app-foreground)]">
              Choose up to 10 seats
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
              Available seats can be selected or removed instantly.
            </p>
          </div>
          <SeatLegend />
        </div>

        <div className="max-w-full overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-white p-3 [scrollbar-width:thin]">
          <SeatMapRenderer
            layout={layout}
            selected={selected}
            onSelectionChange={onChange}
            maxSelection={10}
          />
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-white p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">
                {selected.length
                  ? `${selected.length} selection(s)`
                  : "Select at least one seat or pass"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                {formatSelectedItems(selected)}
              </p>
            </div>
            <span className="inline-flex min-h-9 w-fit items-center rounded-xl bg-[var(--color-brand-primary)] px-3 text-sm font-black text-white">
              Rs. {subtotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function JourneyReview({
  item,
  date,
  time,
  lineItems,
  groupMode,
  ticketQuantity,
  subtotal,
  platformFeeMode,
  platformFeePerBooking,
  platformFeePerTicket,
  platformFee,
  convenienceFee,
  taxes,
  total,
  confirmed,
  paymentMessage,
  previewTicket,
  onConfirmChange,
}: {
  item: DiscoveryItem;
  date: string;
  time: string;
  lineItems: BookingLineItem[];
  groupMode: string;
  ticketQuantity: number;
  subtotal: number;
  platformFeeMode: PlatformFeeMode;
  platformFeePerBooking: number;
  platformFeePerTicket: number;
  platformFee: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  confirmed: boolean;
  paymentMessage: string;
  previewTicket: BuizzTicket | null;
  onConfirmChange: (value: boolean) => void;
}) {
  const ticketType =
    lineItems.map((line) => line.label).join(", ") || "Not selected";
  const quantity = lineItems.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <SectionIntro
        eyebrow="Step 4"
        title="Review & Pay"
        description="Review your final selection, ticket preview, amount summary, and terms before payment."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-[var(--color-brand-primary)]">
                  Ticket Preview
                </p>
                <h3 className="mt-1 text-lg font-black text-[var(--app-foreground)] sm:text-xl">
                  Real Buizz Ticket
                </h3>
              </div>

              <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1 text-xs font-black text-[var(--app-muted)]">
                {quantity} seat{quantity === 1 ? "" : "s"}
              </div>
            </div>

            {previewTicket ? (
              <CompactTicketPreview ticket={previewTicket} />
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[#070b15] p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.25)]">
            <p className="text-xs font-black uppercase text-[var(--color-brand-secondary)]">
              Final Selection
            </p>
            <h3 className="mt-2 text-xl font-black sm:text-2xl">{item.title}</h3>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <ReviewDetail label="Date" value={date || "Pending"} />
              <ReviewDetail label="Time" value={time || "Pending"} />
              <ReviewDetail label="Venue" value={item.venue} />
              <ReviewDetail label="City" value={item.city} />
              <ReviewDetail label="Ticket Type" value={ticketType} />
              <ReviewDetail label="Quantity" value={String(quantity)} />
              <ReviewDetail
                label="Seats / Passes"
                value={formatLineItemSeats(lineItems)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.08)] sm:p-5">
          <h3 className="text-lg font-black text-[var(--app-foreground)]">
            Amount Summary
          </h3>

          <div className="mt-4 space-y-2 text-sm font-semibold">
            <SummaryRow label="Ticket Subtotal" value={`Rs.${subtotal}`} />
            <SummaryRow
              label={formatPlatformFeeLabel(
                platformFeeMode,
                platformFeePerBooking,
                platformFeePerTicket,
                ticketQuantity
              )}
              value={`Rs.${platformFee}`}
            />
            <SummaryRow label="Convenience Fee" value={`Rs.${convenienceFee}`} />
            <SummaryRow label="Taxes" value={`Rs.${taxes}`} />
            <SummaryRow label="Grand Total" value={`Rs.${total}`} strong />
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4">
            <p className="text-base font-black text-[var(--app-foreground)]">
              Event Terms & Instructions
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm font-semibold leading-6 text-[var(--app-muted)]">
              <li>Carry a valid ID proof with your QR ticket.</li>
              <li>Entry depends on venue rules and security verification.</li>
              <li>Tickets are non-transferable unless allowed by organizer.</li>
              <li>Refund and cancellation rules depend on event policy.</li>
              <li>Arrive at least 30 minutes before the selected time.</li>
            </ul>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 text-sm font-semibold text-[var(--app-foreground)]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => onConfirmChange(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-[var(--color-brand-primary)]"
            />
            <span>
              <span className="block font-black">I confirm that:</span>
              <span className="mt-2 block text-xs leading-6 text-[var(--app-muted)]">
                My booking details are correct and I agree to Buizz terms, event instructions, and refund policy.
              </span>
            </span>
          </label>

          {paymentMessage ? (
            <p className="mt-4 rounded-xl border border-[var(--color-brand-secondary)]/25 bg-[var(--color-brand-secondary)]/10 px-3 py-2 text-sm font-black text-[var(--color-brand-secondary)]">
              {paymentMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CompactTicketPreview({ ticket }: { ticket: BuizzTicket }) {
  const seatGroups = ticket.seatGroups ?? [];
  const totalSeats = seatGroups.reduce(
    (sum, group) => sum + Math.max(0, group.quantity),
    0,
  );
  const primarySeatText = seatGroups.length
    ? seatGroups
      .map((group) => `${group.section}: ${group.seats.join(", ")}`)
      .join(" • ")
    : formatLineItemSeats(ticket.lineItems);

  return (
    <div className="mt-3 flex justify-center overflow-hidden rounded-[1.25rem] border border-[var(--app-border)] bg-[#f8f9fd] p-3">
      <article className="relative w-full max-w-[290px] overflow-hidden rounded-[1.55rem] bg-[#07020d] text-white shadow-[0_22px_70px_rgba(0,0,0,0.30)] min-[380px]:max-w-[320px] sm:max-w-[360px]">
        <div className="relative min-h-[120px] overflow-hidden">
          <img
            src={ticket.eventImage || ticket.bannerUrl}
            alt={ticket.eventName}
            className="absolute inset-0 size-full object-cover opacity-58"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#07020d]/30 to-[#07020d]" />

          <div className="relative z-10 flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-lg font-black italic tracking-[-0.05em] text-white">
                <span className="text-[var(--color-brand-primary)]">B</span>uizz
                <span className="text-[10px] text-white/65">.com</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">
                Buizz Pass
              </p>
              <span className="mt-1 inline-flex rounded-full bg-[#22C55E] px-3 py-1 text-[10px] font-black uppercase text-white">
                {ticket.status}
              </span>
            </div>
          </div>

          <div className="relative z-10 px-4 pb-4">
            <h4 className="line-clamp-2 text-xl font-black leading-tight tracking-[-0.04em]">
              {ticket.eventName}
            </h4>
            <p className="mt-2 w-fit rounded-full border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#ff61aa]">
              {ticket.category}
            </p>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <div className="grid gap-2 text-xs font-black text-white/88">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-3.5 text-[var(--color-brand-primary)]" />
              {ticket.date}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-3.5 text-[var(--color-brand-primary)]" />
              {ticket.time}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 text-[var(--color-brand-primary)]" />
              <span className="line-clamp-1">{ticket.venue}, {ticket.city}</span>
            </p>
          </div>

          <div className="border-t border-dashed border-[var(--color-brand-primary)]/55 pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff61aa]">
              Booking ID
            </p>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_92px] gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-black leading-tight">
                  {ticket.bookingId}
                </p>

                <div className="mt-3 grid gap-1.5 text-[11px] font-bold text-white/72">
                  <p className="flex gap-2">
                    <Ticket className="mt-0.5 size-3.5 shrink-0 text-[var(--color-brand-primary)]" />
                    {totalSeats || ticket.lineItems.reduce((sum, line) => sum + line.quantity, 0)} seat{(totalSeats || ticket.lineItems.length) === 1 ? "" : "s"} on this pass
                  </p>
                  <p className="flex gap-2">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--color-brand-primary)]" />
                    Scan at Gate Entry
                  </p>
                </div>
              </div>

              <div className="grid aspect-square place-items-center rounded-2xl bg-white p-2 text-black">
                <QrCode className="size-full" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.055] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff61aa]">
                Selected seats
              </p>
              <p className="text-xs font-black">{totalSeats || ticket.lineItems.length} total</p>
            </div>
            <p className="mt-2 line-clamp-3 text-xs font-bold leading-5 text-white/74">
              {primarySeatText}
            </p>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-3">
            <div>
              <p className="text-[10px] font-black uppercase text-white/42">
                Total amount paid
              </p>
              <p className="mt-1 text-xs font-bold text-white/64">
                One booking, one pass
              </p>
            </div>
            <p className="text-2xl font-black text-[#ff61aa]">
              ₹{ticket.total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function BookingSummary({
  item,
  date,
  time,
  lineItems,
  groupMode,
  ticketQuantity,
  subtotal,
  platformFeeMode,
  platformFeePerBooking,
  platformFeePerTicket,
  platformFee,
  convenienceFee,
  taxes,
  total,
  buyer,
}: {
  item: DiscoveryItem;
  date: string;
  time: string;
  lineItems: BookingLineItem[];
  groupMode: string;
  ticketQuantity: number;
  subtotal: number;
  platformFeeMode: PlatformFeeMode;
  platformFeePerBooking: number;
  platformFeePerTicket: number;
  platformFee: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  buyer: PublicUser;
}) {
  return (
    <aside className="h-fit rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] sm:rounded-3xl xl:sticky xl:top-24">
      <p className="text-xs font-black uppercase tracking-normal text-[var(--color-brand-primary)]">
        Live Summary
      </p>
      <h2 className="mt-2 text-xl font-black">Your Buizz Plan</h2>

      <div className="mt-4 flex gap-3">
        <img
          src={item.image}
          alt={item.title}
          className="size-16 shrink-0 rounded-2xl object-cover sm:size-20"
        />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black">{item.title}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
            {date} - {time}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
            {item.venue}, {item.city}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm font-semibold">
        {lineItems.length ? (
          lineItems.map((line) => (
            <SummaryRow
              key={`${line.label}-${line.price}`}
              label={formatLineItemLabel(line)}
              value={`Rs.${line.price * line.quantity}`}
            />
          ))
        ) : (
          <p className="text-[var(--app-muted)]">No seat or pass selected</p>
        )}

        {groupMode ? (
          <SummaryRow label="Group Planning" value={groupMode} />
        ) : null}
        <SummaryRow label="Subtotal" value={`Rs.${subtotal}`} />
        <SummaryRow
          label={formatPlatformFeeLabel(platformFeeMode, platformFeePerBooking, platformFeePerTicket, ticketQuantity)}
          value={`Rs.${platformFee}`}
        />
        <SummaryRow label="Convenience fee" value={`Rs.${convenienceFee}`} />
        <SummaryRow label="Taxes" value={`Rs.${taxes}`} />

        {buyer ? (
          <SummaryRow
            label="Buyer"
            value={`${buyer.name} - ${formatBuyerContact(buyer)}`}
          />
        ) : null}
      </div>

      <div className="mt-4 border-t border-[var(--app-border)] pt-4">
        <SummaryRow label="Total" value={`Rs.${total}`} strong />
      </div>
    </aside>
  );
}

function SmallTicketCard({ ticket }: { ticket: BuizzTicket }) {
  return <BuizzTicketCard ticket={ticket} />;
}

type TicketTone = {
  shell: string;
  header: string;
  accent: string;
  text: string;
  muted: string;
  chip: string;
};

function TicketInfoBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: TicketTone;
}) {
  return (
    <div className={`min-h-[58px] rounded-2xl border p-3 ${tone.chip}`}>
      <p className="text-[9px] font-black uppercase opacity-70">{label}</p>
      <p className="mt-1 line-clamp-1 text-xs font-black">{value}</p>
    </div>
  );
}

function getTicketTone(ticket: BuizzTicket): TicketTone {
  const text = `${ticket.kind} ${ticket.category} ${ticket.eventType} ${ticket.eventName}`.toLowerCase();

  if (text.includes("workshop") || text.includes("business") || text.includes("corporate")) {
    return {
      shell: "border-slate-200 bg-white text-[#07101f]",
      header: "from-transparent via-white/10 to-white",
      accent: "text-[#0B4A9E]",
      text: "text-[#07101f]",
      muted: "text-slate-500",
      chip: "border-slate-200 bg-slate-50 text-[#07101f]",
    };
  }

  if (text.includes("vip") || text.includes("table")) {
    return {
      shell: "border-[#D6B46A]/25 bg-[#090806] text-white",
      header: "from-black/5 via-black/25 to-[#090806]",
      accent: "text-[#D6B46A]",
      text: "text-white",
      muted: "text-white/65",
      chip: "border-[#D6B46A]/30 bg-[#D6B46A]/10 text-white",
    };
  }

  if (text.includes("concert") || text.includes("festival") || text.includes("music")) {
    return {
      shell: "border-[var(--color-brand-primary)]/20 bg-[#160014] text-white",
      header: "from-black/5 via-[var(--color-brand-primary)]/10 to-[#160014]",
      accent: "text-[#FF5BA5]",
      text: "text-white",
      muted: "text-white/68",
      chip: "border-[var(--color-brand-primary)]/25 bg-[var(--color-brand-primary)]/10 text-white",
    };
  }

  return {
    shell: "border-white/10 bg-[#07101f] text-white",
    header: "from-black/10 via-black/20 to-black",
    accent: "text-[#F8C85E]",
    text: "text-white",
    muted: "text-white/68",
    chip: "border-white/15 bg-white/8 text-white",
  };
}

function getTicketPassLabel(ticket: BuizzTicket) {
  const text = `${ticket.kind} ${ticket.category} ${ticket.eventType} ${ticket.eventName}`.toLowerCase();

  if (text.includes("comedy")) return "Comedy Pass";
  if (text.includes("movie")) return "Movie Ticket";
  if (text.includes("sport") || text.includes("ipl")) return "Sports Pass";
  if (text.includes("play") || text.includes("theatre")) return "Theatre Pass";
  if (text.includes("workshop")) return "Workshop Pass";
  if (text.includes("festival")) return "Festival Pass";
  if (text.includes("kids")) return "Kids Pass";
  if (text.includes("business") || text.includes("corporate")) return "Business Pass";
  if (text.includes("table") || text.includes("vip")) return "VIP Table Pass";

  return "Buizz Pass";
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 justify-between gap-3 ${strong ? "text-lg font-black" : ""}`}
    >
      <span className="min-w-0 text-[var(--app-muted)]">{label}</span>
      <span className="max-w-[55%] break-words text-right">{value}</span>
    </div>
  );
}

function formatSelectedItems(selection: SeatMapSelectionItem[]) {
  if (!selection.length) {
    return "Seat map supports available, selected, booked, blocked, and reserved states.";
  }

  const labels = selection.map((item) => `${item.sectionLabel} ${item.label}`);
  return labels.length > 8
    ? `${labels.slice(0, 8).join(", ")} +${labels.length - 8} more`
    : labels.join(", ");
}

function formatLineItemLabel(line: BookingLineItem) {
  const seats = line.seats?.length ? ` - ${formatSeatList(line.seats)}` : "";
  return `${line.label} x ${line.quantity}${seats}`;
}

function formatLineItemSeats(lineItems: BookingLineItem[]) {
  const seats = lineItems.flatMap((line) => line.seats ?? []);
  if (!seats.length) return "General selection";
  return formatSeatList(seats);
}

function formatSeatList(seats: string[]) {
  return seats.length > 10
    ? `${seats.slice(0, 10).join(", ")} +${seats.length - 10} more`
    : seats.join(", ");
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase text-white/46">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

export function QRTicket({ ticket }: { ticket: BuizzTicket }) {
  return <TicketPreview ticket={ticket} />;
}

export function downloadCalendarInvite(ticket: BuizzTicket) {
  const start = new Date(ticket.createdAt);
  start.setDate(start.getDate() + 7);
  start.setHours(18, 0, 0, 0);

  const end = new Date(start);
  end.setHours(start.getHours() + 2);

  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Buizz//Experience Pass//EN",
    "BEGIN:VEVENT",
    `UID:${ticket.bookingId}@buizz.local`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${ticket.eventName}`,
    `LOCATION:${ticket.venue}, ${ticket.city}`,
    `DESCRIPTION:Buizz Booking ${ticket.bookingId}. Keep your QR pass ready.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  downloadFile(`${ticket.bookingId}.ics`, ics, "text/calendar");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


function VenueDesignTicketSelection({
  design,
  item,
  date,
  time,
  bookingType,
  pricingMode,
  blocks,
  quantities,
  capacityMessage,
  onChange,
}: {
  design: VenueDesignConfig;
  item: DiscoveryItem;
  date: string;
  time: string;
  bookingType: BookingType;
  pricingMode: PricingMode;
  blocks: TicketBlockOption[];
  quantities: Record<string, number>;
  capacityMessage?: string;
  onChange: (value: Record<string, number>) => void;
}) {
  const totalQuantity = Object.values(quantities).reduce(
    (sum, quantity) => sum + Math.max(0, quantity),
    0,
  );

  const subtotal = blocks.reduce((sum, block) => {
    const blockId = getTicketBlockId(block);
    return sum + (quantities[blockId] ?? 0) * Number(block.price ?? 0);
  }, 0);

  const updateQuantity = (block: TicketBlockOption, nextQuantity: number) => {
    const blockId = getTicketBlockId(block);
    const available = getOnlineAvailableQuantity(block);
    const currentTotal = Object.entries(quantities).reduce(
      (sum, [id, quantity]) => sum + (id === blockId ? 0 : Math.max(0, quantity)),
      0,
    );
    const maxAllowedByBooking = Math.max(0, 10 - currentTotal);

    onChange({
      ...quantities,
      [blockId]: Math.max(0, Math.min(available, maxAllowedByBooking, nextQuantity)),
    });
  };

  const addFromTier = (tier: VenueDesignTier) => {
    const matchedBlock =
      blocks.find((block) => block.name.toLowerCase() === tier.name.toLowerCase()) ??
      blocks[0];

    if (!matchedBlock) return;

    const blockId = getTicketBlockId(matchedBlock);
    const quantity = quantities[blockId] ?? 0;
    updateQuantity(matchedBlock, quantity + 1);
  };

  const selectedLabel = totalQuantity
    ? `${totalQuantity} ticket${totalQuantity > 1 ? "s" : ""} selected`
    : "Select ticket section";

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[#f4f6fb] text-[#111827] shadow-[0_18px_58px_rgba(0,0,0,0.10)] sm:rounded-3xl">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
              Organizer venue layout
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
              Select Tickets
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {design.venueName}: {design.city} • {date || item.date} | {time || item.slot || "Time pending"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
            {selectedLabel}
          </div>
        </div>
      </div>

      <div className="grid min-h-[640px] bg-white lg:grid-cols-[390px_minmax(0,1fr)] 2xl:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="p-4 sm:p-5">
            <h3 className="text-xl font-black leading-tight">{item.title}</h3>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              {date || item.date} | {time || item.slot || "Time pending"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Please select the category of your choice. It will get highlighted on the layout.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {blocks.map((block, index) => {
              const blockId = getTicketBlockId(block);
              const quantity = quantities[blockId] ?? 0;
              const available = getOnlineAvailableQuantity(block);
              const soldOut = available <= 0 || block.status === "sold_out";
              const tier =
                design.tiers.find(
                  (current) => current.name.toLowerCase() === block.name.toLowerCase(),
                ) ?? design.tiers[index];
              const color = tier?.color || getFallbackTierColor(index);

              return (
                <article
                  key={blockId}
                  className={`bg-white p-4 transition hover:bg-slate-50 ${quantity ? "shadow-[inset_4px_0_0_var(--color-brand-primary)]" : ""} ${soldOut ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-sm border text-[10px] font-black"
                      style={{ borderColor: color, color }}
                    >
                      🎟
                    </span>

                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => !soldOut && addFromTier(tier ?? {
                        id: blockId,
                        name: block.name,
                        price: Number(block.price ?? 0),
                        available,
                        color,
                      })}
                      className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                    >
                      <h3 className="truncate text-sm font-black uppercase tracking-tight text-slate-950">
                        {block.name}
                      </h3>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {pricingMode === "free" || block.price === 0
                          ? "FREE"
                          : `₹${Number(block.price ?? 0).toLocaleString("en-IN")}`}
                      </p>
                      <p className="mt-1 text-xs font-black text-[#16A34A]">
                        {available.toLocaleString("en-IN")} available
                      </p>
                    </button>

                    <div className="inline-flex shrink-0 items-center rounded-xl border border-[var(--color-brand-primary)] bg-white text-[var(--color-brand-primary)] shadow-sm">
                      {quantity > 0 ? (
                        <>
                          <button
                            type="button"
                            disabled={quantity <= 0}
                            onClick={() => updateQuantity(block, quantity - 1)}
                            className="grid size-10 place-items-center text-xl font-black disabled:opacity-40"
                            aria-label={`Decrease ${block.name}`}
                          >
                            -
                          </button>
                          <span className="grid size-10 place-items-center text-sm font-black">
                            {quantity}
                          </span>
                        </>
                      ) : null}
                      <button
                        type="button"
                        disabled={soldOut || totalQuantity >= 10 || quantity >= available}
                        onClick={() => updateQuantity(block, quantity + 1)}
                        className={`grid min-h-10 place-items-center px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${quantity > 0 ? "size-10 px-0 text-xl" : "min-w-20"}`}
                        aria-label={`Increase ${block.name}`}
                      >
                        {quantity > 0 ? "+" : "Add"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {capacityMessage ? (
            <p className="m-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm font-black text-[#EF4444]">
              {capacityMessage}
            </p>
          ) : null}
        </aside>

        <section className="relative flex min-w-0 flex-col bg-white">
          <div className="border-b border-slate-200 bg-[#e5e5e5] px-4 py-3 text-center text-base font-black text-slate-950">
            {design.venueName}: {design.city}
          </div>

          <div className="relative min-h-[540px] flex-1 overflow-auto p-4 sm:p-6">
            {design.layoutImage ? (
              <div className="mx-auto grid min-h-[520px] min-w-[760px] place-items-center">
                <img
                  src={design.layoutImage}
                  alt={`${design.venueName} venue layout`}
                  className="max-h-[680px] w-full max-w-5xl rounded-2xl object-contain"
                />
              </div>
            ) : (
              <GeneratedVenueDesignMap
                design={design}
                quantities={quantities}
                blocks={blocks}
                onSelectTier={addFromTier}
              />
            )}

            <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-4 lg:flex">
              <button className="grid size-10 place-items-center rounded-full border border-slate-300 bg-white text-2xl font-black shadow-sm" type="button">
                +
              </button>
              <button className="grid size-10 place-items-center rounded-full border border-slate-300 bg-white text-2xl font-black shadow-sm" type="button">
                -
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="size-4 border border-[#22C55E]" />Available</span>
              <span className="inline-flex items-center gap-2"><span className="size-4 bg-[#22C55E]" />Selected</span>
              <span className="inline-flex items-center gap-2"><span className="size-4 bg-slate-300" />Sold</span>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/96 px-4 py-4 shadow-[0_-12px_35px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500">{selectedLabel}</p>
                <p className="text-2xl font-black text-slate-950">₹{subtotal.toLocaleString("en-IN")}</p>
              </div>
              <p className="text-sm font-bold text-slate-500">
                Press Continue below to review and pay
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function GeneratedVenueDesignMap({
  design,
  quantities,
  blocks,
  onSelectTier,
}: {
  design: VenueDesignConfig;
  quantities: Record<string, number>;
  blocks: TicketBlockOption[];
  onSelectTier: (tier: VenueDesignTier) => void;
}) {
  const sections = design.tiers.length
    ? design.tiers
    : [
      { id: "general", name: "General", price: 0, available: 0, color: "#EC1B72" },
    ];

  const blockByName = new Map(blocks.map((block) => [block.name.toLowerCase(), block]));

  return (
    <div className="mx-auto flex min-h-[560px] min-w-[760px] max-w-5xl flex-col items-center justify-end gap-5 p-6 text-slate-950">
      <div className="relative grid w-full max-w-4xl place-items-center gap-4">
        {sections.slice().reverse().map((tier, index) => {
          const block = blockByName.get(tier.name.toLowerCase());
          const quantity = block ? quantities[getTicketBlockId(block)] ?? 0 : 0;
          const color = tier.color || getFallbackTierColor(index);
          const curved = index >= sections.length - 2;

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelectTier(tier)}
              className={`grid min-h-16 place-items-center border text-sm font-black uppercase tracking-tight shadow-sm transition hover:-translate-y-1 hover:shadow-md ${curved ? "w-[74%] rounded-t-[120px]" : "w-[55%] rounded-md"}`}
              style={{
                borderColor: color,
                backgroundColor: quantity ? color : `${color}55`,
                color: quantity ? "#ffffff" : "#111827",
              }}
            >
              {tier.name}
            </button>
          );
        })}
      </div>

      <div className="grid h-14 w-56 place-items-center rounded-sm border border-slate-300 bg-slate-100 text-2xl font-black">
        STAGE
      </div>
    </div>
  );
}

function TicketBlockBookingSelector({
  bookingType,
  pricingMode,
  blocks,
  quantities,
  capacityMessage,
  onChange,
}: {
  bookingType: BookingType;
  pricingMode: PricingMode;
  blocks: TicketBlockOption[];
  quantities: Record<string, number>;
  capacityMessage?: string;
  onChange: (value: Record<string, number>) => void;
}) {
  const totalQuantity = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  const updateQuantity = (block: TicketBlockOption, nextQuantity: number) => {
    const blockId = getTicketBlockId(block);
    const available = getOnlineAvailableQuantity(block);

    onChange({
      ...quantities,
      [blockId]: Math.max(0, Math.min(available, nextQuantity)),
    });
  };

  return (
    <div>
      <SectionIntro
        eyebrow="Step 3"
        title={
          pricingMode === "free" || bookingType === "free_registration"
            ? "Select Registration Pass"
            : bookingType === "slot_based"
              ? "Select Slot Pass"
              : "Select Ticket Block"
        }
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] p-3">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-[var(--color-brand-primary)]">
              {pricingMode === "free" ? "Free registration" : "Ticket blocks"}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              {totalQuantity}/10 selected
            </p>
          </div>

          <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">
            {pricingMode === "free" ? "FREE" : "Online Inventory"}
          </span>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          {blocks.map((block) => {
            const blockId = getTicketBlockId(block);
            const quantity = quantities[blockId] ?? 0;
            const available = getOnlineAvailableQuantity(block);
            const soldOut = available <= 0 || block.status === "sold_out";

            return (
              <article
                key={blockId}
                className={`grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${soldOut ? "opacity-50" : ""
                  }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-black text-[var(--app-foreground)]">
                      {block.name}
                    </h3>

                    <span className="text-sm font-black text-[var(--app-foreground)]">
                      {pricingMode === "free" || block.price === 0
                        ? "FREE"
                        : `Rs. ${block.price.toLocaleString("en-IN")}`}
                    </span>

                    <span className="text-xs font-bold text-[var(--app-muted)]">
                      {available.toLocaleString("en-IN")} online left
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                    Total {block.totalQuantity.toLocaleString("en-IN")} • Offline{" "}
                    {(block.offlineQuantity ?? 0).toLocaleString("en-IN")} •
                    Reserved {(block.reservedQuantity ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="inline-flex w-fit max-w-full items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-1">
                  <QtyButton
                    label={`Decrease ${block.name}`}
                    disabled={quantity <= 0}
                    onClick={() => updateQuantity(block, quantity - 1)}
                  >
                    -
                  </QtyButton>
                  <span className="grid size-9 place-items-center text-sm font-black">
                    {quantity}
                  </span>

                  <QtyButton
                    label={`Increase ${block.name}`}
                    disabled={soldOut || totalQuantity >= 10 || quantity >= available}
                    onClick={() => updateQuantity(block, quantity + 1)}
                  >
                    +
                  </QtyButton>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {capacityMessage ? (
        <p className="mt-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm font-black text-[#EF4444]">
          {capacityMessage}
        </p>
      ) : (
        <p className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">
          Select at least one available online ticket/pass to continue.
        </p>
      )}
    </div>
  );
}

function formatPlatformFeeLabel(
  mode: PlatformFeeMode,
  perBooking: number,
  perTicket: number,
  quantity: number,
) {
  if (mode === "none") return "Platform fee";
  if (mode === "per_booking") return `Platform fee (per booking)`;
  if (mode === "per_ticket") return `Platform fee (Rs.${perTicket} x ${quantity} ticket${quantity === 1 ? "" : "s"})`;
  return "Platform fee";
}

function resolvePlatformFeePerBooking(
  event: BookingUnifiedEvent | null,
  item: DiscoveryItem,
) {
  const eventRecord = event as Record<string, unknown> | null;
  const itemRecord = item as unknown as Record<string, unknown>;

  const directValue = firstPositiveNumber([
    eventRecord?.platformFeePerBooking,
    eventRecord?.perBookingPlatformFee,
    eventRecord?.bookingPlatformFee,
    eventRecord?.customerPlatformFeePerBooking,
    itemRecord.platformFeePerBooking,
    itemRecord.perBookingPlatformFee,
    itemRecord.bookingPlatformFee,
    itemRecord.customerPlatformFeePerBooking,
  ]);

  if (directValue > 0) return directValue;

  const eventFeeConfig = eventRecord?.platformFeeConfig as Record<string, unknown> | undefined;
  const itemFeeConfig = itemRecord.platformFeeConfig as Record<string, unknown> | undefined;
  const configValue = firstPositiveNumber([
    eventFeeConfig?.amount,
    eventFeeConfig?.perBookingAmount,
    eventFeeConfig?.bookingAmount,
    itemFeeConfig?.amount,
    itemFeeConfig?.perBookingAmount,
    itemFeeConfig?.bookingAmount,
  ]);

  return configValue > 0 ? configValue : 20;
}

function firstPositiveNumber(values: unknown[]) {
  for (const value of values) {
    const numberValue = toMoneyNumber(value);
    if (numberValue > 0) return numberValue;
  }

  return 0;
}

function toMoneyNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function findUnifiedEventForBooking(item: DiscoveryItem): BookingUnifiedEvent | null {
  return null;
}

function getBookingRouteIdFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const bookingIndex = parts.indexOf("booking");

  if (bookingIndex > 0) {
    return normalizeRouteMatchValue(parts[bookingIndex - 1]);
  }

  return "";
}

function normalizeRouteMatchValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeTitleMatchValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function unifiedEventToBookingDiscoveryItem(
  event: BookingUnifiedEvent,
  fallback: DiscoveryItem,
): DiscoveryItem {
  const kind = getBookingDiscoveryKind(event, fallback);
  const price = Number(event.priceMin ?? fallback.price ?? 0);
  const category = event.subCategory || event.category || fallback.category || "Event";
  const date = event.date || fallback.date || "Date pending";
  const venue = event.venueName || fallback.venue || "Venue pending";
  const city = event.city || fallback.city || "City pending";
  const image = event.bannerImage || fallback.image;

  return {
    ...fallback,
    id: event.id,
    title: event.title || fallback.title,
    kind,
    category,
    genre: event.subCategory || event.category || fallback.genre || category,
    date,
    dateValue: event.date || fallback.dateValue || date,
    venue,
    city,
    duration: event.duration || fallback.duration,
    price,
    priceLabel: price > 0 ? `Rs. ${price.toLocaleString("en-IN")} onwards` : "Free",
    image,
    badge: fallback.badge || "Published",
    description: getBookingEventDescription(event, fallback),
    tags: Array.from(
      new Set([
        event.category,
        event.subCategory,
        event.city,
        ...(Array.isArray(fallback.tags) ? fallback.tags : []),
      ].filter(Boolean).map(String)),
    ),
    quickFilters: Array.isArray(fallback.quickFilters) ? fallback.quickFilters : [],
    href: `/${kind}/${event.id}`,
    slot: event.time ? `${event.date || date} at ${event.time}` : fallback.slot || date,
  } as DiscoveryItem;
}

function getBookingDiscoveryKind(
  event: BookingUnifiedEvent,
  fallback: DiscoveryItem,
): DiscoveryItem["kind"] {
  const routeKind = getBookingKindFromPathname(
    typeof window === "undefined" ? "" : window.location.pathname,
  );

  if (routeKind) return routeKind;

  if (fallback.kind === "plays" || fallback.kind === "activities" || fallback.kind === "events") {
    return fallback.kind;
  }

  const value = `${event.category} ${event.subCategory ?? ""}`.toLowerCase();

  if (value.includes("play") || value.includes("theatre")) return "plays";
  if (value.includes("activit") || value.includes("workshop")) return "activities";
  return "events";
}

function getBookingKindFromPathname(pathname: string): DiscoveryItem["kind"] | null {
  const firstPart = pathname.split("/").filter(Boolean)[0];

  if (firstPart === "plays" || firstPart === "activities" || firstPart === "events") {
    return firstPart;
  }

  return null;
}

function getBookingEventDescription(event: BookingUnifiedEvent, fallback: DiscoveryItem) {
  const record = event as Record<string, unknown>;
  const keys = [
    "aboutEvent",
    "aboutThisEvent",
    "eventAbout",
    "eventOverview",
    "organizerDescription",
    "publicDescription",
    "shortDescription",
    "description",
  ];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return fallback.description || "Organizer-managed event details will be updated soon.";
}

function buildLineItemsFromBlockQuantities(
  blocks: TicketBlockOption[],
  quantities: Record<string, number>
): BookingLineItem[] {
  const lineItems: BookingLineItem[] = [];

  for (const block of blocks) {
    const blockId = getTicketBlockId(block);
    const quantity = quantities[blockId] ?? 0;

    if (quantity <= 0) continue;

    lineItems.push({
      label: block.name,
      price: block.price,
      quantity,
      seats: [block.name],
    });
  }

  return lineItems;
}

function buildLineItemsFromSelectedSeats(seats: SelectedSeatData[]): BookingLineItem[] {
  const grouped = new Map<string, BookingLineItem>();

  for (const seat of seats) {
    const label = seat.tierName || seat.section || "Selected Seat";
    const key = `${label}-${seat.price}`;
    const current = grouped.get(key);

    if (current) {
      current.quantity += 1;
      current.seats = [...(current.seats ?? []), seat.label];
      current.selectedSeats = [...(current.selectedSeats ?? []), seat];
      continue;
    }

    grouped.set(key, {
      label,
      price: seat.price,
      quantity: 1,
      seats: [seat.label],
      selectedSeats: [seat],
    });
  }

  return Array.from(grouped.values());
}

function buildTicketBlockOptions(
  event: BookingUnifiedEvent | null,
  item: DiscoveryItem,
  bookingType: BookingType,
  pricingMode: PricingMode
): TicketBlockOption[] {
  // Prefer event.ticketBlocks, then fall back to item.ticketBlocks (set by serverEventToDiscoveryItem)
  const rawBlocks = (event?.ticketBlocks ?? (item as any).ticketBlocks) as TicketBlockOption[] | undefined;

  if (Array.isArray(rawBlocks) && rawBlocks.length) {
    const customerBlocks = getCustomerBookableTickets(rawBlocks);

    return customerBlocks.map((block, index) => {
      const totalQuantity = Number(
        block.totalQuantity ?? block.onlineQuantity ?? 0,
      );

      const onlineQuantity = Number(
        block.onlineQuantity ?? block.totalQuantity ?? 0,
      );

      return {
        blockId: block.id ?? `block-${index + 1}`,
        id: block.id,
        name: block.name,
        price: pricingMode === "free" ? 0 : Number(block.price ?? 0),
        totalQuantity,
        onlineQuantity,
        offlineQuantity: Number(block.offlineQuantity ?? 0),
        reservedQuantity: Number(block.reservedQuantity ?? 0),
        soldOnline: Number(block.soldOnline ?? countSoldOnlineForBlock(event?.id ?? item.id, block.name)),
        status: "active",
      };
    });
  }

  const organizerTierBlocks = buildTicketBlocksFromOrganizerTiers(
    event,
    item,
    pricingMode,
  );

  if (organizerTierBlocks.length) {
    return organizerTierBlocks;
  }

  if (pricingMode === "free" || bookingType === "free_registration") {
    return [
      {
        blockId: "registration-pass",
        name: "Registration Pass",
        price: 0,
        totalQuantity: 500,
        onlineQuantity: 500,
        offlineQuantity: 0,
        reservedQuantity: 0,
        soldOnline: 0,
        status: "active",
      },
    ];
  }

  return [];
}

function buildTicketBlocksFromOrganizerTiers(
  event: BookingUnifiedEvent | null,
  item: DiscoveryItem,
  pricingMode: PricingMode,
): TicketBlockOption[] {
  const eventRecord = event as Record<string, unknown> | null;
  const venueSeatMaps = Array.isArray(event?.venueSeatMaps) ? event.venueSeatMaps : [];

  const rawTiers = [
    ...(Array.isArray(eventRecord?.ticketTiers) ? eventRecord.ticketTiers : []),
    ...venueSeatMaps.flatMap((venue) =>
      Array.isArray((venue as Record<string, unknown>).ticketTiers)
        ? ((venue as Record<string, unknown>).ticketTiers as unknown[])
        : [],
    ),
  ];

  const normalizedTiers = rawTiers
    .map((tier, index) => normalizeVenueDesignTier(tier, index))
    .filter(Boolean) as VenueDesignTier[];

  return normalizedTiers.map((tier, index) => {
    const quantity = Math.max(0, Number(tier.available || 0));
    const soldOnline = event ? countSoldOnlineForBlock(event.id, tier.name) : 0;

    return {
      blockId: tier.id || `organizer-tier-${index + 1}`,
      id: tier.id,
      name: tier.name,
      price: pricingMode === "free" ? 0 : Number(tier.price || item.price || 0),
      totalQuantity: quantity,
      onlineQuantity: quantity,
      offlineQuantity: 0,
      reservedQuantity: 0,
      soldOnline,
      status: quantity > 0 && soldOnline >= quantity ? "sold_out" : "active",
    };
  });
}

function countSoldOnlineForBlock(eventId: string, blockName: string) {
  void eventId;
  void blockName;
  return 0;
}

function getTicketBlockId(block: TicketBlockOption) {
  return String(block.blockId ?? block.id ?? block.name);
}

function getOnlineAvailableQuantity(block: TicketBlockOption) {
  return Math.max(
    0,
    Number(block.onlineQuantity ?? block.totalQuantity ?? 0) -
    Number(block.soldOnline ?? 0)
  );
}

function mapSlotAvailability(status?: string): Availability {
  if (status === "sold_out") return "Sold Out";
  if (status === "fast_filling") return "Fast Filling";
  return "Available";
}

function formatBookingDateLabel(value: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatBookingTimeLabel(start?: string, end?: string) {
  if (!start && !end) return "Time pending";
  return end ? `${start} - ${end}` : String(start);
}

function buildVenueOptions(
  item: DiscoveryItem,
  unifiedEvent?: BookingUnifiedEvent | null
): VenueOption[] {
  if (Array.isArray(unifiedEvent?.venues) && unifiedEvent.venues.length) {
    return unifiedEvent.venues.map((venue, index) => ({
      id: venue.venueId ?? `venue-${index + 1}`,
      name: venue.venueName ?? item.venue,
      city: venue.city ?? item.city,
      address: venue.address ?? `${venue.venueName ?? item.venue}, ${venue.city ?? item.city}`,
      availability: "Available",
      entryGate: "Gate 2 - QR entry",
      parking: "Available near main entry",
      rules: "Carry valid ID and keep QR ready",
    }));
  }

  const possibleVenues = (item as DiscoveryItem & { venues?: VenueOption[] }).venues;

  if (Array.isArray(possibleVenues) && possibleVenues.length) {
    return possibleVenues.map((venue, index) => ({
      id: venue.id ?? `venue-${index + 1}`,
      name: venue.name,
      city: venue.city ?? item.city,
      address: venue.address ?? `${venue.name}, ${venue.city ?? item.city}`,
      availability: venue.availability ?? "Available",
      entryGate: venue.entryGate,
      parking: venue.parking,
      rules: venue.rules,
    }));
  }

  return [
    {
      id: "main-venue",
      name: item.venue,
      city: item.city,
      address: `${item.venue}, ${item.city}`,
      availability: "Available",
      entryGate: "Gate 2 - QR entry",
      parking: "Paid parking near main entry",
      rules: "Carry valid ID and keep QR ready",
    },
  ];
}
function buildDateOptions(
  item: DiscoveryItem,
  unifiedEvent?: BookingUnifiedEvent | null,
  selectedVenueId?: string
): DateOption[] {
  const unifiedVenue =
    unifiedEvent?.venues?.find((venue) => venue.venueId === selectedVenueId) ??
    unifiedEvent?.venues?.[0];

  if (unifiedVenue?.schedules?.length) {
    return unifiedVenue.schedules.map((schedule) => {
      const slots = schedule.timeSlots?.length
        ? schedule.timeSlots.map((slot, slotIndex) => ({
          label: formatBookingTimeLabel(slot.startTime, slot.endTime),
          availability: mapSlotAvailability(slot.availabilityStatus),
          scheduleId: buildSeatMapScheduleId(unifiedVenue.venueId, schedule.date ?? item.date, slot.startTime ?? String(slotIndex + 1)),
          dateId: schedule.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
        : [
          {
            label: formatBookingTimeLabel(undefined, undefined),
            availability: "Available" as Availability,
            scheduleId: buildSeatMapScheduleId(unifiedVenue.venueId, schedule.date ?? item.date, "default"),
            dateId: schedule.date,
          },
        ];

      return {
        label: formatBookingDateLabel(schedule.date ?? item.date),
        availability: slots.every((slot) => slot.availability === "Sold Out")
          ? "Sold Out"
          : slots.some((slot) => slot.availability === "Fast Filling")
            ? "Fast Filling"
            : "Available",
        city: unifiedVenue.city ?? item.city,
        slots,
      };
    });
  }

  const baseSlots: TimeOption[] =
    item.kind === "activities"
      ? [
        { label: "06:00 PM", availability: "Available", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", item.date, "06:00 PM") },
        { label: "07:30 PM", availability: "Fast Filling", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", item.date, "07:30 PM") },
        { label: "09:00 PM", availability: "Sold Out", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", item.date, "09:00 PM") },
      ]
      : [
        { label: "04:00 PM", availability: "Available", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", item.date, "04:00 PM") },
        { label: "07:30 PM", availability: "Fast Filling", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", item.date, "07:30 PM") },
        {
          label: "09:00 PM",
          availability: item.popularity > 88 ? "Sold Out" : "Available",
          scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", item.date, "09:00 PM"),
        },
      ];

  return [
    {
      label: item.date.replace(/,.*/, ""),
      availability: "Available",
      city: item.city,
      slots: baseSlots.slice(0, item.kind === "activities" ? 3 : 2),
    },
    {
      label: "Sat 13 Jun",
      availability: "Fast Filling",
      city: item.city,
      slots: [
        { label: "05:00 PM", availability: "Fast Filling", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", "Sat 13 Jun", "05:00 PM") },
        { label: "08:00 PM", availability: "Available", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", "Sat 13 Jun", "08:00 PM") },
      ],
    },
    {
      label: "Sun 14 Jun",
      availability: "Sold Out",
      city: item.city,
      slots: [
        { label: "06:00 PM", availability: "Sold Out", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", "Sun 14 Jun", "06:00 PM") },
        { label: "09:00 PM", availability: "Sold Out", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", "Sun 14 Jun", "09:00 PM") },
      ],
    },
    {
      label: "Fri 19 Jun",
      availability: "Available",
      city: item.city,
      slots: [
        { label: "04:30 PM", availability: "Available", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", "Fri 19 Jun", "04:30 PM") },
        { label: "08:30 PM", availability: "Fast Filling", scheduleId: buildSeatMapScheduleId(selectedVenueId ?? "main-venue", "Fri 19 Jun", "08:30 PM") },
      ],
    },
  ];
}


function resolveVenueDesignConfig({
  event,
  venueId,
  item,
  blocks,
}: {
  event?: BookingUnifiedEvent | null;
  venueId: string;
  item: DiscoveryItem;
  blocks: TicketBlockOption[];
}): VenueDesignConfig | null {
  const eventRecord = event as Record<string, unknown> | null | undefined;
  const itemRecord = item as unknown as Record<string, unknown>;
  const venueSeatMaps = Array.isArray(event?.venueSeatMaps) ? event.venueSeatMaps : [];

  const rawVenueDesign =
    venueSeatMaps.find((config) => config.venueId === venueId) ??
    venueSeatMaps[0] ??
    pickNestedRecord(eventRecord, [
      "venueDesign",
      "venueLayout",
      "layout",
      "categoryLayout",
      "visualLayout",
      "seatMapPreview",
    ]) ??
    pickNestedRecord(itemRecord, [
      "venueDesign",
      "venueLayout",
      "layout",
      "categoryLayout",
      "visualLayout",
      "seatMapPreview",
    ]) ??
    undefined;

  const rawRecord = rawVenueDesign as Record<string, unknown> | undefined;
  const layoutImage =
    getVenueDesignImage(rawRecord) ||
    getVenueDesignImage(eventRecord) ||
    getVenueDesignImage(itemRecord);

  const rawMode = String(
    rawRecord?.seatMapMode ??
    rawRecord?.mode ??
    eventRecord?.seatMapMode ??
    itemRecord.seatMapMode ??
    itemRecord.bookingLayoutMode ??
    "",
  );

  const rawTiers = firstArrayValue([
    rawRecord?.ticketTiers,
    rawRecord?.tiers,
    rawRecord?.sections,
    rawRecord?.categories,
    eventRecord?.ticketTiers,
    eventRecord?.tiers,
    itemRecord.ticketTiers,
    itemRecord.tiers,
  ]);

  const designTiersFromLayout = rawTiers
    .map((tier, index) => normalizeVenueDesignTier(tier, index))
    .filter(Boolean) as VenueDesignTier[];

  const hasOrganizerVenueDesign = Boolean(
    layoutImage ||
    rawMode === "venue_design" ||
    rawMode === "category_layout" ||
    rawMode === "capacity_with_layout" ||
    rawMode === "seat_map_preview" ||
    rawRecord?.venueLayout ||
    rawRecord?.layout ||
    designTiersFromLayout.length,
  );

  if (!hasOrganizerVenueDesign) return null;

  const blockTiers = blocks.map((block, index) => {
    const matchedTier =
      designTiersFromLayout.find(
        (tier) => tier.name.toLowerCase() === block.name.toLowerCase(),
      ) ?? designTiersFromLayout[index];

    return {
      id: getTicketBlockId(block),
      name: block.name,
      price: Number(block.price ?? matchedTier?.price ?? 0),
      available: getOnlineAvailableQuantity(block) || matchedTier?.available || 0,
      color: matchedTier?.color || getFallbackTierColor(index),
      description: matchedTier?.description,
    };
  });

  const venueName = String(rawRecord?.venueName ?? rawRecord?.name ?? item.venue);
  const city = String(rawRecord?.city ?? item.city);

  return {
    venueId,
    venueName,
    city,
    address: typeof rawRecord?.address === "string" ? rawRecord.address : undefined,
    layoutImage,
    mode: rawMode === "seat_map" ? "seat_map_preview" : "venue_design",
    tiers: blockTiers.length ? blockTiers : designTiersFromLayout,
  };
}

function pickNestedRecord(source: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return undefined;
}

function firstArrayValue(values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }

  return [];
}

function getVenueDesignImage(source: Record<string, unknown> | null | undefined) {
  if (!source) return "";

  const keys = [
    "layoutImage",
    "seatMapImage",
    "previewImage",
    "mapImage",
    "approvedLayoutImage",
    "venueLayoutImage",
    "categoryLayoutImage",
  ];

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function normalizeVenueDesignTier(tier: unknown, index: number): VenueDesignTier | null {
  if (!tier || typeof tier !== "object") return null;
  const record = tier as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;

  return {
    id: String(record.tierId ?? record.id ?? `tier-${index + 1}`),
    name,
    price: Number(record.price ?? 0),
    available: Number(record.available ?? record.capacity ?? record.totalCapacity ?? record.quantity ?? 0),
    color: typeof record.color === "string" ? record.color : getFallbackTierColor(index),
    description: typeof record.description === "string" ? record.description : undefined,
  };
}

function getFallbackTierColor(index: number) {
  return ["#EC1B72", "#8B5CF6", "#06B6D4", "#F59E0B", "#22C55E", "#F97316"][index % 6];
}

function resolveVenueSeatMapConfig(
  unifiedEvent?: BookingUnifiedEvent | null,
  venueId?: string,
) {
  if (!unifiedEvent || !venueId) return undefined;
  return unifiedEvent.venueSeatMaps?.find((config) => config.venueId === venueId);
}

function resolveScheduleSeatMapConfig(
  unifiedEvent?: BookingUnifiedEvent | null,
  venueId?: string,
  scheduleId?: string,
) {
  if (!unifiedEvent || !venueId || !scheduleId) return undefined;
  return unifiedEvent.scheduleSeatMaps?.find((config) => config.venueId === venueId && config.scheduleId === scheduleId);
}

function buildSeatMapScheduleId(venueId: string, date: string, time: string) {
  return [venueId, date, time]
    .map((part) => String(part || "default").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join(":");
}

function buildExperienceZones(item: DiscoveryItem): ExperienceZone[] {
  const base = item.price || 399;

  return [
    {
      label: "Front Row Energy",
      price: base + 900,
      available: 18,
      description:
        "Closest to the action with the strongest crowd energy and fastest entry cue.",
      bestFor: "Highest energy",
    },
    {
      label: "Premium View",
      price: base + 550,
      available: 34,
      description:
        "Best balance of visibility, comfort, and polished venue flow.",
      bestFor: "Balanced comfort",
    },
    {
      label: "Social Zone",
      price: base + 250,
      available: 56,
      description:
        "A lively section for groups, friends, and people who like a social atmosphere.",
      bestFor: "Friends and groups",
    },
    {
      label: "Family Friendly",
      price: Math.max(base, 249),
      available: 42,
      description:
        "Comfortable access with a calmer crowd pocket and family-focused flow.",
      bestFor: "Families",
    },
    {
      label: "VIP Lounge",
      price: base + 1600,
      available: 12,
      description:
        "Premium access, smoother entry, and an elevated experience layer.",
      bestFor: "Premium benefits",
    },
    {
      label: "General Access",
      price: base,
      available: 90,
      description:
        "Simple confirmed access for the experience at the most flexible price.",
      bestFor: "Easy plans",
    },
  ];
}

export function ExperienceZoneSelector({
  zones,
  quantities,
  onChange,
}: {
  zones: ExperienceZone[];
  quantities: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}) {
  const totalQuantity = Object.values(quantities).reduce(
    (sum, current) => sum + current,
    0
  );
  const totalAmount = zones.reduce(
    (sum, zone) => sum + (quantities[zone.label] ?? 0) * zone.price,
    0
  );

  const updateQuantity = (zone: ExperienceZone, nextQuantity: number) => {
    onChange({
      ...quantities,
      [zone.label]: Math.max(0, Math.min(zone.available, nextQuantity)),
    });
  };

  return (
    <div>
      <SectionIntro
        eyebrow="Step 3"
        title="Tickets"
        description="Choose your zone and ticket count. Max 10 tickets per booking."
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] p-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-normal text-[var(--color-brand-primary)]">
              Ticket zones
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">
              {totalQuantity}/10 selected
            </p>
          </div>
          <span className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">
            Rs. {totalAmount}
          </span>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          {zones.map((zone) => {
            const quantity = quantities[zone.label] ?? 0;

            return (
              <article
                key={zone.label}
                className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-black text-[var(--app-foreground)]">
                      {zone.label}
                    </h3>
                    <span className="text-sm font-black text-[var(--app-foreground)]">
                      Rs. {zone.price}
                    </span>
                    <span className="text-xs font-bold text-[var(--app-muted)]">
                      {zone.available} seats left
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-[var(--app-muted)]">
                    {zone.description}
                  </p>
                </div>

                <div className="inline-flex w-fit max-w-full items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-1">
                  <QtyButton
                    label={`Decrease ${zone.label}`}
                    onClick={() => updateQuantity(zone, quantity - 1)}
                  >
                    -
                  </QtyButton>
                  <span className="grid size-9 place-items-center text-sm font-black">
                    {quantity}
                  </span>
                  <QtyButton
                    label={`Increase ${zone.label}`}
                    onClick={() =>
                      totalQuantity < 10 && updateQuantity(zone, quantity + 1)
                    }
                  >
                    +
                  </QtyButton>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">
        Select at least one ticket from any experience zone to continue.
      </p>
    </div>
  );
}

export function TicketCategorySelector(props: {
  categories: ExperienceZone[];
  quantities: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}) {
  return (
    <ExperienceZoneSelector
      zones={props.categories}
      quantities={props.quantities}
      onChange={props.onChange}
    />
  );
}

export function SeatMapSelector(props: {
  stands: ExperienceZone[];
  selectedStand?: string;
  quantity?: number;
  onStand?: (value: string) => void;
  onQuantity?: (value: number) => void;
}) {
  const quantities = props.selectedStand
    ? { [props.selectedStand]: props.quantity ?? 0 }
    : {};

  return (
    <ExperienceZoneSelector
      zones={props.stands}
      quantities={quantities}
      onChange={() => undefined}
    />
  );
}

function QtyButton({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-xl bg-[var(--color-brand-primary)] text-lg font-black text-white transition hover:bg-[#d91665] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function GroupPlanningMode({
  selected,
  onSelect,
  onSkip,
}: {
  selected: string;
  onSelect: (value: string) => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <SectionIntro
        eyebrow="Optional"
        title="Who's Joining?"
        description="Optional planning metadata that helps Buizz understand the occasion without changing ticket quantity."
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {groupOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 ${selected === option
              ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/18 shadow-[0_18px_48px_rgba(236,27,114,0.22)]"
              : "border-[var(--app-border)] bg-[var(--app-subtle)]"
              }`}
          >
            <Users className="size-5 text-[var(--color-brand-primary)]" />
            <p className="mt-3 text-sm font-black">{option}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black transition hover:border-[var(--color-brand-primary)]/50"
      >
        Skip this step
      </button>
    </div>
  );
}

function buildPaymentPayload({
  bookingId,
  item,
  date,
  time,
  lineItems,
  ticketQuantity,
  subtotal,
  platformFeeMode,
  platformFeePerBooking,
  platformFeePerTicket,
  platformFee,
  convenienceFee,
  taxes,
  total,
  buyerName,
  whatsappNumber,
}: {
  bookingId: string;
  ticketIndex?: number;
  item: DiscoveryItem;
  date: string;
  time: string;
  lineItems: BookingLineItem[];
  ticketQuantity: number;
  subtotal: number;
  platformFeeMode: PlatformFeeMode;
  platformFeePerBooking: number;
  platformFeePerTicket: number;
  platformFee: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  buyerName: string;
  whatsappNumber: string;
}): PaymentInitiationPayload {
  return {
    bookingId,
    itemId: item.id,
    eventName: item.title,
    date,
    time,
    city: item.city,
    whatsappNumber,
    buyerName,
    lineItems,
    ticketQuantity,
    subtotal,
    platformFeeMode,
    platformFeePerBooking,
    platformFeePerTicket,
    platformFee,
    convenienceFee,
    taxes,
    total,
  };
}

function initiatePayment(bookingPayload: PaymentInitiationPayload) {
  return { bookingId: bookingPayload.bookingId, status: "initiated" as const };
}
function createBookingId(itemId?: string) {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  const eventCode = itemId?.slice(0, 4).toUpperCase() ?? "EVNT";

  return `BUIZZ-${eventCode}-${time}-${random}`;
}

function createTicket({
  bookingId,
  item,
  buyerName,
  buyerEmail,
  buyerPhone,
  deliveryPreference,
  date,
  time,
  groupMode,
  lineItems,
  subtotal,
  platformFee,
  convenienceFee,
  taxes,
  total,
  selectedSeats = [],
  seatMapTemplateId,
  seatMapOverrideId,
  seatLockId,
}: {
  bookingId: string;
  item: DiscoveryItem;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  deliveryPreference: DeliveryPreference;
  date: string;
  time: string;
  groupMode: string;
  lineItems: BookingLineItem[];
  ticketQuantity: number;
  subtotal: number;
  platformFeeMode: PlatformFeeMode;
  platformFeePerBooking: number;
  platformFeePerTicket: number;
  platformFee: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  selectedSeats?: SelectedSeatData[];
  seatMapTemplateId?: string;
  seatMapOverrideId?: string;
  seatLockId?: string;
}): BuizzTicket {
  const ticketId = bookingId;
  const seatGroups = buildTicketSeatGroups(lineItems, selectedSeats);
  const totalSeats = lineItems.reduce((sum, line) => sum + Math.max(1, line.quantity), 0);

  return {
    bookingId,
    ticketId,
    itemId: item.id,
    eventSlug: item.id,
    kind: item.kind,
    eventName: item.title,
    eventImage: item.image,
    bannerUrl: item.image,
    category: item.category,
    eventType: item.genre,
    date,
    time,
    venue: item.venue,
    city: item.city,
    duration: formatBookingDuration(item.duration).replace(/\s+experience$/i, ""),
    organizerName: `${item.title.split("-")[0]?.trim() || "Buizz"} Organizer`,
    buyerName,
    buyerEmail,
    buyerPhone,
    deliveryPreference,
    groupPlanning: groupMode || undefined,
    lineItems,
    seatGroups,
    selectedSeats,
    seatMapTemplateId,
    seatMapOverrideId,
    seatLockId,
    subtotal,
    convenienceFee,
    taxes,
    total,
    status: "Valid",
    qrStatus: "QR Ready",
    qrPayload: createTicketQrPayload({
      type: "buizz-booking-pass",
      bookingId,
      eventId: item.id,
      eventSlug: item.id,
      totalSeats,
      seatGroups: seatGroups.map((group) => ({
        section: group.section,
        totalSeats: group.quantity,
        seatNumbers: group.seats,
        amount: group.amount,
      })),
      status: "valid",
      signedToken: "pending-backend-signature",
      selectedSeats,
      seatMapTemplateId,
      seatMapOverrideId,
      source: total <= 0 ? "Free" : "Online",
    }),
    seatingType: lineItems.some((line) => line.seats?.length)
      ? "Reserved Seating"
      : "General Admission",
    gate: selectedSeats[0]?.gate ?? "Main Gate",
    whatsappStatus: "Sent to WhatsApp",
    createdAt: new Date().toISOString(),
  };
}

function createTickets(input: Parameters<typeof createTicket>[0]) {
  return [createTicket(input)];
}

function buildTicketSeatGroups(lineItems: BookingLineItem[], selectedSeats: SelectedSeatData[] = []): TicketSeatGroup[] {
  return buildSeatGroupsFromBooking({ selectedSeats, lineItems }).map((group) => ({
    section: group.section,
    seats: group.seatNumbers,
    quantity: group.totalSeats,
    amount: group.amount,
  }));
}

function formatBuyerContact(user: PublicUser) {
  if (!user) return "Not verified";

  if (user.email && user.isEmailVerified && user.phone && user.isPhoneVerified) {
    return `${user.email} / ${user.phone}`;
  }

  if (user.phone && user.isPhoneVerified) return user.phone;
  if (user.email && user.isEmailVerified) return user.email;

  return "Not verified";
}

function formatWhatsappNumber(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "Not available";
  return trimmed.startsWith("+") ? trimmed : `+91 ${trimmed}`;
}

function getDraftKey(itemId: string) {
  return `buizz-booking-draft-${itemId}`;
}
