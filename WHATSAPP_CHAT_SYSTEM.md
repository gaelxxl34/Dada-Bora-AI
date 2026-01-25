# WhatsApp Chat Integration

## Overview
This system manages WhatsApp conversations with complete user anonymization for privacy and security.

## Features
- **Anonymous Usernames**: Randomly generated names (e.g., SwiftLion247, BrightEagle891)
- **No User Data Storage**: Never stores actual phone numbers or identifying information
- **Real-time Updates**: Live chat and message updates using Firestore
- **Secure Hashing**: Phone numbers are hashed for chat consistency without storing actual numbers

## Firebase Structure

### Collections

#### `/chats` (Main Collection)
Each document represents a conversation:
```
{
  id: "chat_1234567890_abc123",
  anonymousName: "SwiftLion247",
  phoneNumberHash: "hash_abc123xyz", // Hashed - NOT the actual phone number
  lastMessage: "Hello, I need help",
  lastMessageTime: Timestamp,
  unreadCount: 5,
  createdAt: Timestamp
}
```

#### `/chats/{chatId}/messages` (Subcollection)
Each document is a message in the conversation:
```
{
  id: "auto-generated-id",
  content: "Message content here",
  timestamp: Timestamp,
  isFromUser: true // true = from WhatsApp user, false = from admin/bot
}
```

## API Endpoints

### POST /api/whatsapp/webhook
Receives incoming WhatsApp messages and creates/updates chats.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "Hello, I need help",
  "isFromUser": true
}
```

**Response:**
```json
{
  "success": true,
  "chatId": "chat_1234567890_abc123",
  "anonymousName": "SwiftLion247"
}
```

### POST /api/whatsapp/send
Sends a reply to a WhatsApp user.

**Request Body:**
```json
{
  "chatId": "chat_1234567890_abc123",
  "message": "Thank you for contacting us!"
}
```

### GET /api/whatsapp/webhook
WhatsApp webhook verification endpoint (for WhatsApp Business API setup).

## Pages

### /dashboard/chat
Main chat management interface where admins can:
- View all active conversations
- Read message history
- See conversation details (anonymized)

## Utility Functions

### `generateAnonymousName()`
Creates random usernames in format: `[Adjective][Noun][Number]`

### `generateChatId()`
Creates unique chat identifiers

### `validateMessage(content)`
Validates message content (length, format)

### `sanitizeMessage(content)`
Sanitizes message content to prevent XSS attacks

## Security Features

1. **No PII Storage**: Actual phone numbers are never stored
2. **Hashing**: Phone numbers are hashed for chat lookup consistency
3. **Sanitization**: All messages are sanitized before storage
4. **Read-only View**: Chat page is read-only to prevent accidental data modification

## Environment Variables

Add to your `.env.local`:
```
WHATSAPP_VERIFY_TOKEN=your_verification_token_here
```

## WhatsApp Business API Integration

To connect this system with WhatsApp Business API:

1. Set up a Meta Business App
2. Configure webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
3. Set verification token in environment variables
4. Subscribe to message events
5. Implement actual message sending in `/api/whatsapp/send/route.ts`

## Usage Example

### Receiving a Message
When a WhatsApp user sends a message, the webhook receives it:
```javascript
// WhatsApp sends to your webhook
{
  phoneNumber: "+1234567890",
  message: "I need help with my order"
}

// System creates/updates chat
// Generates anonymous name: "BrightEagle423"
// Stores message in subcollection
```

### Admin Viewing Conversation
Admin sees in dashboard:
- User: "BrightEagle423" (not the real phone number)
- Last message: "I need help with my order"
- Full conversation history in anonymized view

## Future Enhancements

- [ ] Message sending interface from dashboard
- [ ] AI-powered response suggestions
- [ ] Chat analytics and metrics
- [ ] Export conversation history
- [ ] Advanced search and filtering
- [ ] Automated responses
- [ ] Message templates
- [ ] Multi-language support

## Notes

- The system uses Firestore's real-time listeners for instant updates
- Anonymous names are generated randomly for each new chat
- The same phone number will always map to the same chat (via hashing)
- Messages are stored chronologically in subcollections for efficient querying
