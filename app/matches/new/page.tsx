'use client';

import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toLocalInputValue } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

type Team = { id: string; name: string; city: string; level: string; captain_id: string };

function isValidMapsUrl(url: string) {
  const u = url.trim();
  if (!u) return true; // empty allowed
  return u.startsWith('http://') || u.startsWith('https://');
}

export default function NewMatchPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [city, setCity] = useState('');
  const [kickoff, setKickoff] = useState(toLocalInputValue(new Date(Date.now() + 2 * 3600 * 1000)));

  // NEW: venue details + maps
  const [venueName, setVenueName] = useState('');
  const [venueArea, setVenueArea] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [venueNote, setVenueNote] = useState('');

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id ?? null;
      setUid(id);

      if (!id) {
        setLoading(false);
        return;
      }

      // teams where I'm captain (same behavior as your code)
      const { data: t } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', id)
        .order('created_at', { ascending: false });

      const teams = (t as any) ?? [];
      setMyTeams(teams);

      if (teams.length) {
        setHomeTeam(teams[0].id);
        setCity(teams[0].city);
      }

      setLoading(false);
    })();
  }, []);

  const toTeamsFiltered = useMemo(() => myTeams.filter((t) => t.id !== homeTeam), [myTeams, homeTeam]);

  const canSave = useMemo(() => {
    return !!(uid && homeTeam && awayTeam && city.trim() && isValidMapsUrl(mapsUrl));
  }, [uid, homeTeam, awayTeam, city, mapsUrl]);

  async function createMatch() {
    if (!uid) return alert('لازم تسجل دخول');
    if (!homeTeam || !awayTeam || !city.trim()) return alert('كمل البيانات الأساسية');
    if (homeTeam === awayTeam) return alert('اختار فريقين مختلفين');
    if (!isValidMapsUrl(mapsUrl)) return alert('رابط Google Maps لازم يبدأ بـ https://');

    setSaving(true);

    const payload = {
      created_by: uid,
      city: city.trim(),
      kickoff_at: kickoff ? new Date(kickoff).toISOString() : null,

      // NEW fields (manual venue)
      venue_name: venueName.trim() || null,
      venue_area: venueArea.trim() || null,
      maps_url: mapsUrl.trim() || null,
      venue_note: venueNote.trim() || null,

      // keep old location_text for backwards compatibility if you want
      location_text: null,

      status: 'scheduled',
      team_home: homeTeam,
      team_away: awayTeam,
    };

    const { error } = await supabase.from('matches').insert(payload);

    setSaving(false);
    if (error) return alert(error.message);

    window.location.href = '/matches';
  }

  return (
    <>
      <Nav />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>مباراة جديدة</h1>
          <Link className="btn secondary" href="/matches">
            رجوع
          </Link>
        </div>

        {loading ? (
          <p className="small">جارٍ التحميل...</p>
        ) : !uid ? (
          <p className="small">لازم تسجل دخول.</p>
        ) : myTeams.length === 0 ? (
          <p className="small">لازم يكون عندك فريق (كابتن) باش تنشئ مباراة. روح أنشئ فريق أولًا.</p>
        ) : (
          <>
            <p className="small">
              هنا تنشئ مباراة مباشرة. أفضل شيء إنك تحدد المكان عبر رابط Google Maps باش ما يصيرش لخبطة.
            </p>
            <hr />

            {/* Teams */}
            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">فريقي (Home)</label>
                <select
                  className="input"
                  value={homeTeam}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHomeTeam(v);
                    const t = myTeams.find((x) => x.id === v);
                    if (t) setCity(t.city);
                  }}
                >
                  {myTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">الخصم (Away) — من فرقك (اختصار)</label>
                <select className="input" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)}>
                  <option value="" disabled>
                    اختار
                  </option>
                  {toTeamsFiltered.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="small">
                  * حالياً للتجربة: الخصم من فرقك. لاحقاً نخليها تحدّي لفرق أخرى.
                </p>
              </div>
            </div>

            <div style={{ height: 10 }} />

            {/* City + time */}
            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">المدينة</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="طرابلس" />
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">وقت البداية</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={kickoff}
                  onChange={(e) => setKickoff(e.target.value)}
                />
              </div>
            </div>

            <hr />

            {/* Venue + maps */}
            <h2>📍 مكان الملعب</h2>

            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">اسم الملعب (اختياري)</label>
                <input
                  className="input"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="مثال: ملعب السراج"
                />
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <label className="label">المنطقة (اختياري)</label>
                <input
                  className="input"
                  value={venueArea}
                  onChange={(e) => setVenueArea(e.target.value)}
                  placeholder="مثال: طرابلس - السراج"
                />
              </div>
            </div>

            <div style={{ height: 10 }} />

            <label className="label">رابط Google Maps (مهم)</label>
            <input
              className="input"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="الصق رابط المشاركة من Google Maps"
            />
            {!isValidMapsUrl(mapsUrl) ? (
              <p className="small" style={{ color: '#ffb3b3' }}>
                ⚠️ الرابط لازم يبدأ بـ https://
              </p>
            ) : (
              <p className="small" style={{ marginTop: 8 }}>
                افتح Google Maps → Share → Copy link → الصقه هنا
              </p>
            )}

            <div className="row" style={{ marginTop: 10 }}>
              {mapsUrl.trim().startsWith('http') ? (
                <a className="btn secondary sm" href={mapsUrl.trim()} target="_blank" rel="noreferrer">
                  🗺️ افتح في الخرائط
                </a>
              ) : (
                <span className="badge">ألصق رابط Maps باش يظهر زر الفتح</span>
              )}

              <span className="badge">الملاعب داخل التطبيق: قريباً</span>
            </div>

            <div style={{ height: 10 }} />

            <label className="label">ملاحظة للكابتنين (اختياري)</label>
            <input
              className="input"
              value={venueNote}
              onChange={(e) => setVenueNote(e.target.value)}
              placeholder="مثال: نلتقوا قبل الوقت بـ 10 دقايق"
            />

            <div style={{ height: 14 }} />

            <button className="btn" onClick={createMatch} disabled={!canSave || saving}>
              {saving ? '...' : 'إنشاء'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
