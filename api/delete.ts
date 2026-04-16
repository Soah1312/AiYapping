export const runtime = 'edge';

import { doc, getFirestore, deleteDoc, getDoc } from 'firebase/firestore/lite';
import { getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

function getDb() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, sessionId } = body;

    if (!conversationId || !sessionId) {
      return Response.json({ error: 'Missing conversationId or sessionId' }, { status: 400 });
    }

    const db = getDb();
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // Security check: ensure the user owns this conversation
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) {
      return Response.json({ success: true }, { status: 200 }); // Already gone
    }
    
    const ownerId = conversationSnap.data()?.ownerId;
    if (ownerId !== sessionId) {
      return Response.json({ error: 'Unauthorized to delete this conversation' }, { status: 403 });
    }

    await deleteDoc(conversationRef);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[delete] Failed to delete conversation:', error);
    return Response.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
