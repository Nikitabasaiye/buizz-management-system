import { apiSlice } from '../apiSlice';

// WhatsApp API
export const whatsappApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendTemplateMessage: builder.mutation<any, { phoneNumber: string; templateName: string; languageCode: string; components: any[] }>({
      query: (data) => ({
        url: '/whatsapp/send-template',
        method: 'POST',
        body: data,
      }),
    }),
    
    getTemplateStatus: builder.query<any, string>({
      query: (messageId) => `/whatsapp/template-status/${messageId}`,
    }),
    
    getWhatsAppConfig: builder.query<any, void>({
      query: () => '/whatsapp/config',
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendTemplateMessageMutation,
  useGetTemplateStatusQuery,
  useGetWhatsAppConfigQuery,
} = whatsappApi;
