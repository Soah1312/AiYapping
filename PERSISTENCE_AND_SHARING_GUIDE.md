# AiYapping Local Persistence & Cloud Sharing Implementation Guide

## Overview

This guide provides step-by-step instructions for configuring the local persistence (localStorage "save game") and cloud sharing system (Firestore "gems") for the AiYapping arena.

---

## 1. LOCAL PERSISTENCE SETUP

### What Was Changed

The Zustand store (`src/store/conversationStore.js`) has been configured to use `localStorage` instead of `sessionStorage`:

- **Storage Key**: `aiyapping-session-v1`
- **Persisted Fields**: `transcript`, `topic`, `mode`, `modelConfig`, `personaLabels` (via `setup` object), `status`, `usage`, `summary`, `redirectDraft`
- **Excluded Fields**: `isStreaming`, `streamError` (ephemeral states that prevent "zombie" loading states)

### How It Works

1. **On Tab Switch**: The conversation state is automatically saved to localStorage and restored when returning to the tab.
2. **On Page Reload**: 
   - Setup is preserved (topic, model selections, personas)
   - Transcript is preserved (previous messages)
   - Status is reset to `'idle'` to prevent orphan streams
   - Streaming/error states are cleared

### Testing Locally

1. Start a duel in the dev environment: `npm run dev`
2. Open DevTools → Application → Local Storage
3. Look for the `aiyapping-session-v1` key
4. Close the tab/browser, then reopen the app
5. **Expected**: The conversation setup and previous messages should be restored

---

## 2. CLOUD SHARING SETUP (Firestore)

### Firebase Console Configuration

#### Step 1: Create the `shared_yaps` Collection

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **aiyapper**
3. Navigate to **Firestore Database** → **Collections**
4. Click **Create Collection**
5. Set collection ID: `shared_yaps`
6. For the first document, use "auto ID" (Firestore will generate it)
7. Add sample fields (or leave empty for now):
   ```json
   {
     "t": "Sample Topic",
     "createdAt": {"_serverTimestamp": "value"}
   }
   ```

#### Step 2: Firestore Security Rules

Add the following rules to allow **public read** and **create-only writes** for sharing:

**Path**: Firestore Database → Rules → Edit

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow everyone to read shares and create new immutable share documents
    match /shared_yaps/{document} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }

    // Other collections: restrict as needed
    match /{document=**} {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

**Critical**: After pasting the rules, click **Publish** to apply them.

#### Step 3: Verify the Collection Exists

1. In Firestore Console, refresh the **Collections** tab
2. Confirm `shared_yaps` appears in the list
3. Click into `shared_yaps` to verify it's empty or has your sample doc

---

## 3. API ENDPOINTS

### POST `/api/share-save`

**Purpose**: Save a conversation snapshot to Firestore

**Request**:
```json
POST /api/share-save
Content-Type: application/json

{
  "id": "xK9jP2nL",
  "t": "Topic Title",
  "m": { "ai1": "gpt-4", "ai2": "claude-3" },
  "p": { "p1": "Persona 1 intro...", "p2": "Persona 2 intro..." },
  "messages": [
    { "r": "user", "c": "message content", "m": "model-name" },
    { "r": "assistant", "c": "response", "m": "model-name" }
  ],
  "v": { "winner": "verdict text", "reason": "consensus reason" },
  "createdAt": "2025-04-11T10:30:00Z"
}
```

**Response**:
```json
201 Created
{ "id": "xK9jP2nL" }
```

**Error Responses**:
- `400`: Invalid conversation data (missing ID)
- `405`: Method not allowed (only POST)
- `500`: Firestore write failed

---

### GET `/api/share?id=xK9jP2nL`

**Purpose**: Fetch a shared conversation for display in ShareView

**Query Parameters**:
- `id` (required): The share ID (e.g., `xK9jP2nL`)

**Response** (Success):
```json
200 OK
{
  "topic": "Topic Title",
  "config": {
    "mode": "chat",
    "model1": "gpt-4",
    "model2": "claude-3"
  },
  "turnCount": 5,
  "transcript": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "message content",
      "model": "model-name",
      "timestamp": "2025-04-11T10:30:00Z",
      "status": "done"
    }
  ]
}
```

**Error Responses**:
- `400`: Missing ID parameter
- `404`: Share not found
- `500`: Firestore read failed

---

## 4. FRONTEND COMPONENTS

### ShareButton Component

**Location**: `src/components/ShareButton.jsx`

**Features**:
- Visible only when `status === 'completed'`
- Shows loading spinner while saving
- Copies share URL to clipboard
- Displays success/error toast

**Usage**:
```jsx
<ShareButton 
  setup={setup} 
  transcript={transcript} 
  summary={summary} 
/>
```

### Toast Component

**Location**: `src/components/Toast.jsx`

**Features**:
- Auto-dismisses after 3 seconds (configurable)
- Supports success, error, and info types
- Positioned at bottom-center
- Includes close button

### ShareView (Read-Only)

**Location**: `src/pages/SharePage.jsx`

**Features**:
- Fetches shared conversation from Firestore API
- Renders messages using existing `MessageCard` component
- Displays loading state
- Shows "Not Found" fallback
- "Start Your Own" CTA button

**Route**: `/share/:id`

---

## 5. DATA STRUCTURE (Space-Optimized)

The shared conversations use abbreviated field names to minimize Firestore storage:

| Field | Full Name | Description |
|-------|-----------|-------------|
| `id` | Share ID | 8-char nanoid (e.g., `xK9jP2nL`) |
| `t` | Topic | Conversation title |
| `m` | Models | `{ ai1: "model-id", ai2: "model-id" }` |
| `p` | Personas | `{ p1: "persona prompt", p2: "persona prompt" }` |
| `messages` | Transcript | Array of `{ r: role, c: content, m: model }` |
| `v` | Verdict | Optional `{ winner: "text", reason: "text" }` |
| `createdAt` | Created At | ISO timestamp |

**Example Firestore Document**:
```json
{
  "id": "xK9jP2nL",
  "t": "Who triggers singularity first?",
  "m": {
    "ai1": "gpt-4-turbo",
    "ai2": "claude-3-opus"
  },
  "p": {
    "p1": "Defend AGI singularity path...",
    "p2": "Challenge with real-world constraints..."
  },
  "messages": [
    { "r": "user", "c": "Start the debate", "m": "moderator" },
    { "r": "assistant", "c": "GPT response here...", "m": "gpt-4-turbo" },
    { "r": "assistant", "c": "Claude response here...", "m": "claude-3-opus" }
  ],
  "v": {
    "winner": "Tied - both presented compelling arguments",
    "reason": "Both models excelled at reasoning"
  },
  "createdAt": "2025-04-11T10:30:00Z"
}
```

---

## 6. DEPENDENCIES

All required dependencies are already installed:

- **nanoid** (^5.1.5): For generating short 8-character share IDs
- **lucide-react** (^1.8.0): For UI icons (Share2, Loader, Check, AlertCircle)
- **zustand** (^5.0.12): Store persistence middleware
- **firebase** (^12.11.0): Firestore integration

**No additional installation required.**

---

## 7. ENVIRONMENT VARIABLES

No new environment variables needed. The app uses the existing:

- `VITE_FIREBASE_CONFIG`: Firebase project configuration (already set)

Ensure your `.env` file has:
```env
VITE_FIREBASE_CONFIG={"apiKey":"...","projectId":"aiyapper",...}
```

---

## 8. TESTING CHECKLIST

### Local Persistence
- [ ] Start a duel
- [ ] Verify localStorage key `aiyapping-session-v1` is populated
- [ ] Close and reopen tab → state restores
- [ ] Reload page → state restores with setup but reset status
- [ ] Close browser → reopen → state persists across sessions

### Cloud Sharing
- [ ] Complete a duel
- [ ] Click "Share" button
- [ ] Verify toast: "Share link copied to clipboard!"
- [ ] Paste URL in new tab → SharedView renders
- [ ] Verify Firestore `shared_yaps` collection has new document
- [ ] Test invalid share ID → "Not Found" fallback displays

### API Endpoints
- [ ] `POST /api/share-save` returns 201 with ID
- [ ] `GET /api/share?id=xK9jP2nL` returns conversation
- [ ] `GET /api/share?id=invalid` returns 404
- [ ] Error responses include meaningful messages

---

## 9. TROUBLESHOOTING

### Share Button Not Appearing
- **Check**: Is `status === 'completed'`?
- **Check**: Are `setup`, `transcript`, and `summary` props passed to `DuelControls`?

### Toast Not Showing
- **Check**: Is `.slideUp` animation defined in `index.css`?
- **Check**: Is Toast component rendered with message?

### Firestore Writes Failing (500 in share-save)
- **Check**: Is `shared_yaps` collection created?
- **Check**: Are Firestore rules published?
- **Check**: Does VITE_FIREBASE_CONFIG include Firestore access?

### Share Link Shows "Not Found"
- **Check**: Did the share succeed in console (check Network tab)?
- **Check**: Is the share ID correct in URL?
- **Check**: Does the document exist in Firestore console?

### localStorage Not Persisting
- **Check**: Is localStorage available (not in private/incognito)?
- **Check**: Storage key is exactly `aiyapping-session-v1`?
- **Check**: Is the browser's storage not full?

---

## 10. BEST PRACTICES

### For Users
1. **Save Frequently**: Conversations auto-save after each turn
2. **Share Results**: Use the Share button to create shareable links
3. **Clear Data**: Open DevTools → Storage → Clear All if needed

### For Developers
1. **Monitor Firestore Usage**: Uses ~100-500 bytes per shared conversation
2. **Set TTL**: Consider adding document expiration (optional)
3. **Rate Limiting**: Implement if share endpoint becomes popular
4. **Backup**: Firestore is auto-backed up; no manual backup needed

---

## 11. DEPLOYMENT NOTES

- **Vercel**: No special config needed
- **Firestore**: Already configured for project `aiyapper`
- **Rules**: Apply rules in Firestore Console (non-code deployment)
- **Cold Starts**: Firestore warm-up handled via edge runtime

---

## Appendix: Quick Reference

### Share Button Click Flow
```
User clicks "Share"
  ↓
Transform conversation to space-optimized format
  ↓
POST to /api/share-save
  ↓
Firestore saves to shared_yaps/{id}
  ↓
API returns { id: "xK9jP2nL" }
  ↓
Copy URL: origin + "/share/" + id
  ↓
Navigator.clipboard.writeText(url)
  ↓
Show Toast: "Share link copied!"
```

### Share Link View Flow
```
/share/xK9jP2nL
  ↓
SharePage.useEffect calls GET /api/share?id=xK9jP2nL
  ↓
API fetches from Firestore shared_yaps
  ↓
Transform space-optimized data to display format
  ↓
Return conversation with transcript
  ↓
Render MessageCard components (read-only)
```

---

**Last Updated**: April 11, 2026  
**Status**: ✅ Ready for Production  
**Documentation Version**: 1.0
