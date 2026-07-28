export type SupportTicketSourceType = "Organizer" | "User" | "Admin";

export type SupportTicketCategory =

  | "Refund Request"

  | "Booking Issue"

  | "Payment Failed"

  | "Ticket QR Issue"

  | "Ticket Not Received"

  | "Seat Issue"

  | "Seat Map Issue"

  | "Settlement Issue"

  | "Event Approval"

  | "Entry Gate Scanner Issue"

  | "Technical Issue"

  | "Profile Update"

  | "General Query"

  | "Refund"

  | "Booking"

  | "Seat Map"

  | "Payment"

  | "Settlement"

  | "Ticket Scanner"

  | "Technical"

  | "Other";

export type SupportTicketPriority = "Low" | "Medium" | "High" | "Critical";

export type SupportTicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export type SupportTicketAssignee =

  | "Unassigned"

  | "Super Admin"

  | "Support Admin"

  | "Operations Admin"

  | "Finance Admin"

  | "Review Admin";



export type SupportTicket = {

  id: string;

  sourceType: SupportTicketSourceType;

  requesterName: string;

  requesterEmail: string;

  subject: string;

  description: string;

  category: SupportTicketCategory;

  priority: SupportTicketPriority;

  status: SupportTicketStatus;

  assignedTo: SupportTicketAssignee;

  createdAt: string;

  lastUpdated: string;

};



export const SUPPORT_TICKETS_STORAGE_KEY = "buizz-support-tickets";



export const supportTicketCategories: SupportTicketCategory[] = [

  "Payment Failed",

  "Ticket QR Issue",

  "Entry Gate Scanner Issue",

  "Seat Map Issue",

  "Seat Issue",

  "Settlement Issue",

  "Refund Request",

  "Booking Issue",

  "Ticket Not Received",

  "Event Approval",

  "Technical Issue",

  "Profile Update",

  "General Query",

  "Other",

];



export const supportTicketPriorities: SupportTicketPriority[] = ["Low", "Medium", "High", "Critical"];



export const supportTicketAssignees: SupportTicketAssignee[] = [

  "Unassigned",

  "Super Admin",

  "Support Admin",

  "Operations Admin",

  "Finance Admin",

  "Review Admin",

];



export const adminSupportAssignees: SupportTicketAssignee[] = [

  "Support Admin",

  "Operations Admin",

  "Finance Admin",

  "Review Admin",

];



export const supportTicketStatuses: SupportTicketStatus[] = [

  "Open",

  "In Progress",

  "Resolved",

  "Closed",

];



export function getAutoSupportPriority(category: SupportTicketCategory): SupportTicketPriority {

  const highPriorityCategories: SupportTicketCategory[] = [

    "Payment Failed",

    "Ticket QR Issue",

    "Entry Gate Scanner Issue",

    "Seat Map Issue",

    "Seat Issue",

    "Settlement Issue",

    "Payment",

    "Seat Map",

    "Settlement",

    "Ticket Scanner",

  ];



  const mediumPriorityCategories: SupportTicketCategory[] = [

    "Refund Request",

    "Booking Issue",

    "Ticket Not Received",

    "Event Approval",

    "Technical Issue",

    "Refund",

    "Booking",

    "Technical",

  ];



  if (highPriorityCategories.includes(category)) return "High";

  if (mediumPriorityCategories.includes(category)) return "Medium";

  return "Low";

}



export const getAutoPriority = getAutoSupportPriority;



function normalizeSupportTicket(ticket: SupportTicket): SupportTicket {

  const priority = supportTicketPriorities.includes(ticket.priority)

    ? ticket.priority

    : getAutoSupportPriority(ticket.category);



  return { ...ticket, priority };

}



export function getSupportTickets() {

  if (typeof window === "undefined") return [];



  try {

    const raw = window.localStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);

    if (!raw) {

      saveSupportTickets([]);

      return [];

    }



    const parsed = JSON.parse(raw) as SupportTicket[];

    return Array.isArray(parsed) ? parsed.map(normalizeSupportTicket) : [];

  } catch {

    return [];

  }

}



export function saveSupportTickets(tickets: SupportTicket[]) {

  if (typeof window === "undefined") return;

  window.localStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(tickets));

}



export function createSupportTicketId() {

  return `SUP-${Date.now().toString().slice(-6)}`;

}



export function getSupportTimestamp() {

  return new Date().toLocaleString("en-IN");

}

