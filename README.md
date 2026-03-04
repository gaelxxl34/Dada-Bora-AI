# Dada Bora 👑

**Your Big Sister for All Seasons** - An AI-powered emotional support platform designed for Black women worldwide.

## Features

### 🌍 Multi-Channel Support
- **WhatsApp Integration** - Chat via WhatsApp using Twilio
- **Web Chat** - Browser-based chat at `/chat` with phone verification

### 💜 AI Personality
- Warm, sisterly personality that adapts to each user
- Cultural awareness across African and diaspora communities
- Progressive relationship building (stranger → acquaintance → friend → sister)

### 🛡️ Crisis Detection & Support
- Real-time detection of crisis keywords (suicide, abuse, depression, etc.)
- Automatic alert escalation to human agents
- Crisis resources provided when needed
- Dashboard for crisis alerts at `/dashboard/alerts`

### 📊 User Analytics
- Regional breakdown (Africa, Caribbean, North America, Europe, etc.)
- Country-specific user tracking
- Trust scores and relationship stages
- View at `/dashboard/analytics`

### 🧠 Progressive Profiling
- Learns about users over time through natural conversation
- Auto-detects location from phone number (100+ countries)
- Token-optimized context for efficient AI usage (~63% reduction)

## Environment Variables

Create a `.env.local` file:

```bash
# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="your-private-key"

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Twilio (WhatsApp & OTP)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid

# WhatsApp Webhook
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

## Getting Started

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Access Points
- **Landing Page**: `http://localhost:3000`
- **Web Chat**: `http://localhost:3000/chat`
- **Admin Dashboard**: `http://localhost:3000/dashboard`

## Architecture

### API Routes
- `/api/auth/otp` - OTP verification for web chat
- `/api/chat/web` - Web chat message handling
- `/api/whatsapp/webhook` - WhatsApp webhook integration
- `/api/alerts` - Crisis alerts management
- `/api/analytics/users` - User analytics data

### Key Libraries
- `/lib/dada-personality.ts` - AI personality system
- `/lib/crisis-detection.ts` - Crisis keyword detection
- `/lib/alert-system.ts` - Alert creation and notifications
- `/lib/user-profile.ts` - User profile management
- `/lib/progressive-profile.ts` - Token-optimized profiling
- `/lib/phone-location.ts` - Phone number country detection
- `/lib/otp-verification.ts` - Web chat authentication
- `/lib/product-recommendations.ts` - Product suggestion engine

## Twilio Setup

### WhatsApp
1. Create a Twilio account and set up WhatsApp Sandbox
2. Configure webhook URL: `https://your-domain.com/api/whatsapp/webhook`

### OTP Verification (for Web Chat)
1. Create a Verify Service in Twilio Console
2. Copy the Service SID to `TWILIO_VERIFY_SERVICE_SID`

## Firestore Collections

- `chats` - Conversation threads
- `chats/{chatId}/messages` - Individual messages
- `userProfiles` - User profiles and preferences
- `userSessionsByPhoneHash` - Phone hash to chatId mapping
- `webChatSessions` - Active web chat sessions
- `crisisAlerts` - Crisis detection alerts
- `integrations` - Third-party integrations config

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Twilio Verify](https://www.twilio.com/docs/verify)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

