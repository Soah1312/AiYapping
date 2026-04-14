import { Share2, Loader } from 'lucide-react';
import { useState } from 'react';
import Toast from './Toast';
import { transformConversationForShare, saveConversationShare, copyShareUrl } from '../lib/shareUtils';

export default function ShareButton({ setup, transcript, summary, chatTitle }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  async function handleShare() {
    if (loading) return;

    setLoading(true);
    try {
      // Transform to space-optimized format
      const data = transformConversationForShare(setup, transcript, summary, chatTitle);

      // Save to Firestore
      const shareId = await saveConversationShare(data);

      // Copy URL to clipboard
      await copyShareUrl(shareId);

      setToast({ message: 'Share link copied to clipboard!', type: 'success' });
    } catch (error) {
      console.error('Share failed:', error);
      setToast({ 
        message: error?.message || 'Failed to share conversation',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className="btn-primary"
        style={{ 
          fontSize: '0.8125rem', 
          padding: '0.375rem 0.75rem', 
          minHeight: '36px',
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
        title="Share this conversation"
      >
        {loading ? (
          <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Share2 size={14} />
        )}
        {!loading && ' Share'}
      </button>

      <Toast 
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: '' })}
      />
    </>
  );
}
