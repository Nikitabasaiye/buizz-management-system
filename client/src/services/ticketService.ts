// All ticket operations use RTK Query hooks directly in components.
export {
  useGetMyTicketsQuery,
  useGetTicketByNumberQuery,
  useScanTicketMutation,
  useCancelTicketMutation,
  useGetEventTicketsQuery,
} from "@/store/api/ticketsApi";
