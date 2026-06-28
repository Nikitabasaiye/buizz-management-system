"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Footer } from "@/components/common/Footer";
import type { DiscoveryItem } from "@/features/discovery/data";
import {
  MOCK_OTP,
  accountExists,
  createEmailAccount,
  createGoogleAccount,
  createPhoneAccount,
  findAccount,
  saveAccount,
  setCurrentMockUser,
  updateAccountContact,
} from "@/lib/mockAuth";
import { useAppStore } from "@/store/app.store";
import { useAuthStore, type DeliveryPreference, type PublicUser } from "@/store/auth.store";
import { type BookingLineItem, type BuizzTicket, useTicketStore } from "@/store/ticket.store";

type BookingStep = 0 | 1 | 2 | 3 | 4;
type Availability = "Available" | "Fast Filling" | "Sold Out";

type DateOption = {
  label: string;
  availability: Availability;
  city?: string;
  slots: TimeOption[];
};

type TimeOption = {
  label: string;
  availability: Availability;
};

type ExperienceZone = {
  label: string;
  price: number;
  available: number;
  description: string;
  bestFor: string;
};

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
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  total: number;
};

const steps = ["Date", "Tickets", "Group", "Delivery", "Review"];
const groupOptions = ["Solo", "Friends", "Family", "Team", "College", "Celebration"];

export function BookingFlow({ item }: { item: DiscoveryItem }) {
  const router = useRouter();
  const selectedCity = useAppStore((state) => state.selectedCity);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const addTicket = useTicketStore((state) => state.addTicket);
  const [step, setStep] = useState<BookingStep>(0);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [groupMode, setGroupMode] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [deliveryOtpSent, setDeliveryOtpSent] = useState(false);
  const [deliveryVerified, setDeliveryVerified] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState("");

  const displayItem = useMemo(
    () => ({
      ...item,
      title: withSelectedCity(item.title, selectedCity),
      venue: withSelectedCity(item.venue, selectedCity),
      city: selectedCity,
      description: withSelectedCity(item.description, selectedCity),
    }),
    [item, selectedCity]
  );
  const dateOptions = useMemo(() => buildDateOptions(displayItem), [displayItem]);
  const timeOptions = selectedDate === null ? [] : dateOptions[selectedDate]?.slots ?? [];
  const zones = useMemo(() => buildExperienceZones(item), [item]);
  const selectedDateLabel = selectedDate === null ? "" : dateOptions[selectedDate]?.label ?? "";
  const selectedTimeLabel = selectedTime === null ? "" : timeOptions[selectedTime]?.label ?? "";
  const hasBookingAccount = Boolean(user);

  const lineItems = useMemo(
    () =>
      zones
        .map((zone) => ({ label: zone.label, quantity: quantities[zone.label] ?? 0, price: zone.price }))
        .filter((line) => line.quantity > 0),
    [quantities, zones]
  );

  const subtotal = lineItems.reduce((sum, current) => sum + current.price * current.quantity, 0);
  const convenienceFee = Math.round(subtotal * 0.04);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + convenienceFee + taxes;
  const canContinue =
    (step === 0 && selectedDate !== null && selectedTime !== null) ||
    (step === 1 && lineItems.length > 0) ||
    step === 2 ||
    (step === 3 && canUseWhatsappDelivery(deliveryPhone, deliveryVerified));

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
        selectedDate?: number | null;
        selectedTime?: number | null;
        quantities?: Record<string, number>;
        groupMode?: string;
        deliveryPhone?: string;
        deliveryVerified?: boolean;
      };
      setSelectedDate(typeof draft.selectedDate === "number" ? draft.selectedDate : null);
      setSelectedTime(typeof draft.selectedTime === "number" ? draft.selectedTime : null);
      setQuantities(draft.quantities ?? {});
      setGroupMode(draft.groupMode ?? "");
      setDeliveryPhone(draft.deliveryPhone ?? "");
      setDeliveryVerified(Boolean(draft.deliveryVerified));
    } catch {
      window.localStorage.removeItem(getDraftKey(item.id));
    }
  }, [item.id]);

  useEffect(() => {
    window.localStorage.setItem(
      getDraftKey(item.id),
      JSON.stringify({ selectedDate, selectedTime, quantities, groupMode, deliveryPhone, deliveryVerified })
    );
  }, [deliveryPhone, deliveryVerified, groupMode, item.id, quantities, selectedDate, selectedTime]);

  const goNext = () => {
    if (!hasBookingAccount) {
      setShowAuthModal(true);
      return;
    }
    if (!canContinue) return;
    setStep((current) => Math.min(4, current + 1) as BookingStep);
  };

  const handlePayment = () => {
    if (!reviewConfirmed || !lineItems.length || !user || selectedDate === null || selectedTime === null || !canUseWhatsappDelivery(deliveryPhone, deliveryVerified)) return;
    const bookingId = createBookingId();
    const bookingPayload = buildPaymentPayload({
      bookingId,
      item: displayItem,
      date: selectedDateLabel,
      time: selectedTimeLabel,
      lineItems,
      subtotal,
      convenienceFee,
      taxes,
      total,
      buyerName: user.name,
      whatsappNumber: deliveryPhone.trim(),
    });
    const payment = initiatePayment(bookingPayload);
    setPendingBookingId(payment.bookingId);
    setPaymentMessage(`Payment initiated for ${payment.bookingId}. Waiting for backend PhonePe success confirmation.`);
  };

  const handlePaymentSuccess = (bookingId: string) => {
    if (!user || bookingId !== pendingBookingId || !canUseWhatsappDelivery(deliveryPhone, deliveryVerified)) {
      setPaymentMessage("Payment success could not be confirmed for this booking session.");
      return;
    }

    const ticket = createTicket({
      bookingId,
      item: displayItem,
      buyerName: user.name,
      buyerEmail: user.email,
      buyerPhone: deliveryPhone.trim(),
      deliveryPreference: "whatsapp",
      date: selectedDateLabel,
      time: selectedTimeLabel,
      groupMode,
      lineItems,
      subtotal,
      convenienceFee,
      taxes,
      total,
    });

    addTicket(ticket);
    window.localStorage.removeItem(getDraftKey(item.id));
    router.push(`/booking/success/${bookingId}`);
  };

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] pb-24 text-[var(--app-foreground)] sm:pb-8">
        <div className="mx-auto max-w-[1500px] px-3 py-6 sm:px-5 lg:px-8">
          <BookingHeader item={displayItem} />
          <BookingStepper currentStep={step} />

          <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 shadow-[0_18px_58px_rgba(0,0,0,0.12)] sm:p-5">
              {step === 0 ? (
                <DateTimeSelector
                  dates={dateOptions}
                  times={timeOptions}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  venue={displayItem.venue}
                  city={displayItem.city}
                  onDate={(index) => {
                    setSelectedDate(index);
                    setSelectedTime(null);
                  }}
                  onTime={setSelectedTime}
                />
              ) : null}
              {step === 1 ? <ExperienceZoneSelector zones={zones} quantities={quantities} onChange={setQuantities} image={item.image} /> : null}
              {step === 2 ? <GroupPlanningMode selected={groupMode} onSelect={setGroupMode} onSkip={() => setStep(3)} /> : null}
              {step === 3 ? (
                <TicketDeliveryStep
                  user={user}
                  phone={deliveryPhone}
                  otp={deliveryOtp}
                  otpSent={deliveryOtpSent}
                  verified={deliveryVerified}
                  message={deliveryMessage}
                  onPhone={(value) => {
                    setDeliveryPhone(value);
                    setDeliveryVerified(Boolean(user?.phone && user.isPhoneVerified && user.phone === value.trim()));
                    setDeliveryOtpSent(false);
                    setDeliveryOtp("");
                    setDeliveryMessage("");
                  }}
                  onOtp={setDeliveryOtp}
                  onSendOtp={() => {
                    if (!deliveryPhone.trim()) {
                      setDeliveryMessage("Enter WhatsApp number first.");
                      return;
                    }
                    setDeliveryOtpSent(true);
                    setDeliveryMessage("WhatsApp OTP sent. Use 123456.");
                  }}
                  onVerifyOtp={() => {
                    if (deliveryOtp !== MOCK_OTP) {
                      setDeliveryMessage("Invalid OTP. Use 123456.");
                      return;
                    }
                    const verifiedPhone = deliveryPhone.trim();
                    setDeliveryVerified(true);
                    setDeliveryMessage("WhatsApp number verified and saved.");
                    if (user) {
                      const nextUser = updateAccountContact(user, { phone: verifiedPhone, isPhoneVerified: true, preferredDelivery: "whatsapp" });
                      setCurrentMockUser(nextUser);
                      setUser(nextUser);
                    }
                  }}
                />
              ) : null}
              {step === 4 ? (
                <JourneyReview
                    item={displayItem}
                  date={selectedDateLabel}
                  time={selectedTimeLabel}
                  lineItems={lineItems}
                  groupMode={groupMode}
                  subtotal={subtotal}
                  convenienceFee={convenienceFee}
                  taxes={taxes}
                  total={total}
                  buyer={user}
                  whatsappNumber={deliveryPhone}
                  confirmed={reviewConfirmed}
                  paymentMessage={paymentMessage}
                  pendingBookingId={pendingBookingId}
                  onConfirmChange={(value) => {
                    setReviewConfirmed(value);
                    setPaymentMessage("");
                    setPendingBookingId("");
                  }}
                  onSimulateBackendSuccess={() => handlePaymentSuccess(pendingBookingId)}
                />
              ) : null}

              {step <= 4 ? (
                <div className="mt-5 flex flex-wrap justify-between gap-3">
                  <button
                    type="button"
                    disabled={step === 0}
                    onClick={() => setStep((current) => Math.max(0, current - 1) as BookingStep)}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/50 disabled:opacity-45"
                  >
                    Back
                  </button>
                  {step === 4 ? (
                    <button type="button" disabled={!reviewConfirmed || !lineItems.length || !hasBookingAccount || !canUseWhatsappDelivery(deliveryPhone, deliveryVerified)} onClick={handlePayment} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.34)] transition hover:bg-[#ff2634] disabled:opacity-55">
                      Continue To Payment
                    </button>
                  ) : (
                    <button type="button" disabled={!canContinue} onClick={goNext} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white shadow-[0_16px_38px_rgba(229,9,20,0.34)] transition hover:bg-[#ff2634] disabled:opacity-55">
                      {step === 3 ? "Review & Continue" : "Continue"}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <BookingSummary
              item={displayItem}
              date={selectedDateLabel || "Select date"}
              time={selectedTimeLabel || "Select time"}
              lineItems={lineItems}
              groupMode={groupMode}
              subtotal={subtotal}
              convenienceFee={convenienceFee}
              taxes={taxes}
              total={total}
              buyer={user}
            />
          </section>
        </div>

        {step <= 4 ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--app-border)] bg-[color:var(--app-elevated)]/94 p-3 text-[var(--app-foreground)] shadow-[0_-18px_50px_rgba(0,0,0,0.22)] backdrop-blur sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--app-muted)]">Total</p>
                <p className="text-lg font-black">Rs. {total}</p>
              </div>
              <button type="button" disabled={step === 4 ? !reviewConfirmed || !lineItems.length || !hasBookingAccount || !canUseWhatsappDelivery(deliveryPhone, deliveryVerified) : !canContinue} onClick={step === 4 ? handlePayment : goNext} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#e50914] px-5 text-sm font-black text-white disabled:opacity-50">
                {step === 4 ? "Continue To Payment" : "Continue"}
              </button>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
      {showAuthModal ? <AuthModal onClose={() => hasBookingAccount && setShowAuthModal(false)} onVerified={() => setShowAuthModal(false)} setUser={setUser} /> : null}
    </>
  );
}

export function BookingSuccessPage({ bookingId }: { bookingId: string }) {
  const ticket = useTicketStore((state) => state.getTicket(bookingId));

  if (!ticket) {
    return (
      <>
        <main className="grid min-h-screen place-items-center bg-[var(--app-background)] px-3 text-center text-[var(--app-foreground)]">
          <div>
            <QrCode className="mx-auto size-12 text-[#e50914]" />
            <h1 className="mt-4 text-3xl font-black">Experience pass not found</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--app-muted)]">Complete payment through the upcoming PhonePe flow to generate a Buizz Experience Pass.</p>
            <Link href="/events" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[#e50914] px-5 text-sm font-black !text-white">Explore Events</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--app-background)] px-3 py-8 text-[var(--app-foreground)] sm:px-5 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] sm:p-6">
          <QRTicket ticket={ticket} />
        </section>
      </main>
      <Footer />
    </>
  );
}

function BookingHeader({ item }: { item: DiscoveryItem }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
      <div className="grid lg:grid-cols-[minmax(0,0.75fr)_minmax(420px,1fr)]">
        <div className="relative min-h-72">
          <img src={item.image} alt={item.title} className="absolute inset-0 size-full object-cover opacity-88" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b15] via-transparent to-black/10" />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <p className="text-sm font-black text-[#1d9bf0]">Build your Buizz experience</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">{item.title}</h1>
          <div className="mt-4 grid gap-2 text-sm font-bold text-white/72 sm:grid-cols-2">
            <p className="flex items-center gap-2"><CalendarDays className="size-4 text-[#ff2634]" />{item.date}</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-[#ff2634]" />{item.venue}, {item.city}</p>
            <p className="flex items-center gap-2"><Clock className="size-4 text-[#ff2634]" />2h 30m experience</p>
            <p className="flex items-center gap-2"><Ticket className="size-4 text-[#ff2634]" />{item.priceLabel}</p>
          </div>
          <p className="mt-4 text-sm font-semibold leading-7 text-white/72">{item.description}</p>
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
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [googleUser, setGoogleUser] = useState<NonNullable<PublicUser> | null>(null);
  const [linkGooglePhone, setLinkGooglePhone] = useState(false);

  const resetSignupState = () => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
  };

  const login = () => {
    const account = findAccount(identifier);
    if (!account || account.password !== loginPassword) {
      setMessage("Invalid email/phone or password.");
      return;
    }
    persistBookingUser(account, setUser, onVerified);
  };

  const sendSignupOtp = () => {
    const contact = signupMethod === "email" ? email : phone;
    if (!name.trim()) {
      setMessage("Enter your name.");
      return;
    }
    if (!contact.trim()) {
      setMessage(signupMethod === "email" ? "Enter your email." : "Enter your phone number.");
      return;
    }
    if (accountExists(contact)) {
      setMessage("Account already exists. Login to continue booking.");
      return;
    }
    setOtpSent(true);
    setMessage("Mock OTP sent. Use 123456.");
  };

  const verifySignupOtp = () => {
    if (otp !== MOCK_OTP) {
      setMessage("Invalid OTP. Use 123456.");
      return;
    }
    setOtpVerified(true);
    setMessage("OTP verified. Create your password.");
  };

  const createSignupAccount = () => {
    const validation = validateBookingPassword(password, confirmPassword);
    if (validation) {
      setMessage(validation);
      return;
    }
    const account = signupMethod === "email" ? createEmailAccount({ name, email, password }) : createPhoneAccount({ name, phone, password });
    persistBookingUser(account, setUser, onVerified);
  };

  const continueWithGoogle = () => {
    const account = createGoogleAccount();
    persistBookingUser(account, setUser, onVerified);
  };

  const sendGooglePhoneOtp = () => {
    if (!phone.trim()) {
      setMessage("Enter phone number first.");
      return;
    }
    setOtpSent(true);
    setMessage("Phone OTP sent. Use 123456.");
  };

  const verifyGooglePhone = () => {
    if (!googleUser) return;
    if (otp !== MOCK_OTP) {
      setMessage("Invalid OTP. Use 123456.");
      return;
    }
    const account = updateAccountContact(googleUser, { phone, isPhoneVerified: true, preferredDelivery: "both" });
    persistBookingUser(account, setUser, onVerified);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.46)]">
        <div className="bg-[#070b15] p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <ShieldCheck className="size-9 text-[#ff2634]" />
              <h2 className="mt-3 text-2xl font-black">Verify before your pass is created</h2>
              <p className="mt-1 text-sm font-semibold text-white/70">Email or phone verification powers ticket delivery, updates, and entry notifications.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md border border-white/12 bg-white/8 px-3 py-2 text-xs font-black text-white">Close</button>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {linkGooglePhone ? (
            <>
              <div className="grid gap-3">
                <AuthInput icon={<Phone className="size-4" />} label="Phone number" value={phone} onChange={setPhone} />
                {otpSent ? <AuthInput icon={<ShieldCheck className="size-4" />} label="OTP" value={otp} onChange={setOtp} /> : null}
              </div>
              {message ? <p className="mt-3 rounded-md bg-[#e50914]/10 px-3 py-2 text-xs font-black text-[#e50914]">{message}</p> : null}
              <button type="button" onClick={otpSent ? verifyGooglePhone : sendGooglePhoneOtp} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] text-sm font-black text-white transition hover:bg-[#ff2634]">
                {otpSent ? "Verify Phone" : "Send Phone OTP"}
              </button>
              <button type="button" onClick={onVerified} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] text-sm font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/50">
                Continue to WhatsApp verification
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={continueWithGoogle} className="min-h-12 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-2 text-xs font-black transition hover:border-[#e50914]/50">Continue with Google</button>
                <button type="button" onClick={() => { setMode("login"); resetSignupState(); }} className={`min-h-12 rounded-md border px-2 text-xs font-black transition ${mode === "login" ? "border-[#e50914] bg-[#e50914] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[#e50914]/50"}`}>Login</button>
                <button type="button" onClick={() => { setMode("signup"); resetSignupState(); }} className={`min-h-12 rounded-md border px-2 text-xs font-black transition ${mode === "signup" ? "border-[#e50914] bg-[#e50914] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[#e50914]/50"}`}>Signup</button>
              </div>

              {mode === "login" ? (
                <div className="mt-4 grid gap-3">
                  <AuthInput icon={<User className="size-4" />} label="Email or Phone" value={identifier} onChange={setIdentifier} />
                  <AuthInput icon={<KeyRound className="size-4" />} label="Password" value={loginPassword} onChange={setLoginPassword} type="password" />
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setSignupMethod("email"); resetSignupState(); }} className={`min-h-10 rounded-md border px-2 text-xs font-black transition ${signupMethod === "email" ? "border-[#e50914] bg-[#e50914] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[#e50914]/50"}`}>Email Signup</button>
                    <button type="button" onClick={() => { setSignupMethod("phone"); resetSignupState(); }} className={`min-h-10 rounded-md border px-2 text-xs font-black transition ${signupMethod === "phone" ? "border-[#e50914] bg-[#e50914] text-white" : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:border-[#e50914]/50"}`}>Phone Signup</button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <AuthInput icon={<User className="size-4" />} label="Name" value={name} onChange={setName} />
                    {signupMethod === "email" ? <AuthInput icon={<Mail className="size-4" />} label="Email" value={email} onChange={setEmail} /> : <AuthInput icon={<Phone className="size-4" />} label="Phone number" value={phone} onChange={setPhone} />}
                    {otpSent && !otpVerified ? <AuthInput icon={<ShieldCheck className="size-4" />} label="OTP" value={otp} onChange={setOtp} /> : null}
                    {otpVerified ? (
                      <>
                        <AuthInput icon={<KeyRound className="size-4" />} label="Create Password" value={password} onChange={setPassword} type="password" />
                        <AuthInput icon={<KeyRound className="size-4" />} label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
                      </>
                    ) : null}
                  </div>
                </>
              )}

              {message ? <p className="mt-3 rounded-md bg-[#e50914]/10 px-3 py-2 text-xs font-black text-[#e50914]">{message}</p> : null}

              <button type="button" onClick={mode === "login" ? login : !otpSent ? sendSignupOtp : !otpVerified ? verifySignupOtp : createSignupAccount} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#e50914] text-sm font-black text-white transition hover:bg-[#ff2634]">
                {mode === "login" ? "Login and continue" : !otpSent ? "Send OTP" : !otpVerified ? "Verify OTP" : "Create account and continue"}
              </button>
              {mode === "login" ? <Link href="/reset-password" className="mt-3 inline-flex w-full justify-center text-xs font-black text-[#e50914] hover:text-[#ff2634]">Forgot Password?</Link> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function OTPVerification() {
  return null;
}

function persistBookingSession(user: NonNullable<PublicUser>, setUser: (user: PublicUser) => void) {
  const account = saveAccount(user);
  setCurrentMockUser(account);
  setUser(account);
}

function persistBookingUser(user: NonNullable<PublicUser>, setUser: (user: PublicUser) => void, onSaved: () => void) {
  persistBookingSession(user, setUser);
  onSaved();
}

function validateBookingPassword(password: string, confirmPassword: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmPassword) return "Confirm password must match.";
  return "";
}

function AuthInput({ icon, label, value, onChange, type = "text" }: { icon: ReactNode; label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[var(--app-muted)]">
      {label}
      <div className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 text-[var(--app-foreground)]">
        {icon}
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
      </div>
    </label>
  );
}

export function BookingStepper({ currentStep }: { currentStep: BookingStep }) {
  return (
    <nav className="mt-5 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-2 shadow-[0_18px_58px_rgba(0,0,0,0.10)]">
      <div className="grid grid-cols-6 gap-1">
        {steps.map((label, index) => (
          <div key={label} className={`rounded-md px-2 py-2 text-center text-[10px] font-black transition duration-200 sm:text-xs ${index <= currentStep ? "bg-[#e50914] text-white shadow-[0_12px_28px_rgba(229,9,20,0.22)]" : "bg-[var(--app-subtle)] text-[var(--app-muted)]"}`}>
            <span className="block sm:hidden">{index + 1}</span>
            <span className="hidden sm:block">{label}</span>
          </div>
        ))}
      </div>
    </nav>
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
      <SectionIntro eyebrow="Step 1" title="Pick Your Moment" description={`Choose when this experience comes alive at ${venue}, ${city}.`} />
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
        <Legend tone="bg-[#16a34a]" label="Available" />
        <Legend tone="bg-[#f6c453]" label="Fast Filling" />
        <Legend tone="bg-[var(--app-muted)]" label="Sold Out" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {dates.map((date, index) => <AvailabilityCard key={date.label} option={date} selected={selectedDate === index} onClick={() => onDate(index)} />)}
      </div>
      <h3 className="mt-6 text-lg font-black">Time slots</h3>
      {selectedDate === null ? (
        <div className="mt-3 rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-subtle)] p-4 text-sm font-black text-[var(--app-muted)]">
          Select an available date to see organizer-controlled slots.
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {times.map((time, index) => <AvailabilityCard key={time.label} option={time} selected={selectedTime === index} onClick={() => onTime(index)} />)}
        </div>
      )}
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--app-muted)]">{description}</p>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <span className="inline-flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2"><span className={`size-2 rounded-full ${tone}`} />{label}</span>;
}

function AvailabilityCard({ option, selected, onClick }: { option: DateOption | TimeOption; selected: boolean; onClick: () => void }) {
  const soldOut = option.availability === "Sold Out";
  return (
    <button type="button" disabled={soldOut} onClick={onClick} className={`min-h-24 rounded-md border p-3 text-left transition duration-200 ${selected ? "border-[#e50914] bg-[#e50914]/16 shadow-[0_18px_48px_rgba(229,9,20,0.20)]" : "border-[var(--app-border)] bg-[var(--app-subtle)] hover:-translate-y-1 hover:border-[#e50914]/45"} ${soldOut ? "cursor-not-allowed opacity-45" : ""}`}>
      <p className="text-base font-black">{option.label}</p>
      {"city" in option && option.city ? <p className="mt-1 text-[11px] font-bold text-[var(--app-muted)]">{option.city}</p> : null}
      <p className={`mt-3 text-xs font-black ${option.availability === "Available" ? "text-[#16a34a]" : option.availability === "Fast Filling" ? "text-[#f6c453]" : "text-[var(--app-muted)]"}`}>{option.availability}</p>
    </button>
  );
}

export function ExperienceZoneSelector({ zones, quantities, onChange, image }: { zones: ExperienceZone[]; quantities: Record<string, number>; onChange: (value: Record<string, number>) => void; image: string }) {
  const totalQuantity = Object.values(quantities).reduce((sum, current) => sum + current, 0);
  const totalAmount = zones.reduce((sum, zone) => sum + (quantities[zone.label] ?? 0) * zone.price, 0);

  const updateQuantity = (zone: ExperienceZone, nextQuantity: number) => {
    onChange({ ...quantities, [zone.label]: Math.max(0, Math.min(zone.available, nextQuantity)) });
  };

  return (
    <div>
      <SectionIntro eyebrow="Step 2" title="Tickets" description="Choose your zone and ticket count. Max 10 tickets per booking." />
      <div className="mt-5 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] p-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Ticket zones</p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{totalQuantity}/10 selected</p>
          </div>
          <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">Rs. {totalAmount}</span>
        </div>
        <div className="divide-y divide-[var(--app-border)]">
          {zones.map((zone) => {
            const quantity = quantities[zone.label] ?? 0;
            return (
              <article key={zone.label} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-black text-[var(--app-foreground)]">{zone.label}</h3>
                    <span className="text-sm font-black text-[var(--app-foreground)]">Rs. {zone.price}</span>
                    <span className="text-xs font-bold text-[var(--app-muted)]">{zone.available} seats left</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-[var(--app-muted)]">{zone.description}</p>
                </div>
                <div className="inline-flex w-fit items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-1">
                  <QtyButton label={`Decrease ${zone.label}`} onClick={() => updateQuantity(zone, quantity - 1)}>-</QtyButton>
                  <span className="grid size-9 place-items-center text-sm font-black">{quantity}</span>
                  <QtyButton label={`Increase ${zone.label}`} onClick={() => totalQuantity < 10 && updateQuantity(zone, quantity + 1)}>+</QtyButton>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <p className="mt-4 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-sm font-black">Select at least one ticket from any experience zone to continue.</p>
    </div>
  );
}

function ZoneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/12 bg-white/10 p-3 backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-normal text-white/52">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

export function TicketCategorySelector(props: { categories: ExperienceZone[]; quantities: Record<string, number>; onChange: (value: Record<string, number>) => void }) {
  return <ExperienceZoneSelector zones={props.categories} quantities={props.quantities} onChange={props.onChange} image="/images/logo.png" />;
}

export function SeatMapSelector(props: { stands: ExperienceZone[]; selectedStand?: string; quantity?: number; onStand?: (value: string) => void; onQuantity?: (value: number) => void }) {
  const quantities = props.selectedStand ? { [props.selectedStand]: props.quantity ?? 0 } : {};
  return <ExperienceZoneSelector zones={props.stands} quantities={quantities} onChange={() => undefined} image="/images/logo.png" />;
}

function QtyButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} onClick={onClick} className="grid size-9 place-items-center rounded-md bg-[#e50914] text-lg font-black text-white transition hover:bg-[#ff2634]">{children}</button>;
}

export function GroupPlanningMode({ selected, onSelect, onSkip }: { selected: string; onSelect: (value: string) => void; onSkip: () => void }) {
  return (
    <div>
      <SectionIntro eyebrow="Step 3" title="Who's Joining?" description="Optional planning metadata that helps Buizz understand the occasion without changing ticket quantity." />
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        {groupOptions.map((option) => (
          <button key={option} type="button" onClick={() => onSelect(option)} className={`rounded-md border p-4 text-left transition duration-200 hover:-translate-y-1 ${selected === option ? "border-[#e50914] bg-[#e50914]/18 shadow-[0_18px_48px_rgba(229,9,20,0.22)]" : "border-[var(--app-border)] bg-[var(--app-subtle)]"}`}>
            <Users className="size-5 text-[#ff2634]" />
            <p className="mt-3 text-sm font-black">{option}</p>
          </button>
        ))}
      </div>
      <button type="button" onClick={onSkip} className="mt-5 inline-flex min-h-10 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black transition hover:border-[#e50914]/50">Skip this step</button>
    </div>
  );
}

function TicketDeliveryStep({
  user,
  phone,
  otp,
  otpSent,
  verified,
  message,
  onPhone,
  onOtp,
  onSendOtp,
  onVerifyOtp,
}: {
  user: PublicUser;
  phone: string;
  otp: string;
  otpSent: boolean;
  verified: boolean;
  message: string;
  onPhone: (value: string) => void;
  onOtp: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
}) {
  return (
    <div>
      <SectionIntro eyebrow="Step 4" title="WhatsApp Delivery" description="Tickets will be delivered only to a verified WhatsApp number." />

      <div className="mt-5 rounded-md border border-[#e50914]/25 bg-[#e50914]/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Phone className="size-6 text-[#ff2634]" />
            <h3 className="mt-3 text-xl font-black">Verify WhatsApp Number</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">This number becomes the ticket owner and delivery contact.</p>
          </div>
          {verified ? <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#16a34a]/16 px-3 text-xs font-black text-[#16a34a]"><ShieldCheck className="size-4" />Verified</span> : null}
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
            WhatsApp Number
            <input value={phone} onChange={(event) => onPhone(event.target.value)} placeholder={user?.phone ?? "+91 98765 43210"} className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none focus:border-[#e50914]" />
          </label>
          {otpSent && !verified ? (
            <label className="grid gap-2 text-xs font-black text-[var(--app-muted)]">
              Verify OTP
              <input value={otp} onChange={(event) => onOtp(event.target.value)} placeholder="123456" className="min-h-11 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-sm font-semibold text-[var(--app-foreground)] outline-none focus:border-[#e50914]" />
            </label>
          ) : null}
          <button type="button" onClick={otpSent && !verified ? onVerifyOtp : onSendOtp} className="inline-flex min-h-10 w-fit items-center justify-center rounded-md bg-[#e50914] px-4 text-sm font-black text-white transition hover:bg-[#ff2634]">
            {verified ? "WhatsApp Verified" : otpSent ? "Verify OTP" : "Send OTP"}
          </button>
        </div>

        {message ? <p className="mt-3 rounded-md bg-[#e50914]/10 px-3 py-2 text-xs font-black text-[#e50914]">{message}</p> : null}
        <p className="mt-3 text-xs font-bold text-[var(--app-muted)]">Ticket will be delivered to: {phone.trim() ? formatWhatsappNumber(phone) : "Add WhatsApp number"}</p>
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
  subtotal,
  convenienceFee,
  taxes,
  total,
  buyer,
  whatsappNumber,
  confirmed,
  paymentMessage,
  pendingBookingId,
  onConfirmChange,
  onSimulateBackendSuccess,
}: {
  item: DiscoveryItem;
  date: string;
  time: string;
  lineItems: BookingLineItem[];
  groupMode: string;
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  buyer: PublicUser;
  whatsappNumber: string;
  confirmed: boolean;
  paymentMessage: string;
  pendingBookingId: string;
  onConfirmChange: (value: boolean) => void;
  onSimulateBackendSuccess: () => void;
}) {
  const ticketType = lineItems.map((line) => line.label).join(", ") || "Not selected";
  const quantity = lineItems.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <SectionIntro eyebrow="Step 5" title="Review & Continue" description="Confirm your booking details before the PhonePe payment handoff." />
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#070b15] text-white shadow-[0_22px_70px_rgba(0,0,0,0.30)]">
          <img src={item.image} alt={`${item.title} poster`} className="h-56 w-full object-cover opacity-90" />
          <div className="p-4">
            <p className="text-sm font-black text-[#1d9bf0]">{item.category}</p>
            <h3 className="mt-2 text-2xl font-black">{item.title}</h3>
            <div className="mt-4 grid gap-2 text-sm font-bold text-white/76 sm:grid-cols-2">
              <ReviewDetail label="Date" value={date} />
              <ReviewDetail label="Time" value={time} />
              <ReviewDetail label="Venue" value={item.venue} />
              <ReviewDetail label="City" value={item.city} />
              <ReviewDetail label="Ticket Type" value={ticketType} />
              <ReviewDetail label="Quantity" value={String(quantity)} />
              <ReviewDetail label="WhatsApp Number" value={formatWhatsappNumber(whatsappNumber)} />
              <ReviewDetail label="Group" value={groupMode || "Not selected"} />
            </div>
          </div>
        </div>
        <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
          <h3 className="text-lg font-black">Amount Summary</h3>
          <div className="mt-4 space-y-2 text-sm font-semibold">
            <SummaryRow label="Total Amount" value={`Rs. ${subtotal}`} />
            <SummaryRow label="Convenience Fee" value={`Rs. ${convenienceFee}`} />
            <SummaryRow label="Taxes" value={`Rs. ${taxes}`} />
            <SummaryRow label="Grand Total" value={`Rs. ${total}`} strong />
          </div>

          <div className="mt-4 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-xs font-bold text-[var(--app-muted)]">
            <p className="font-black text-[var(--app-foreground)]">Verified buyer</p>
            <p>{buyer?.name}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[#16a34a]"><ShieldCheck className="size-3.5" />{formatWhatsappNumber(whatsappNumber)}</p>
            <p className="mt-2 text-[var(--app-muted)]">Ticket will be delivered to: {formatWhatsappNumber(whatsappNumber)}</p>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-3 text-sm font-semibold text-[var(--app-foreground)]">
            <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmChange(event.target.checked)} className="mt-1 size-4 accent-[#e50914]" />
            <span>
              <span className="block font-black">I confirm that:</span>
              <span className="mt-2 block text-xs leading-6 text-[var(--app-muted)]">My booking details are correct, my WhatsApp number is correct, I agree to Buizz Terms & Conditions, and I agree to Refund Policy.</span>
            </span>
          </label>

          {paymentMessage ? <p className="mt-4 rounded-md border border-[#1d9bf0]/25 bg-[#1d9bf0]/10 px-3 py-2 text-xs font-black text-[#1d9bf0]">{paymentMessage}</p> : null}
          {pendingBookingId ? (
            <div className="mt-4 rounded-md border border-dashed border-[#f6c453]/45 bg-[#f6c453]/10 p-3">
              <p className="text-xs font-black uppercase text-[#a16207]">Development only</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)]">
                Use this only until the backend PhonePe callback calls handlePaymentSuccess(bookingId).
              </p>
              <button
                type="button"
                onClick={onSimulateBackendSuccess}
                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-[#f6c453]/50 bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] transition hover:border-[#e50914]/50 hover:bg-[#e50914] hover:text-white"
              >
                Simulate Backend Payment Success
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BookingSummary({
  item,
  date,
  time,
  lineItems,
  groupMode,
  subtotal,
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
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  total: number;
  buyer: PublicUser;
}) {
  return (
    <aside className="h-fit rounded-md border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.12)] lg:sticky lg:top-24">
      <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Live Summary</p>
      <h2 className="mt-2 text-xl font-black">Your Buizz Plan</h2>
      <div className="mt-4 flex gap-3">
        <img src={item.image} alt={item.title} className="size-20 rounded-md object-cover" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black">{item.title}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{date} - {time}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">{item.venue}, {item.city}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm font-semibold">
        {lineItems.length ? lineItems.map((line) => <SummaryRow key={line.label} label={`${line.label} x ${line.quantity}`} value={`Rs. ${line.price * line.quantity}`} />) : <p className="text-[var(--app-muted)]">No experience zone selected</p>}
        {groupMode ? <SummaryRow label="Group Planning" value={groupMode} /> : null}
        <SummaryRow label="Subtotal" value={`Rs. ${subtotal}`} />
        <SummaryRow label="Convenience fee" value={`Rs. ${convenienceFee}`} />
        <SummaryRow label="Taxes" value={`Rs. ${taxes}`} />
        {buyer ? <SummaryRow label="Buyer" value={`${buyer.name} - ${formatBuyerContact(buyer)}`} /> : null}
      </div>
      <div className="mt-4 border-t border-[var(--app-border)] pt-4">
        <SummaryRow label="Total" value={`Rs. ${total}`} strong />
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-3 ${strong ? "text-lg font-black" : ""}`}><span className="text-[var(--app-muted)]">{label}</span><span className="text-right">{value}</span></div>;
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
  const deliveryMessage = getTicketDeliveryMessage(ticket);
  const ticketCategory = ticket.lineItems.map((line) => line.label).join(", ") || "General Access";
  const quantity = ticket.lineItems.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <div>
      <div className="rounded-md border border-[#38d97b]/30 bg-[#38d97b]/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-6 shrink-0 text-[#38d97b]" />
          <div>
            <h2 className="text-2xl font-black leading-tight">Your Buizz Pass is Ready</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--app-muted)]">{deliveryMessage}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-white/10 bg-[#070b15] text-white shadow-[0_26px_80px_rgba(0,0,0,0.40)]">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative grid min-h-[460px] overflow-hidden sm:grid-cols-[220px_1fr]">
            <img src={ticket.eventImage} alt={ticket.eventName} className="absolute inset-0 size-full object-cover opacity-28" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070b15] via-[#070b15]/88 to-[#070b15]/72" />
            <div className="relative hidden p-4 sm:block">
              <img src={ticket.eventImage} alt={`${ticket.eventName} ticket poster`} className="h-full min-h-[380px] w-full rounded-md object-cover shadow-[0_24px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/15" />
            </div>
            <div className="relative flex flex-col justify-between p-4 sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#e50914] px-2 py-1 text-[10px] font-black uppercase">Buizz Entry Ticket</span>
                  <span className="rounded border border-[#38d97b]/40 bg-[#38d97b]/12 px-2 py-1 text-[10px] font-black uppercase text-[#38d97b]">{ticket.status}</span>
                </div>
                <h3 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">{ticket.eventName}</h3>
                <div className="mt-5 grid gap-3 text-sm font-bold text-white/78 sm:grid-cols-2">
                  <TicketField label="Booking ID" value={ticket.bookingId} />
                  <TicketField label="Ticket ID" value={ticket.ticketId} />
                  <TicketField label="Date" value={ticket.date} />
                  <TicketField label="Time" value={ticket.time} />
                  <TicketField label="Venue" value={ticket.venue} />
                  <TicketField label="City" value={ticket.city} />
                  <TicketField label="Category" value={ticketCategory} />
                  <TicketField label="Quantity" value={String(quantity)} />
                  <TicketField label="Buyer" value={ticket.buyerName} />
                  <TicketField label="WhatsApp" value={formatWhatsappNumber(ticket.buyerPhone ?? "")} />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-white/24 pt-4">
                <span className="rounded-md bg-white/8 px-3 py-2 text-xs font-black text-white/70">QR Status: {ticket.qrStatus}</span>
                <span className="rounded-md bg-white/8 px-3 py-2 text-xs font-black text-white/70">Grand Total: Rs. {ticket.total}</span>
              </div>
            </div>
          </div>

          <div className="relative border-t border-dashed border-white/24 bg-white p-4 text-[#090a12] lg:border-l lg:border-t-0">
            <div className="absolute -left-4 top-1/2 hidden size-8 -translate-y-1/2 rounded-full bg-[var(--app-background)] lg:block" />
            <div className="absolute -right-4 top-1/2 hidden size-8 -translate-y-1/2 rounded-full bg-[var(--app-background)] lg:block" />
            <div className="flex h-full min-h-64 flex-col items-center justify-between gap-4 text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-[#e50914]">Scan At Gate</p>
                <div className="mt-4 grid size-40 place-items-center rounded-md border-4 border-[#090a12] bg-white p-3">
                  <QrCode className="size-28" />
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[#6b7280]">Ticket Status</p>
                <p className="mt-1 text-2xl font-black">{ticket.status}</p>
                <p className="mt-3 text-xs font-bold text-[#6b7280]">Ticket will be delivered to {formatWhatsappNumber(ticket.buyerPhone ?? "")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-semibold text-[var(--app-muted)]">Entry instructions: Keep your QR ready at the gate. Passport stamp unlocks only after venue scan.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <TicketAction icon={<Download className="size-4" />} label="Download Pass" onClick={() => downloadPass(ticket)} />
        <TicketAction icon={<Share2 className="size-4" />} label="Share Pass" onClick={() => sharePass(ticket)} />
        <TicketAction icon={<CalendarDays className="size-4" />} label="Add To Calendar" onClick={() => downloadCalendarInvite(ticket)} />
        <Link href="/profile/tickets" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#e50914] px-4 text-sm font-black !text-white transition hover:bg-[#ff2634]">View My Tickets</Link>
      </div>
    </div>
  );
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase text-white/44">{label}</p>
      <p className="mt-1 font-black text-white">{value || "Not available"}</p>
    </div>
  );
}

function TicketAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black transition hover:border-[#e50914]/50 hover:bg-[#e50914] hover:text-white">{icon}{label}</button>;
}

export function downloadPass(ticket: BuizzTicket) {
  const phoneValue = ticket.buyerPhone ? formatWhatsappNumber(ticket.buyerPhone) : "Not available";
  const categoryLine = ticket.lineItems.map((line) => `${line.label} x ${line.quantity}`).join(", ") || "General Access";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${ticket.eventName} Buizz Ticket</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111827}.ticket{max-width:860px;border:2px dashed #111827;border-radius:8px;display:grid;grid-template-columns:1fr 220px;overflow:hidden}.main{padding:24px}.stub{border-left:2px dashed #111827;padding:24px;text-align:center}.qr{display:grid;place-items:center;width:150px;height:150px;border:3px solid #111827;margin:18px auto 0;font-weight:900}h1{margin:0 0 8px;font-size:34px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:20px}.label{font-size:10px;font-weight:900;text-transform:uppercase;color:#6b7280}.value{font-weight:900}</style></head><body><section class="ticket"><div class="main"><p class="label">Buizz Entry Ticket</p><h1>${ticket.eventName}</h1><div class="meta"><p><span class="label">Booking ID</span><br><span class="value">${ticket.bookingId}</span></p><p><span class="label">Ticket ID</span><br><span class="value">${ticket.ticketId}</span></p><p><span class="label">Date</span><br><span class="value">${ticket.date}</span></p><p><span class="label">Time</span><br><span class="value">${ticket.time}</span></p><p><span class="label">Venue</span><br><span class="value">${ticket.venue}, ${ticket.city}</span></p><p><span class="label">Category</span><br><span class="value">${categoryLine}</span></p><p><span class="label">Buyer</span><br><span class="value">${ticket.buyerName}</span></p><p><span class="label">WhatsApp</span><br><span class="value">${phoneValue}</span></p></div></div><aside class="stub"><p class="label">Scan At Gate</p><div class="qr">QR READY</div><p class="value">${ticket.status}</p><p class="label">Grand Total Rs. ${ticket.total}</p></aside></section></body></html>`;
  downloadFile(`${ticket.bookingId}-buizz-ticket.html`, html, "text/html");
}

export async function sharePass(ticket: BuizzTicket) {
  const shareText = `Buizz Pass: ${ticket.eventName} on ${ticket.date} at ${ticket.time}. Booking ID ${ticket.bookingId}.`;
  const shareUrl = `${window.location.origin}/profile/tickets`;
  if (navigator.share) {
    await navigator.share({ title: "My Buizz Pass", text: shareText, url: shareUrl });
    return;
  }
  await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
}

export function downloadCalendarInvite(ticket: BuizzTicket) {
  const start = new Date(ticket.createdAt);
  start.setDate(start.getDate() + 7);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 2);
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
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

function buildDateOptions(item: DiscoveryItem): DateOption[] {
  const baseSlots: TimeOption[] =
    item.kind === "activities"
      ? [
          { label: "06:00 PM", availability: "Available" },
          { label: "07:30 PM", availability: "Fast Filling" },
          { label: "09:00 PM", availability: "Sold Out" },
        ]
      : [
          { label: "04:00 PM", availability: "Available" },
          { label: "07:30 PM", availability: "Fast Filling" },
          { label: "09:00 PM", availability: item.popularity > 88 ? "Sold Out" : "Available" },
        ];

  return [
    { label: item.date.replace(/,.*/, ""), availability: "Available", city: item.city, slots: baseSlots.slice(0, item.kind === "activities" ? 3 : 2) },
    {
      label: "Sat 13 Jun",
      availability: "Fast Filling",
      city: item.city,
      slots: [
        { label: "05:00 PM", availability: "Fast Filling" },
        { label: "08:00 PM", availability: "Available" },
      ],
    },
    {
      label: "Sun 14 Jun",
      availability: "Sold Out",
      city: item.city,
      slots: [
        { label: "06:00 PM", availability: "Sold Out" },
        { label: "09:00 PM", availability: "Sold Out" },
      ],
    },
    {
      label: "Fri 19 Jun",
      availability: "Available",
      city: item.city,
      slots: [
        { label: "04:30 PM", availability: "Available" },
        { label: "08:30 PM", availability: "Fast Filling" },
      ],
    },
  ];
}

function buildExperienceZones(item: DiscoveryItem): ExperienceZone[] {
  const base = item.price || 399;
  return [
    { label: "Front Row Energy", price: base + 900, available: 18, description: "Closest to the action with the strongest crowd energy and fastest entry cue.", bestFor: "Highest energy" },
    { label: "Premium View", price: base + 550, available: 34, description: "Best balance of visibility, comfort, and polished venue flow.", bestFor: "Balanced comfort" },
    { label: "Social Zone", price: base + 250, available: 56, description: "A lively section for groups, friends, and people who like a social atmosphere.", bestFor: "Friends and groups" },
    { label: "Family Friendly", price: Math.max(base, 249), available: 42, description: "Comfortable access with a calmer crowd pocket and family-focused flow.", bestFor: "Families" },
    { label: "VIP Lounge", price: base + 1600, available: 12, description: "Premium access, smoother entry, and an elevated experience layer.", bestFor: "Premium benefits" },
    { label: "General Access", price: base, available: 90, description: "Simple confirmed access for the experience at the most flexible price.", bestFor: "Easy plans" },
  ];
}

function buildPaymentPayload({
  bookingId,
  item,
  date,
  time,
  lineItems,
  subtotal,
  convenienceFee,
  taxes,
  total,
  buyerName,
  whatsappNumber,
}: {
  bookingId: string;
  item: DiscoveryItem;
  date: string;
  time: string;
  lineItems: BookingLineItem[];
  subtotal: number;
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
    subtotal,
    convenienceFee,
    taxes,
    total,
  };
}

function initiatePayment(bookingPayload: PaymentInitiationPayload) {
  // PhonePe integration will be connected here
  return { bookingId: bookingPayload.bookingId, status: "initiated" as const };
}

function createBookingId() {
  return `BUIZZ-${Date.now().toString(36).toUpperCase()}`;
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
  convenienceFee,
  taxes,
  total,
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
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  total: number;
}): BuizzTicket {
  const stamp = bookingId.replace(/^BUIZZ-/, "") || Date.now().toString(36).toUpperCase();
  return {
    bookingId,
    ticketId: `TKT-${stamp.slice(-6)}`,
    itemId: item.id,
    kind: item.kind,
    eventName: item.title,
    eventImage: item.image,
    date,
    time,
    venue: item.venue,
    city: item.city,
    duration: "2h 30m",
    buyerName,
    buyerEmail,
    buyerPhone,
    deliveryPreference,
    groupPlanning: groupMode || undefined,
    lineItems,
    subtotal,
    convenienceFee,
    taxes,
    total,
    status: "Valid",
    qrStatus: "QR Ready",
    whatsappStatus: "Sent to WhatsApp",
    createdAt: new Date().toISOString(),
  };
}

function canUseWhatsappDelivery(phone: string, verified: boolean) {
  return Boolean(phone.trim() && verified);
}

function resolveDeliveryPreference(user: PublicUser): DeliveryPreference {
  const hasEmail = Boolean(user?.email && user.isEmailVerified);
  const hasPhone = Boolean(user?.phone && user.isPhoneVerified);
  if (hasEmail && hasPhone) return user?.preferredDelivery ?? "both";
  if (hasPhone) return "whatsapp";
  return "email";
}

function formatBuyerContact(user: PublicUser) {
  if (!user) return "Not verified";
  if (user.email && user.isEmailVerified && user.phone && user.isPhoneVerified) return `${user.email} / ${user.phone}`;
  if (user.phone && user.isPhoneVerified) return user.phone;
  if (user.email && user.isEmailVerified) return user.email;
  return "Not verified";
}

function getTicketDeliveryMessage(ticket: BuizzTicket) {
  return `Your ticket has been sent to ${formatWhatsappNumber(ticket.buyerPhone ?? "")} on WhatsApp.`;
}

function formatWhatsappNumber(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "Not available";
  return trimmed.startsWith("+") ? trimmed : `+91 ${trimmed}`;
}

function withSelectedCity(text: string, city: string) {
  return text.replace(/\bin Pune\b/g, `in ${city}`).replace(/\bPune\b/g, city);
}

function previewStamp(item: DiscoveryItem) {
  const text = `${item.title} ${item.kind} ${item.category} ${item.genre}`.toLowerCase();
  if (item.kind === "plays" || text.includes("theatre") || text.includes("play")) return "Theatre Lover";
  if (text.includes("comedy")) return "Comedy Fan";
  if (text.includes("sport") || text.includes("cricket") || text.includes("football") || text.includes("badminton")) return "Sports Explorer";
  if (text.includes("food")) return "Food Trailblazer";
  if (text.includes("business") || text.includes("startup")) return "Business Networker";
  if (text.includes("spiritual")) return "Spiritual Seeker";
  if (text.includes("culture") || text.includes("art")) return "Culture Collector";
  if (text.includes("festival") || text.includes("fest")) return "Festival Hopper";
  if (item.kind === "activities") return "Activity Explorer";
  return "Music Explorer";
}

function getDraftKey(itemId: string) {
  return `buizz-booking-draft-${itemId}`;
}
