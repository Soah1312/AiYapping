import { nanoid } from 'nanoid';

/**
 * Transforms current conversation state to space-optimized Firestore format
 */
export function transformConversationForShare(setup, transcript, summary, chatTitle = '') {
  const resolvedTitle = String(chatTitle || setup.topic || 'Untitled Arena').trim();
  const messages = transcript.map((msg) => ({
    r: msg.role, // 'user', 'assistant', 'system'
    c: msg.content,
    m: msg.model || '',
    s: msg.side || '',
  }));

  return {
    id: nanoid(8),
    title: resolvedTitle,
    t: setup.topic || 'Untitled Arena', // Topic
    m: {
      ai1: setup.ai1Model || '',
      ai2: setup.ai2Model || '',
    },
    p: {
      p1: setup.openingSeed1 ? setup.openingSeed1.slice(0, 100) : 'AI-1',
      p2: setup.openingSeed2 ? setup.openingSeed2.slice(0, 100) : 'AI-2',
    },
    messages,
    v: summary?.verdict ? {
      winner: summary.verdict,
      reason: summary.consensus || '',
    } : null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Saves a conversation share to Firestore via API
 * @param {Object} conversationData - The space-optimized conversation data
 * @returns {Promise<string>} The shareId
 */
export async function saveConversationShare(conversationData) {
  const response = await fetch('/api/share-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conversationData),
  });

  if (!response.ok) {
    throw new Error('Failed to save share');
  }

  const result = await response.json();
  return result.id;
}

/**
 * Generates and copies share URL to clipboard
 * @param {string} shareId - The share ID
 * @returns {Promise<string>} The share URL
 */
export async function copyShareUrl(shareId) {
  const url = `${window.location.origin}/share/${shareId}`;
  await navigator.clipboard.writeText(url);
  return url;
}
