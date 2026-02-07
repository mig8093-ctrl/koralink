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

export default function VenuesPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const [qCity, setQCity] = useState('');
  const [qName, setQName] = useState('');

  // Add venue form
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('venues')
      .select('*')
      .order('created_at', { ascending: false });

    if (qCity.trim()) query = query.ilike('city', `%${qCity.trim()}%`);
    if (qName.trim()) query = query.ilike('name', `%${qName.trim()}%`);

    const { data, error } = await query;
    setLoading(false);
    if (error) alert(error.message);
    else setVenues((data as any) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qCity, qName]);

  const canAdd = useMemo(() => !!(name.trim() && city.trim()), [name, city]);

  async function addVenue() {
    if (!signedIn) return alert('لازم تسجل دخول باش تضيف ملعب');
    if (!canAdd) return;

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setSaving(false);
      return alert('لازم تسجل دخول');
    }

    const { error } = await supabase.from('venues').insert({
      name: name.trim(),
      city: city.trim(),
      address: address.trim() || null,
      price_per_hour: price ? Number(price) : null,
      notes: notes.trim() || null,
      created_by: uid,
    });

    setSaving(false);
    if (error) return alert(error.message);

    setName('');
    setCity('');
    setAddress('');
    setPrice('');
    setNotes('');
    setShowAdd(false);
    await load();
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>الملاعب</h1>
          {signedIn ? (
            <button className="btn" onClick={() => setShowAdd((s) => !s)}>
              {showAdd ? 'إغلاق' : '+ إضافة ملعب'}
            </button>
          ) : (
            <Link className="btn" href="/login">سجّل باش تضيف ملعب</Link>
          )}
        </div>
        <p className="small">دليل ملاعب خماسي: اسم، مدينة، سعر تقريبي، وتقييمات.</p>

        {showAdd && (
          <div className="card card-soft" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>إضافة ملعب</h2>
            <div className="row">
              <div style={{ flex: 1, minWidth: 220 }}>
                <label className="label">الاسم</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ملعب..." />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label className="label">المدينة</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="طرابلس" />
              </div>
            </div>
            <div style={{ height: 10 }} />
            <div className="row">
              <div style={{ flex: 1, minWidth: 220 }}>
                <label className="label">العنوان (اختياري)</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="حي... شارع..." />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label className="label">السعر/ساعة (اختياري)</label>
                <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="30" />
              </div>
            </div>
            <div style={{ height: 10 }} />
            <label className="label">ملاحظات (اختياري)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="إنارة، عشب، غرف تبديل..." />
            <div style={{ height: 12 }} />
            <button className="btn" onClick={addVenue} disabled={!canAdd || saving}>
              {saving ? '...' : 'حفظ'}
            </button>
          </div>
        )}

        <hr />

        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label">فلتر مدينة</label>
            <input className="input" value={qCity} onChange={(e) => setQCity(e.target.value)} placeholder="طرابلس..." />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label">بحث بالاسم</label>
            <input className="input" value={qName} onChange={(e) => setQName(e.target.value)} placeholder="ملعب السلام..." />
          </div>
        </div>

        <div style={{ height: 10 }} />

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : venues.length === 0 ? (
          <p className="small">ما فيش ملاعب مطابقة.</p>
        ) : (
          <div className="row">
            {venues.map((v) => (
              <Link
                key={v.id}
                href={`/venues/${v.id}`}
                style={{ textDecoration: 'none', flex: '1 1 300px' }}
              >
                <div className="card card-soft" style={{ margin: 0 }}>
                  <h3 style={{ marginTop: 0 }}>{v.name}</h3>
                  <div className="row">
                    <span className="badge">📍 {v.city}</span>
                    {v.price_per_hour != null && <span className="badge">💸 {v.price_per_hour} / ساعة</span>}
                  </div>
                  {v.address && <p className="small" style={{ marginTop: 10 }}>{v.address}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
