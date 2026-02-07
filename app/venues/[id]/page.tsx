'use client';

import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Venue = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  price_per_hour: number | null;
  notes: string | null;
  created_at: string;
};

type Review = {
  id: string;
  venue_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function VenueDetailPage({ params }: { params: { id: string } }) {
  const venueId = params.id;
  const [signedIn, setSignedIn] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      setSignedIn(!!id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const id = session?.user?.id ?? null;
      setUid(id);
      setSignedIn(!!id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    const { data: v, error: e1 } = await supabase.from('venues').select('*').eq('id', venueId).maybeSingle();
    const { data: r, error: e2 } = await supabase.from('venue_reviews').select('*').eq('venue_id', venueId).order('created_at', { ascending: false });
    setLoading(false);
    if (e1) alert(e1.message);
    if (e2) alert(e2.message);
    setVenue((v as any) ?? null);
    setReviews((r as any) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const avg = useMemo(() => {
    if (!reviews.length) return null;
    const s = reviews.reduce((a, b) => a + (b.rating || 0), 0);
    return Math.round((s / reviews.length) * 10) / 10;
  }, [reviews]);

  const canReview = signedIn && !!uid;

  async function submitReview() {
    if (!uid) return alert('سجّل دخول');
    setSaving(true);
    const { error } = await supabase.from('venue_reviews').upsert({
      venue_id: venueId,
      user_id: uid,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) return alert(error.message);
    setComment('');
    await load();
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>تفاصيل الملعب</h1>
          <Link className="btn secondary" href="/venues">رجوع</Link>
        </div>

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : !venue ? (
          <p className="small">الملعب غير موجود.</p>
        ) : (
          <>
            <div className="card card-soft" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>{venue.name}</h2>
              <div className="row">
                <span className="badge">📍 {venue.city}</span>
                {venue.price_per_hour != null && <span className="badge">💸 {venue.price_per_hour} / ساعة</span>}
                {avg != null && <span className="badge">⭐ {avg} ({reviews.length})</span>}
              </div>
              {venue.address && <p className="small" style={{ marginTop: 10 }}>{venue.address}</p>}
              {venue.notes && <p className="small" style={{ marginTop: 10 }}>{venue.notes}</p>}
            </div>

            <hr />

            <h2>التقييمات</h2>
            {!canReview ? (
              <p className="small">سجّل دخول باش تقدر تقيّم.</p>
            ) : (
              <div className="card card-soft" style={{ marginTop: 10 }}>
                <div className="row">
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label className="label">التقييم</label>
                    <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                      {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 2, minWidth: 220 }}>
                    <label className="label">تعليق (اختياري)</label>
                    <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="إنارة ممتازة، عشب كويس..." />
                  </div>
                </div>
                <div style={{ height: 12 }} />
                <button className="btn" onClick={submitReview} disabled={saving}>{saving ? '...' : 'نشر التقييم'}</button>
              </div>
            )}

            <div style={{ height: 12 }} />
            {reviews.length === 0 ? (
              <p className="small">ما فيش تقييمات.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="card card-soft" style={{ marginBottom: 10 }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="badge">⭐ {r.rating}</span>
                    <span className="small">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.comment && <p className="small" style={{ marginTop: 10 }}>{r.comment}</p>}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
}
