import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMessages, sendMessage as sendMessageApi, subscribeToMessages } from '../services/chatService';
import { useLanguage } from '../context/LanguageContext';

export default function LiveChat({ requestId, currentUserId, otherPartyName }) {
  const { addToast } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMessages(requestId);
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime: new messages from the other party appear without a refresh.
  useEffect(() => {
    const unsubscribe = subscribeToMessages(requestId, (newMsg) => {
      setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
    });
    return unsubscribe;
  }, [requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e, textOverride) => {
    if (e) e.preventDefault();
    const text = (textOverride ?? inputText).trim();
    if (!text) return;
    setSending(true);
    try {
      const sent = await sendMessageApi(requestId, currentUserId, text);
      // Optimistic append -- the realtime subscription will also deliver
      // this row, but the id-based de-dupe above stops it from doubling up.
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setInputText('');
    } catch (err) {
      addToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="glass-panel chat-window" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px', background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="chat-header" style={{ background: '#f8f9fa' }}>
        <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }}></span>
          {otherPartyName ? t('chat_with').replace('{name}', otherPartyName) : t('coordination_desk')}
        </h4>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {requestId.slice(-5)}</span>
      </div>

      <div className="chat-messages" style={{ flexGrow: 1, overflowY: 'auto', background: 'var(--bg-card)' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem' }}>
            {t('loading_messages')}
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', color: 'var(--error)', fontSize: '0.8rem', padding: '1.5rem' }}>
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem' }}>
            {t('no_messages_yet')}
          </div>
        )}

        {!loading &&
          !error &&
          messages.map((msg) => {
            const isOutgoing = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: isOutgoing ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: '8px',
                  alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  className={`chat-message ${isOutgoing ? 'outgoing' : 'incoming'}`}
                  style={{
                    margin: 0,
                    borderRadius: '12px',
                    borderBottomRightRadius: isOutgoing ? '2px' : '12px',
                    borderBottomLeftRadius: isOutgoing ? '12px' : '2px',
                    background: isOutgoing ? 'var(--primary)' : '#f1f3f5',
                    color: isOutgoing ? '#ffffff' : 'var(--text-main)',
                  }}
                >
                  <div>{msg.message}</div>
                  <div style={{ fontSize: '0.55rem', textAlign: 'right', opacity: 0.6, marginTop: '2px' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-area" style={{ padding: '0.5rem', background: '#f8f9fa' }}>
        <input
          type="text"
          className="form-control"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('message_placeholder')}
          disabled={sending}
          style={{ flexGrow: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #ced4da' }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem' }} disabled={sending}>
          {sending ? '...' : t('send_btn')}
        </button>
      </form>
    </div>
  );
}
