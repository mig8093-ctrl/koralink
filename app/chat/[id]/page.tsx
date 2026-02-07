'use client';

import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type Room = { id: string; challenge_id: string | null; is_open: boolean; created_at: string };
type Msg = { id: string; room_id: string; sender_id: string; body: string; created_at: string };

export default function ChatRoomPage({ params }: { params: { id: string } }) {
  const roomId = params.id;
  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUid(session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    const { data: r, error: e1 } = await supabase.from('chat_rooms').select('*').eq('id', roomId).maybeSingle();
    const { data: m, error: e2 } = await supabase.from('chat_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
    setLoading(false);
    if (e1) alert(e1.message);
    if (e2) alert(e2.message);
    setRoom((r as any) ?? null);
    setMessages((m as any) ?? []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const canSend = useMemo(() => !!(uid && room?.is_open && text.trim()), [uid, room, text]);

  async function send() {
    if (!uid) return alert('سجّل دخول');
    if (!room?.is_open) return alert('الشات مقفول');
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: uid,
      body: text.trim(),
    });
    setSending(false);
    if (error) return alert(error.message);
    setText('');
    await load();
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>شات الكباتن</h1>
          <Link className="btn secondary" href="/challenges">رجوع</Link>
        </div>
        <p className="small">الشات يتفتح فقط بعد قبول التحدي، ويتقفل بعد المباراة.</p>

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : !room ? (
          <p className="small">الغرفة غير موجودة.</p>
        ) : (
          <>
            {!uid && <p className="small">سجّل دخول باش تكتب.</p>}
            {!room.is_open && <p className="small">⛔ الشات مقفول.</p>}

            <div className="card card-soft" style={{ height: 420, overflow: 'auto', marginTop: 12 }}>
              {messages.length === 0 ? (
                <p className="small">ما فيش رسائل.</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: m.sender_id === uid ? 'flex-end' : 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <div className="card" style={{ maxWidth: 520, margin: 0 }}>
                      <div className="small" style={{ opacity: 0.75 }}>{new Date(m.created_at).toLocaleString()}</div>
                      <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{m.body}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>

            <div style={{ height: 12 }} />
            <div className="row">
              <input
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب رسالة..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button className="btn" onClick={send} disabled={!canSend || sending}>
                {sending ? '...' : 'إرسال'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
