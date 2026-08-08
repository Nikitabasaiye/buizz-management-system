const axios = require('axios');
const { getParameter } = require('./ssm');

// Config: prefer env, then SSM
async function getConfig() {
  const cfg = {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v17.0',
  };

  if (!cfg.phoneNumberId) cfg.phoneNumberId = await getParameter('/buizz/prod/server/WHATSAPP_PHONE_NUMBER_ID');
  if (!cfg.accessToken) cfg.accessToken = await getParameter('/buizz/prod/server/WHATSAPP_ACCESS_TOKEN');
  return cfg;
}

async function sendTemplateMessage({ to, templateName, language = 'en_US', components = [] }) {
  const { phoneNumberId, accessToken, apiVersion } = await getConfig();
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const res = await axios.post(url, body, { headers, timeout: 10000 });
  return res.data;
}

async function sendTextMessage({ to, text }) {
  const { phoneNumberId, accessToken, apiVersion } = await getConfig();
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const res = await axios.post(url, body, { headers, timeout: 10000 });
  return res.data;
}

module.exports = {
  sendTemplateMessage,
  sendTextMessage,
};
