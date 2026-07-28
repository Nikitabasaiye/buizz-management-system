"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import {
  getPrimaryOrganizerApplication,
  saveOrganizerApplication,
  updateOrganizerApplicationStatus,
  ORGANIZER_APPLICATIONS_UPDATED_EVENT,
  buizzIntegrationStorageKeys,
  type OrganizerApplication,
  type OrganizerApplicationStatus as SharedOrganizerApplicationStatus,
} from "@/features/integration";
import { useGetKycStatusQuery } from "@/store";
import {
  getOrganizerSession,
  setOrganizerSession,
} from "@/features/auth/authSession";

export type OrganizerApprovalStatus =
  | "pending"
  | "approved"
  | "changes_required"
  | "rejected";

export type ApprovalActor = "admin" | "super_admin" | "system";

export type OrganizerApprovalState = {
  applicationId: string;
  organizationName: string;
  submittedOn: string;
  organizerStatus: OrganizerApprovalStatus;
  adminApprovalStatus: OrganizerApprovalStatus;
  superAdminApprovalStatus: OrganizerApprovalStatus;
  approvedByRole?: ApprovalActor;
  approvedByName?: string;
  approvedAt?: string;
  changesRequiredBy?: ApprovalActor;
  changesRequiredComment?: string;
  accessStatus?: "locked" | "unlocked";
  updatedAt?: string;
};

export const ORGANIZER_APPROVAL_STORAGE_KEY =
  buizzIntegrationStorageKeys.organizerApplications;

const defaultOrganizerApprovalState: OrganizerApprovalState = {
  applicationId: "pending-kyc",
  organizationName: "Organizer profile",
  submittedOn: "Not submitted",
  organizerStatus: "pending",
  adminApprovalStatus: "pending",
  superAdminApprovalStatus: "pending",
  accessStatus: "locked",
};

function formatSubmittedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeSharedStatus(
  status: OrganizerApprovalStatus | undefined,
): SharedOrganizerApplicationStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function approvalActorFromRole(role?: OrganizerApplication["reviewedRole"]) {
  if (role === "super-admin") return "super_admin";
  if (role === "admin") return "admin";
  return undefined;
}

function approvalStateFromApplication(
  application: OrganizerApplication,
): OrganizerApprovalState {
  const approvedByRole = approvalActorFromRole(application.reviewedRole);

  return normalizeOrganizerApprovalState({
    applicationId: application.id,
    organizationName: application.organizationName,
    submittedOn: formatSubmittedDate(application.submittedAt),
    organizerStatus: application.organizerStatus,
    adminApprovalStatus: application.adminApprovalStatus,
    superAdminApprovalStatus: application.superAdminApprovalStatus,
    approvedByRole: application.status === "approved" ? approvedByRole : undefined,
    approvedByName:
      application.status === "approved" ? application.reviewedBy : undefined,
    approvedAt:
      application.status === "approved" ? application.reviewedAt : undefined,
    changesRequiredBy:
      application.status === "rejected" ? approvedByRole : undefined,
    changesRequiredComment: application.rejectionReason,
    accessStatus: application.accessStatus,
    updatedAt: application.reviewedAt,
  });
}

function normalizeOrganizerApprovalState(
  state: OrganizerApprovalState,
): OrganizerApprovalState {
  const isApprovedByAnyone =
    state.adminApprovalStatus === "approved" ||
    state.superAdminApprovalStatus === "approved";

  const hasChangesRequired =
    state.adminApprovalStatus === "changes_required" ||
    state.superAdminApprovalStatus === "changes_required";

  const hasRejected =
    state.adminApprovalStatus === "rejected" ||
    state.superAdminApprovalStatus === "rejected";

  if (isApprovedByAnyone) {
    return {
      ...state,
      organizerStatus: "approved",
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
  }

  if (hasRejected) {
    return {
      ...state,
      organizerStatus: "rejected",
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
  }

  if (hasChangesRequired) {
    return {
      ...state,
      organizerStatus: "changes_required",
      updatedAt: state.updatedAt ?? new Date().toISOString(),
    };
  }

  return {
    ...state,
    organizerStatus: "pending",
  };
}

export function getOrganizerApprovalState(): OrganizerApprovalState {
  if (typeof window === "undefined") {
    return defaultOrganizerApprovalState;
  }

  try {
    const application = getPrimaryOrganizerApplication();
    if (!application) {
      return defaultOrganizerApprovalState;
    }
    const state = approvalStateFromApplication(application);
    return state;
  } catch {
    return defaultOrganizerApprovalState;
  }
}

export function saveOrganizerApprovalState(
  nextState: Partial<OrganizerApprovalState>,
) {
  if (typeof window === "undefined") return;

  const current = getOrganizerApprovalState();

  const normalized = normalizeOrganizerApprovalState({
    ...current,
    ...nextState,
    updatedAt: new Date().toISOString(),
  });

  const currentApplication = getPrimaryOrganizerApplication();
  if (!currentApplication) return;

  saveOrganizerApplication({
    ...currentApplication,
    organizationName: normalized.organizationName,
    status: normalizeSharedStatus(normalized.organizerStatus),
    organizerStatus: normalizeSharedStatus(normalized.organizerStatus),
    adminApprovalStatus: normalizeSharedStatus(normalized.adminApprovalStatus),
    superAdminApprovalStatus: normalizeSharedStatus(
      normalized.superAdminApprovalStatus,
    ),
    accessStatus: canAccessOrganizerDashboard(normalized) ? "unlocked" : "locked",
    reviewedAt: normalized.approvedAt ?? normalized.updatedAt,
    reviewedBy: normalized.approvedByName,
    reviewedRole:
      normalized.approvedByRole === "super_admin"
        ? "super-admin"
        : normalized.approvedByRole === "admin"
          ? "admin"
          : currentApplication.reviewedRole,
    rejectionReason: normalized.changesRequiredComment,
  });

  window.dispatchEvent(new Event(ORGANIZER_APPLICATIONS_UPDATED_EVENT));
  window.dispatchEvent(new Event("buizz-organizer-approval-updated"));
}

export function approveOrganizerApplication(
  actor: Exclude<ApprovalActor, "system">,
  approvedByName = actor === "admin" ? "Admin" : "Super Admin",
) {
  const application = getPrimaryOrganizerApplication();
  if (!application) return;

  updateOrganizerApplicationStatus({
    applicationId: application.id,
    status: "approved",
    actorName: approvedByName,
    actorRole: actor === "super_admin" ? "super-admin" : "admin",
    comment: `Organizer application approved by ${approvedByName}.`,
  });

  window.dispatchEvent(new Event("buizz-organizer-approval-updated"));
}

export function markOrganizerChangesRequired(
  actor: Exclude<ApprovalActor, "system">,
  comment = "Please update the required organizer details and documents.",
) {
  const current = getOrganizerApprovalState();

  saveOrganizerApprovalState({
    adminApprovalStatus:
      actor === "admin" ? "changes_required" : current.adminApprovalStatus,
    superAdminApprovalStatus:
      actor === "super_admin"
        ? "changes_required"
        : current.superAdminApprovalStatus,
    organizerStatus: "changes_required",
    changesRequiredBy: actor,
    changesRequiredComment: comment,
  });
}

export function rejectOrganizerApplication(
  actor: Exclude<ApprovalActor, "system">,
  comment = "Organizer application rejected after review.",
) {
  const application = getPrimaryOrganizerApplication();
  if (!application) return;

  updateOrganizerApplicationStatus({
    applicationId: application.id,
    status: "rejected",
    actorName: actor === "admin" ? "Admin" : "Super Admin",
    actorRole: actor === "super_admin" ? "super-admin" : "admin",
    comment,
  });

  window.dispatchEvent(new Event("buizz-organizer-approval-updated"));
}

export function canAccessOrganizerDashboard(
  state: OrganizerApprovalState = getOrganizerApprovalState(),
) {
  return (
    state.accessStatus === "unlocked" ||
    state.organizerStatus === "approved" ||
    state.adminApprovalStatus === "approved" ||
    state.superAdminApprovalStatus === "approved"
  );
}

export function DashboardLockNotice() {
  const [state, setState] = useState<OrganizerApprovalState>(
    defaultOrganizerApprovalState,
  );
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false);

  const { data: kycData, refetch: refetchKyc } = useGetKycStatusQuery();

  useEffect(() => {
    const sync = () => {
      setState(getOrganizerApprovalState());
      setHasSubmittedApplication(Boolean(getPrimaryOrganizerApplication()));
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ORGANIZER_APPLICATIONS_UPDATED_EVENT, sync);
    window.addEventListener("buizz-organizer-approval-updated", sync);

    const refreshKyc = () => { void refetchKyc(); };
    const pollInterval = setInterval(refreshKyc, 5000);
    window.addEventListener("focus", refreshKyc);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ORGANIZER_APPLICATIONS_UPDATED_EVENT, sync);
      window.removeEventListener("buizz-organizer-approval-updated", sync);
      clearInterval(pollInterval);
      window.removeEventListener("focus", refreshKyc);
    };
  }, [refetchKyc]);


  useEffect(() => {
    if (!kycData?.data) return;
    const dbUser = kycData.data.user;
    const latestRequest = kycData.data.latestRequest;
    const kycStatus = dbUser?.kyc_status ?? latestRequest?.status;
    const bankStatus = dbUser?.bank_verification_status ?? latestRequest?.bank_status;
    const hasDatabaseSubmission =
      Boolean(latestRequest?.id) ||
      (Boolean(kycStatus) && kycStatus !== "not_submitted") ||
      (Boolean(bankStatus) && bankStatus !== "not_submitted");
    if (hasDatabaseSubmission) {
      setHasSubmittedApplication(true);
    }
    const rejectionReason =
      latestRequest?.rejection_reason ??
      latestRequest?.review_notes ??
      "Your organizer account was rejected. Please update the required details and submit again.";
    const isVerified =
      (kycStatus === 'verified' || kycStatus === 'approved') &&
      (bankStatus === 'verified' || bankStatus === 'approved');
    if (isVerified) {
      saveOrganizerApprovalState({
        adminApprovalStatus: 'approved',
        superAdminApprovalStatus: 'approved',
        organizerStatus: 'approved',
        accessStatus: 'unlocked',
      });
      const organizerSession = getOrganizerSession();
      if (organizerSession) {
        setOrganizerSession({
          ...organizerSession,
          status: "approved",
          isVerified: true,
          isKycVerified: true,
        });
      }
      setState(getOrganizerApprovalState());
      return;
    }

    if (kycStatus === "rejected" || bankStatus === "rejected" || latestRequest?.status === "rejected") {
      saveOrganizerApprovalState({
        adminApprovalStatus: "rejected",
        superAdminApprovalStatus: "rejected",
        organizerStatus: "rejected",
        accessStatus: "locked",
        changesRequiredBy: "super_admin",
        changesRequiredComment: rejectionReason,
      });
      setState(getOrganizerApprovalState());
      return;
    }

    if (kycStatus === "pending" || bankStatus === "pending" || latestRequest?.status === "pending") {
      saveOrganizerApprovalState({
        adminApprovalStatus: "pending",
        superAdminApprovalStatus: "pending",
        organizerStatus: "pending",
        accessStatus: "locked",
        changesRequiredComment: undefined,
      });
      setState(getOrganizerApprovalState());
    }
  }, [kycData]);
  if (canAccessOrganizerDashboard(state)) return null;

  const databasePending =
    kycData?.data?.latestRequest?.status === "pending" ||
    kycData?.data?.user?.kyc_status === "pending" ||
    kycData?.data?.user?.bank_verification_status === "pending";

  if ((hasSubmittedApplication || databasePending) && state.organizerStatus === "pending") {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-amber-600">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-sm font-black">KYC Verification Under Review</p>
            <p className="mt-1 text-sm font-semibold leading-6">
              Your uploaded documents were submitted successfully and sent to Admin/Super Admin for verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-red-600">
          <ShieldAlert className="size-6" />
        </span>
        <div>
          <p className="text-sm font-black">KYC Verification Required</p>
          <p className="mt-1 text-sm font-semibold leading-6">
            Please upload and verify your KYC documents before you can publish any events.
          </p>
          <Link
            href="/organizer/upload-documents"
            className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-red-600 px-4 text-xs font-black text-white hover:bg-red-700"
          >
            Upload KYC Documents
          </Link>
        </div>
      </div>
    </div>
  );
}

export function OrganizerApplicationStatusScreen() {
  const [state, setState] = useState<OrganizerApprovalState>(
    defaultOrganizerApprovalState,
  );

  useEffect(() => {
    const sync = () => setState(getOrganizerApprovalState());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ORGANIZER_APPLICATIONS_UPDATED_EVENT, sync);
    window.addEventListener("buizz-organizer-approval-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ORGANIZER_APPLICATIONS_UPDATED_EVENT, sync);
      window.removeEventListener("buizz-organizer-approval-updated", sync);
    };
  }, []);

  const accountApproved = state.organizerStatus === "approved";
  const canResubmit = state.organizerStatus === "rejected" || state.organizerStatus === "changes_required";

  const heroContent = useMemo(() => {
    if (accountApproved) {
      return {
        title: "Application Approved",
        description:
          state.approvedByName && state.approvedByRole
            ? `Your application was approved by ${formatActor(state.approvedByRole)}. Dashboard access is now unlocked.`
            : "Your application has been approved. Dashboard access is now unlocked.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };
    }

    if (state.organizerStatus === "changes_required") {
      return {
        title: "Changes Required",
        description:
          state.changesRequiredComment ??
          "Please update the required details and submit again.",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        icon: AlertCircle,
      };
    }

    if (state.organizerStatus === "rejected") {
      return {
        title: "Application Rejected",
        description:
          state.changesRequiredComment ??
          "Your organizer application was rejected after review.",
        tone: "border-red-200 bg-red-50 text-red-700",
        icon: XCircle,
      };
    }

    return {
      title: "Application Under Review",
      description:
        "Your application is waiting for Admin or Super Admin approval.",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      icon: Clock,
    };
  }, [accountApproved, state]);

  const HeroIcon = heroContent.icon;

  const timeline: Array<{
    title: string;
    status: OrganizerApprovalStatus | "completed";
    description: string;
  }> = [
      {
        title: "Application Submitted",
        status: "completed",
        description: "Your organizer profile, documents, and agreement are saved.",
      },
      {
        title: "Admin Review",
        status: state.adminApprovalStatus,
        description:
          state.adminApprovalStatus === "approved"
            ? "Admin approved the organizer application."
            : "Buizz admin checks business details and submitted documents.",
      },
      {
        title: "Super Admin Review",
        status: state.superAdminApprovalStatus,
        description:
          state.superAdminApprovalStatus === "approved"
            ? "Super Admin approved the organizer application."
            : "Super Admin can also approve the profile and unlock dashboard access.",
      },
      {
        title: "Dashboard Access",
        status: accountApproved ? "approved" : "pending",
        description: accountApproved
          ? "Organizer account is approved."
          : "Update details and submit again for Super Admin approval.",
      },
    ];

  return (
    <main className="min-h-screen bg-[#f8f9fd] px-4 py-8 text-[#070a1a] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-8 inline-flex text-[#070a1a]"
        >
          <BuizzLogo
            variant="light"
            size="xl"
            showSubtitle
            subtitle="Application Status"
          />
        </Link>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
            <div className={`rounded-[28px] border p-5 ${heroContent.tone}`}>
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white">
                  <HeroIcon className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide opacity-70">
                    Organizer Status
                  </p>
                  <h1 className="mt-2 text-3xl font-black leading-tight">
                    {heroContent.title}
                  </h1>
                  <p className="mt-2 text-sm font-bold leading-6 opacity-80">
                    {heroContent.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatusCard title="Organizer Status" status={state.organizerStatus} />
              <StatusCard title="Admin Review" status={state.adminApprovalStatus} />
              <StatusCard
                title="Super Admin Review"
                status={state.superAdminApprovalStatus}
              />
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-[#fbfcff] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Access
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {accountApproved ? "Account Approved" : canResubmit ? "Update and Resubmit" : "Approval Pending"}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {accountApproved
                      ? "Your organizer account is verified and approved."
                      : canResubmit
                        ? "Update your organizer details or KYC documents, then submit again for approval."
                        : "Your organizer account is waiting for Super Admin approval."}
                  </p>
                </div>

                <Link
                  href={accountApproved ? "/organizer/dashboard" : canResubmit ? "/organizer/upload-documents" : "/organizer/application-status"}
                  aria-label={accountApproved ? "Open organizer dashboard" : canResubmit ? "Update organizer details" : "Approval pending"}
                  aria-disabled={!accountApproved && !canResubmit}
                  className={`inline-flex min-h-12 min-w-[190px] shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-black shadow-[0_14px_34px_rgba(5,8,22,0.18)] transition active:scale-[0.98] ${accountApproved || canResubmit
                      ? "bg-[#070a1a] !text-white hover:bg-[#ec1b72]"
                      : "pointer-events-none bg-slate-300 !text-slate-700"
                    }`}
                >
                  <LayoutDashboard className="size-4 shrink-0" />
                  <span className="whitespace-nowrap !text-current">
                    {accountApproved ? "Open Dashboard" : canResubmit ? "Update Details" : "Pending Review"}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#fff0f6] text-[#ec1b72]">
                  <FileCheck2 className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Application Details
                  </p>
                  <h2 className="text-2xl font-black">Profile Review</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <DetailRow label="Application ID" value={state.applicationId} />
                <DetailRow label="Organization" value={state.organizationName} />
                <DetailRow label="Submitted On" value={state.submittedOn} />
                <DetailRow
                  label="Access"
                  value={
                    accountApproved
                      ? "Approved by Super Admin"
                      : canResubmit
                        ? "Rejected - update required"
                        : "Pending Super Admin review"
                  }
                />
                {state.changesRequiredComment && canResubmit ? (
                  <DetailRow label="Rejection Reason" value={state.changesRequiredComment} />
                ) : null}
                {state.approvedByRole ? (
                  <DetailRow
                    label="Approved By"
                    value={`${formatActor(state.approvedByRole)}${state.approvedByName ? ` - ${state.approvedByName}` : ""
                      }`}
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#eef2ff] text-[#6626b9]">
                  <ShieldCheck className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Approval Timeline
                  </p>
                  <h2 className="text-2xl font-black">Review Progress</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={item.title}
                    index={index + 1}
                    title={item.title}
                    status={item.status}
                    description={item.description}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  title,
  status,
}: {
  title: string;
  status: OrganizerApprovalStatus;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase text-slate-400">{title}</p>
      <div className="mt-3">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8f9fd] px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="text-sm font-black text-[#070a1a]">{value}</p>
    </div>
  );
}

function TimelineItem({
  index,
  title,
  status,
  description,
}: {
  index: number;
  title: string;
  status: OrganizerApprovalStatus | "completed";
  description: string;
}) {
  const isDone = status === "completed" || status === "approved";

  return (
    <div className="flex gap-4">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-black ${isDone
          ? "bg-emerald-500 text-white"
          : status === "changes_required"
            ? "bg-amber-500 text-white"
            : status === "rejected"
              ? "bg-red-500 text-white"
              : "bg-slate-200 text-slate-600"
          }`}
      >
        {isDone ? <CheckCircle2 className="size-4" /> : index}
      </span>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black">{title}</h3>
          <StatusBadge status={status === "completed" ? "approved" : status} />
        </div>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrganizerApprovalStatus }) {
  const label =
    status === "approved"
      ? "Approved"
      : status === "changes_required"
        ? "Changes Required"
        : status === "rejected"
          ? "Rejected"
          : "Pending";

  const tone =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "changes_required"
        ? "bg-amber-100 text-amber-700"
        : status === "rejected"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tone}`}>
      {label}
    </span>
  );
}

function formatActor(actor: ApprovalActor) {
  if (actor === "super_admin") return "Super Admin";
  if (actor === "admin") return "Admin";
  return "System";
}
