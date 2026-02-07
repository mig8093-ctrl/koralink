'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type Team = { id: string; name: string; city: string; level: string; captain_id: string };

type Profile = {
  display_name: string;
  player_id: string;
  position: string;
  level: string;
  city: string;
  age_range?: string | null;
  age_visible?: boolean;
};

type Member = { player_id: string; role: string; profiles: Profile };

const AGE_LABEL: Record<string, string> = {
  u14: 'أقل من 14',
  '14_17': '14 - 17',
  '18_24': '18 - 24',
  '25_34': '25 - 34',
  '35_44': '35 - 44',
  '45_plus': '45+',
};

function ageLabel(key?: string | null) {
  if (!key) return '';
  return AGE_LABEL[key] ?? key;
}

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const teamId = params.id;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [invitePlayerId, setInvitePlayerId] = useState('');
  const [loading, setLoading] = useState(false);

  const isCaptain = useMemo(
    () => !!(team && myId && team.captain_id === myId),
    [team, myId]
  );

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    setMyId(u.user?.id ?? null);

    const { data: t, error: e1 } = await supabase.from('teams').select('*').eq('id', teamId).single();
    if (e1) {
      alert(e1.message);
      return;
    }
    setTeam(t as any);

    const { data: m, error: e2 } = await supabase
      .from('team_members')
      .select('player_id, role, profiles:profiles(display_name, player_id, position, level, city, age_range, age_visible)')
      .eq('team_id', teamId);

    if (e2) {
      alert(e2.message);
      return;
    }
    setMembers((m ?? []) as any);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function sendInviteByPlayerId() {
    if (!isCaptain) return;

    const pid = invitePlayerId.trim().toUpperCase();
    if (!pid) return;

    setLoading(true);

    // find profile by player_id
    const { data: p, error: e1 } = await supabase.from('profiles').select('id').eq('player_id', pid).maybeSingle();
    if (e1) {
      setLoading(false);
      alert(e1.message);
      return;
    }
    if (!p) {
      setLoading(false);
      alert('Player ID غير موجود');
      return;
    }

    const { error: e2 } = await supabase.from('team_invites').insert({
      team_id: teamId,
      invited_player: p.id,
      invited_by: myId,
      status: 'pending',
    });

    setLoading(false);

    if (e2) alert(e2.message);
    else {
      alert('✅ تم إرسال الدعوة');
      setInvitePlayerId('');
    }
  }

  return (
    <>
      <Nav />
      <div className="card">
        {!team ? (
          <p>تحميل...</p>
        ) : (
          <>
            <h1>{team.name}</h1>
            <div className="row">
              <span className="badge">{team.city}</span>
              <span className="badge">{team.level}</span>
              {isCaptain && <span className="badge">Captain</span>}
            </div>

            <hr />
            <h2>الأعضاء</h2>

            {members.length === 0 ? (
              <p className="small">ما فيش أعضاء.</p>
            ) : (
              <div className="row">
                {members.map((m, idx) => (
                  <div key={idx} className="card card-soft" style={{ flex: '1 1 260px', margin: 0 }}>
                    <b>{m.profiles?.display_name ?? '—'}</b>
                    <div className="small">ID: {m.profiles?.player_id ?? '—'}</div>

                    <div className="row">
                      <span className="badge">{m.profiles?.position ?? '—'}</span>

                      {m.profiles?.age_visible && m.profiles?.age_range ? (
                        <span className="badge">🎂 {ageLabel(m.profiles.age_range)}</span>
                      ) : null}

                      <span className="badge">{m.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isCaptain && (
              <>
                <hr />
                <h2>إضافة لاعب بالـPlayer ID</h2>
                <label className="label">Player ID</label>
                <input
                  className="input"
                  value={invitePlayerId}
                  onChange={(e) => setInvitePlayerId(e.target.value)}
                  placeholder="PL-XXXXXX"
                />
                <div style={{ height: 10 }} />
                <button className="btn" onClick={sendInviteByPlayerId} disabled={!invitePlayerId.trim() || loading}>
                  {loading ? '...' : 'إرسال دعوة'}
                </button>
                <p className="small">اللاعب لازم يقبل الدعوة من صفحة "الدعوات"، وبعدها ينضاف مباشرة.</p>
              </>
            )}

            <hr />
            <p className="small">لتحدي فريق آخر: روح لصفحة "التحديات".</p>
          </>
        )}
      </div>
    </>
  );
}
