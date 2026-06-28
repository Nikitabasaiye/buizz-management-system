# Meta WhatsApp Business API Setup Guide

This guide will help you configure Meta Developer Tools for WhatsApp Business API integration with your Buizz Management System.

## Prerequisites

- Meta for Developers account (https://developers.facebook.com/)
- A Meta Business Account
- Facebook Business Manager account
- Active phone number for WhatsApp Business

## Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click on **"My Apps"** → **"Create App"**
3. Select **"Business"** app type
4. Enter app name: `Buizz Management System`
5. Enter contact email
6. Click **"Create App"**

## Step 2: Add WhatsApp Product

1. In your app dashboard, click **"Add Products"**
2. Find and click **"WhatsApp"** → **"Set Up"**
3. Select your **WhatsApp Business Account** (or create a new one)
4. Choose between **Test Number** (for development) or **Production Number** (for live)

## Step 3: Configure Webhook

1. In WhatsApp product settings, go to **"Configuration"** tab
2. Under **"Webhooks"** section, click **"Edit"**
3. Enter your webhook URL:
   - **Production (Server)**: `https://api.buizz.com/api/webhooks/whatsapp`
   - **Production (Admin)**: `https://admin.buizz.com/api/webhooks/whatsapp`
   - **Local Development**: Use ngrok: `https://your-ngrok-url.ngrok-free.app/api/webhooks/whatsapp`
4. Enter **Verify Token**: `buizz_webhook_token_2024` (or your custom token)
5. Click **"Verify and Save"**

**Note**: Both admin and server folders have webhook endpoints configured. You can use either one or both depending on your needs.

## Step 4: Subscribe to Webhook Fields

After webhook verification, subscribe to these fields:
- `messages`
- `message_status` (optional, for delivery tracking)

## Step 5: Get Access Token and Phone Number ID

1. In WhatsApp Configuration, under **"Phone numbers"** section
2. Click on your phone number
3. Copy the **Phone Number ID** (e.g., `123456789012345`)
4. Scroll down to **"Access Token"** section
5. Click **"Generate"** or **"Regenerate"**
6. Copy the **Permanent Access Token** (save this securely!)

## Step 6: Get Business Account ID

1. Go to **WhatsApp Manager** in Meta Business Suite
2. Select your **WhatsApp Business Account**
3. The Business Account ID is displayed in the URL or account details
4. Format: `123456789012345`

## Step 7: Get App Secret

1. Go to your App Dashboard
2. Click **"Settings"** → **"Basic"**
3. Scroll to **"App Secret"** section
4. Click **"Show"** or **"Generate"**
5. Copy the App Secret (save this securely!)

## Step 8: Update Environment Variables

Add these variables to your `.env` file:

```env
# Meta WhatsApp Business API Configuration
META_WHATSAPP_API_URL=https://graph.facebook.com/v23.0
META_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
META_WEBHOOK_VERIFY_TOKEN=buizz_webhook_token_2024
META_APP_SECRET=your_app_secret_here

# WhatsApp Public URL (for QR code images)
WHATSAPP_PUBLIC_BASE_URL=https://api.buizz.com
```

## Step 9: Register Message Templates

WhatsApp requires pre-approved message templates for sending messages outside the 24-hour window.

### Using API to Register Templates

You can register templates via the admin API:

```bash
# Register booking confirmation template
POST /api/v1/whatsapp/templates/register
Authorization: Bearer <admin_jwt_token>

# Register event reminder template
POST /api/v1/whatsapp/templates/reminder/register
Authorization: Bearer <admin_jwt_token>
```

### Or Register via Meta Dashboard

1. Go to **WhatsApp Manager** → **Message Templates**
2. Click **"Create Message Template"**
3. Template name: `booking_confirmation`
4. Category: `Utility`
5. Language: `English`
6. Add template content (see examples below)

### Template Examples

**Booking Confirmation Template:**
```
Hi {{1}}, your booking for {{2}} is confirmed. Date: {{3}}. Venue: {{4}}. Ticket: {{5}}. Amount: {{6}}. Order: {{7}}.
```

**Event Reminder Template:**
```
Reminder: {{1}} is coming up on {{2}} at {{3}}. Ticket: {{4}}. Please keep your QR code ready for entry.
```

## Step 10: Test the Integration

### Check WhatsApp Status

```bash
GET /api/v1/whatsapp/status
Authorization: Bearer <admin_jwt_token>
```

### Send Test Message

```bash
POST /api/v1/whatsapp/test
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "phoneNumber": "919876543210",
  "message": "Hello from Buizz!"
}
```

## Step 11: Webhook Testing

### Test Webhook Verification

Meta will send a GET request to verify your webhook:
```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=123456789&hub.verify_token=buizz_webhook_token_2024
```

Your server should respond with the challenge value.

**Test URLs:**
- Production Server: `https://api.buizz.com/api/webhooks/whatsapp`
- Production Admin: `https://admin.buizz.com/api/webhooks/whatsapp`
- Local: `http://localhost:5000/api/webhooks/whatsapp` or `http://localhost:5001/api/webhooks/whatsapp`

### Test Webhook Events

Send a message to your WhatsApp Business number from your phone. The webhook should receive the message and log it.

## Important Notes

### Security Best Practices

- **Never commit** `.env` file to version control
- Use **environment variables** for all sensitive data
- Implement **rate limiting** on webhook endpoints
- Verify **webhook signatures** for all POST requests
- Use **HTTPS** for production webhooks

### Rate Limits

- WhatsApp Business API has rate limits based on phone number tier
- Test numbers have lower limits than production numbers
- Monitor your usage in Meta Dashboard

### 24-Hour Window

- You can only send **template messages** outside the 24-hour window
- Within 24 hours of user interaction, you can send **free-form messages**
- User interaction includes: sending a message, clicking a button, etc.

### Local Development

For local development, use **ngrok** to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm start

# In another terminal, expose port 5000
ngrok http 5000

# Use the ngrok URL in Meta webhook configuration
# Example: https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

## Troubleshooting

### Webhook Verification Failed

- Check that the verify token matches exactly
- Ensure your server is accessible from the internet
- Check server logs for errors

### Messages Not Sending

- Verify access token is valid and not expired
- Check phone number ID is correct
- Ensure template is approved (for template messages)
- Check rate limits in Meta Dashboard

### Webhook Not Receiving Events

- Verify webhook is subscribed to correct fields
- Check webhook signature validation
- Ensure server is running and accessible
- Check Meta Dashboard for webhook delivery status

## Next Steps

1. Implement chatbot logic in `handleIncomingMessage` function
2. Add database tracking for message statuses
3. Implement automated event reminders
4. Add support for media messages (images, documents)
5. Implement two-way messaging for customer support

## Resources

- [Meta WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Webhooks Documentation](https://developers.facebook.com/docs/webhooks)
- [WhatsApp Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/message-templates)
- [Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/limits)

## Support

For issues or questions:
- Check server logs in `logs/` directory
- Review Meta Dashboard for API errors
- Check webhook delivery status in Meta Dashboard
