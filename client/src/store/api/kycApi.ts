import { apiSlice } from '../apiSlice';
import { toastUtils } from '@/utils/toast';

export type KycDocumentPayload = {
  type: string;
  url: string;
  fileName?: string | null;
  documentNumber?: string | null;
};

export type KycSubmissionPayload = {
  legalName: string;
  businessName?: string;
  panNumber: string;
  gstNumber?: string;
  aadhaarLast4?: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  documents: KycDocumentPayload[];
  bankDocuments: KycDocumentPayload[];
};

export type KycUploadResponse = {
  success: boolean;
  message: string;
  data: {
    url: string;
    fileName: string;
    documentType: string;
    fileSize?: number;
    uploadedAt?: string;
  };
};

export const kycApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /kyc/me — organizer fetches their own KYC status
    getKycStatus: builder.query<any, void>({
      query: () => ({
        url: '/kyc/me',
        headers: { 'x-buizz-role': 'organizer' },
      }),
      providesTags: ['KYC'],
      keepUnusedDataFor: 5,
    }),

    // POST /kyc/upload — upload a single document file
    uploadKycDocument: builder.mutation<KycUploadResponse, { file: File; documentType: string }>({
      query: ({ file, documentType }) => {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', documentType);
        return {
          url: '/kyc/upload',
          method: 'POST',
          body: formData,
          headers: {
            'x-buizz-role': 'organizer',
            'x-buizz-form-data': 'true',
          },
        };
      },
      invalidatesTags: ['KYC'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('Document uploaded successfully');
        } catch (error) {
          toastUtils.error('Failed to upload document');
        }
      },
    }),

    // POST /kyc/me — submit KYC form with document URLs
    submitKyc: builder.mutation<any, KycSubmissionPayload>({
      query: (body) => ({
        url: '/kyc/me',
        method: 'POST',
        body,
        headers: { 'x-buizz-role': 'organizer' },
      }),
      invalidatesTags: ['KYC', 'Organizer'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('KYC submitted for verification');
        } catch (error) {
          toastUtils.error('Failed to submit KYC');
        }
      },
    }),

    // GET /kyc/requests — super admin lists all KYC requests
    getKycRequests: builder.query<
      { success: boolean; data: { requests: any[]; pagination: any } },
      { page?: number; limit?: number; status?: string; role?: string }
    >({
      query: (params) => ({
        url: '/kyc/all-requests',
        params,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      providesTags: ['KYC'],
    }),

    // GET /kyc/requests/:id — get single KYC request
    getKycRequestById: builder.query<{ success: boolean; data: any }, number | string>({
      query: (id) => ({
        url: `/kyc/requests/${id}`,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      providesTags: (_, __, id) => [{ type: 'KYC', id }],
    }),

    // PATCH /kyc/requests/:id/review — super admin reviews KYC
    reviewKycRequest: builder.mutation<
      any,
      {
        requestId: string | number;
        status: 'verified' | 'rejected';
        bankStatus?: 'verified' | 'rejected';
        rejectionReason?: string;
        reviewNotes?: string;
      }
    >({
      query: ({ requestId, ...body }) => ({
        url: `/kyc/requests/${requestId}/review`,
        method: 'PATCH',
        body,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      invalidatesTags: ['KYC', 'Organizer', 'Approval'],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toastUtils.success('KYC review completed successfully');
        } catch (error) {
          toastUtils.error('Failed to review KYC request');
        }
      },
    }),

    // GET /kyc/requests/:requestId/documents/:documentId/download — download KYC document
    downloadKycDocument: builder.mutation<Blob, { requestId: string | number; documentId: string | number }>({
      query: ({ requestId, documentId }) => ({
        url: `/kyc/requests/${requestId}/documents/${documentId}/download`,
        headers: { 'x-buizz-role': 'super-admin' },
        responseHandler: (response) => response.blob(),
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const url = window.URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `kyc_document_${Date.now()}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
        }
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetKycStatusQuery,
  useUploadKycDocumentMutation,
  useSubmitKycMutation,
  useGetKycRequestsQuery,
  useGetKycRequestByIdQuery,
  useReviewKycRequestMutation,
  useDownloadKycDocumentMutation,
} = kycApi;
