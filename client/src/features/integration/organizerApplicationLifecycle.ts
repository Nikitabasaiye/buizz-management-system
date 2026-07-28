"use client";

import {
  buizzIntegrationStorageKeys,
  readStorageArray,
  writeStorageValue,
  canUseClientStorage,
  uniqueBy,
} from "./frontendStorage";
import { getRoleSession } from "@/features/auth/authSession";

export type OrganizerApplicationStatus = "pending" | "approved" | "rejected";
export type OrganizerAccessStatus = "locked" | "unlocked";
export type OrganizerReviewRole = "admin" | "super-admin";

export type OrganizerApplicationAuditEntry = {
  id: string;
  actorName: string;
  actorRole: OrganizerReviewRole | "organizer" | "system";
  action: "submitted" | "approved" | "rejected" | "updated";
  createdAt: string;
  comment: string;
};

export type OrganizerApplication = {
  id: string;
  organizerId: string;
  organizationName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  status: OrganizerApplicationStatus;
  organizerStatus: OrganizerApplicationStatus;
  adminApprovalStatus: OrganizerApplicationStatus;
  superAdminApprovalStatus: OrganizerApplicationStatus;
  accessStatus: OrganizerAccessStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedRole?: OrganizerReviewRole;
  rejectionReason?: string;
  documents: Record<string, boolean>;
  auditTrail: OrganizerApplicationAuditEntry[];
};

export const ORGANIZER_APPLICATIONS_UPDATED_EVENT =
  "buizz-organizer-applications-updated";

const nowIso = () => new Date().toISOString();

const seedOrganizerApplications: OrganizerApplication[] = [];

function normalizeOrganizerApplication(
  application: OrganizerApplication,
): OrganizerApplication {
  const isApproved =
    application.status === "approved" ||
    application.adminApprovalStatus === "approved" ||
    application.superAdminApprovalStatus === "approved";

  const isRejected =
    application.status === "rejected" ||
    application.adminApprovalStatus === "rejected" ||
    application.superAdminApprovalStatus === "rejected";

  const status: OrganizerApplicationStatus = isApproved
    ? "approved"
    : isRejected
      ? "rejected"
      : "pending";

  return {
    ...application,
    status,
    organizerStatus: status,
    accessStatus: status === "approved" ? "unlocked" : "locked",
    auditTrail: Array.isArray(application.auditTrail)
      ? application.auditTrail
      : [],
    documents:
      application.documents && typeof application.documents === "object"
        ? application.documents
        : {},
  };
}

function readSeededOrganizerApplications() {
  const stored = readStorageArray<OrganizerApplication>(
    buizzIntegrationStorageKeys.organizerApplications,
  );

  if (stored.length) {
    return uniqueBy(
      stored.map(normalizeOrganizerApplication),
      (item) => item.id,
    );
  }

  return seedOrganizerApplications;
}

export function getOrganizerApplications() {
  return readSeededOrganizerApplications();
}

export function saveOrganizerApplications(applications: OrganizerApplication[]) {
  const normalized = uniqueBy(
    applications.map(normalizeOrganizerApplication),
    (item) => item.id,
  );

  writeStorageValue(
    buizzIntegrationStorageKeys.organizerApplications,
    normalized,
  );

  if (canUseClientStorage()) {
    window.dispatchEvent(new Event(ORGANIZER_APPLICATIONS_UPDATED_EVENT));
  }
}

export function saveOrganizerApplication(application: OrganizerApplication) {
  const applications = getOrganizerApplications();
  const normalized = normalizeOrganizerApplication(application);

  saveOrganizerApplications([
    normalized,
    ...applications.filter((item) => item.id !== normalized.id),
  ]);

  return normalized;
}

export function getPrimaryOrganizerApplication() {
  const applications = getOrganizerApplications();
  const session = getRoleSession("organizer");
  const sessionKeys = [
    session?.userId,
    session?.displayId,
    session?.email,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  if (!sessionKeys.length) return undefined;

  return applications.find((application) => {
    const applicationKeys = [
      application.organizerId,
      application.email,
      application.id,
    ].map((value) => String(value ?? "").trim().toLowerCase());

    return applicationKeys.some((key) => sessionKeys.includes(key));
  });
}

export function getOrganizerApplicationById(id: string) {
  return getOrganizerApplications().find((item) => item.id === id);
}

export function updateOrganizerApplicationStatus({
  applicationId,
  status,
  actorName,
  actorRole,
  comment,
}: {
  applicationId: string;
  status: "approved" | "rejected";
  actorName: string;
  actorRole: OrganizerReviewRole;
  comment: string;
}) {
  const applications = getOrganizerApplications();
  const target = applications.find((item) => item.id === applicationId);

  if (!target) return undefined;

  const createdAt = nowIso();
  const nextApplication: OrganizerApplication = normalizeOrganizerApplication({
    ...target,
    status,
    organizerStatus: status,
    adminApprovalStatus:
      actorRole === "admin" ? status : target.adminApprovalStatus,
    superAdminApprovalStatus:
      actorRole === "super-admin" ? status : target.superAdminApprovalStatus,
    accessStatus: status === "approved" ? "unlocked" : "locked",
    reviewedAt: createdAt,
    reviewedBy: actorName,
    reviewedRole: actorRole,
    rejectionReason: status === "rejected" ? comment : undefined,
    auditTrail: [
      {
        id: `org-app-audit-${Date.now()}`,
        actorName,
        actorRole,
        action: status,
        createdAt,
        comment,
      },
      ...target.auditTrail,
    ],
  });

  saveOrganizerApplications([
    nextApplication,
    ...applications.filter((item) => item.id !== applicationId),
  ]);

  return nextApplication;
}
