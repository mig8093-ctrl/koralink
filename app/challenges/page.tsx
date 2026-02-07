'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { toLocalInputValue } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

type Team = { id:string; name:string; city:string; level:string; captain_id:string };
type Challenge = {
  id:string;
  from_team:string;
  to_team:string;
  proposed_time:string;
  location_text:string | null;
  status:'pending'|'accepted'|'declined';
  created_at:string;
  from: Team;
  to: Team;
  chat_room_id?: string | null;
};

export default function ChallengesPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [when, setWhen] = useState(toLocalInputValue(new Date(Date.now()+3600*1000)));
  const [location, setLocation] = useState('');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rooms, setRooms] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);

  const isCaptainSome = useMemo(()=>myTeams.length>0, [myTeams]);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setMyId(uid);

    const { data: teamsData } = await supabase.from('teams').select('*').order('created_at', {ascending:false});
    setAllTeams((teamsData as any) ?? []);

    if (uid) {
      const { data: mine } = await supabase.from('teams').select('*').eq('captain_id', uid);
      setMyTeams((mine as any) ?? []);
      if ((mine as any)?.length && !fromTeam) setFromTeam((mine as any)[0].id);
    } else {
      setMyTeams([]);
    }

    // Load challenges where my teams are involved (as captain)
    if (uid) {
      const mineIds = ((await supabase.from('teams').select('id').eq('captain_id', uid)).data as any[] ?? []).map(x=>x.id);
      if (mineIds.length) {
        const { data: ch } = await supabase.from('match_challenges')
          .select('id, from_team, to_team, proposed_time, location_text, status, created_at, from:teams!match_challenges_from_team_fkey(*), to:teams!match_challenges_to_team_fkey(*)')
          .in('from_team', mineIds)
          .order('created_at', {ascending:false});
        const { data: ch2 } = await supabase.from('match_challenges')
          .select('id, from_team, to_team, proposed_time, location_text, status, created_at, from:teams!match_challenges_from_team_fkey(*), to:teams!match_challenges_to_team_fkey(*)')
          .in('to_team', mineIds)
          .order('created_at', {ascending:false});
        const merged = [...(ch as any ?? []), ...(ch2 as any ?? [])];
        // de-dup by id
        const map = new Map<string, any>();
        merged.forEach(x=>map.set(x.id, x));
        const sorted = Array.from(map.values()).sort((a,b)=> (a.created_at < b.created_at ? 1 : -1));
        setChallenges(sorted as any);

        // Load chat rooms for accepted challenges
        const acceptedIds = sorted.filter((x:any)=>x.status === 'accepted').map((x:any)=>x.id);
        if (acceptedIds.length) {
          const { data: rs } = await supabase.from('chat_rooms').select('id, challenge_id').in('challenge_id', acceptedIds);
          const m2: Record<string,string> = {};
          (rs as any[] ?? []).forEach(r => { if (r.challenge_id) m2[r.challenge_id] = r.id; });
          setRooms(m2);
        } else {
          setRooms({});
        }
      } else {
        setChallenges([]);
        setRooms({});
      }
    } else setChallenges([]);
  }

  useEffect(() => { load(); }, []);

  async function createChallenge() {
    if (!myId) { alert('لازم تسجل دخول'); return; }
    if (!fromTeam || !toTeam) { alert('اختار فريقك وفريق الخصم'); return; }
    if (fromTeam === toTeam) { alert('ما تقدرش تتحدّى نفسك 😅'); return; }

    setLoading(true);
    const { error } = await supabase.from('match_challenges').insert({
      from_team: fromTeam,
      to_team: toTeam,
      proposed_time: new Date(when).toISOString(),
      location_text: location || null,
      status: 'pending'
    });
    setLoading(false);
    if (error) alert(error.message);
    else {
      alert('✅ تم إرسال التحدي');
      setToTeam('');
      setLocation('');
      await load();
    }
  }

  async function updateChallenge(chId: string, status: 'accepted'|'declined') {
    const { error } = await supabase.from('match_challenges').update({ status }).eq('id', chId);
    if (error) { alert(error.message); return; }

    if (status === 'accepted') {
      // Create chat room (idempotent via unique constraint)
      await supabase.from('chat_rooms').upsert({ challenge_id: chId, is_open: true });

      // Create a scheduled match from challenge (optional)
      const ch = challenges.find(x => x.id === chId) as any;
      if (ch?.from_team && ch?.to_team) {
        const city = ch.to?.city || ch.from?.city || '';
        await supabase.from('matches').insert({
          created_by: myId,
          city,
          kickoff_at: ch.proposed_time,
          location_text: ch.location_text || null,
          status: 'scheduled',
          team_home: ch.from_team,
          team_away: ch.to_team,
          challenge_id: chId,
        });
      }
    }

    await load();
  }

  const toTeamsFiltered = allTeams.filter(t => t.id !== fromTeam);

  return (
    <>
      <Nav />
      <div className="card">
        <h1>التحديات</h1>
        <p className="small">تنسيق مباريات خماسية فقط (5 + GK). إرسال التحدي مسموح للكابتن فقط.</p>

        <hr />
        <h2>إرسال تحدي</h2>
        {!isCaptainSome ? (
          <p className="small">لازم يكون عندك فريق كابتن عليه. أنشئ فريق أولًا.</p>
        ) : (
          <>
            <div className="row">
              <div style={{flex:1, minWidth:240}}>
                <label className="label">فريقي (From)</label>
                <select className="input" value={fromTeam} onChange={e=>setFromTeam(e.target.value)}>
                  {myTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.city})</option>)}
                </select>
              </div>
              <div style={{flex:1, minWidth:240}}>
                <label className="label">الخصم (To)</label>
                <select className="input" value={toTeam} onChange={e=>setToTeam(e.target.value)}>
                  <option value="" disabled>اختر فريق</option>
                  {toTeamsFiltered.map(t => <option key={t.id} value={t.id}>{t.name} — {t.city} — {t.level}</option>)}
                </select>
              </div>
            </div>

            <div style={{height:10}} />
            <div className="row">
              <div style={{flex:1, minWidth:240}}>
                <label className="label">الوقت</label>
                <input className="input" type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} />
              </div>
              <div style={{flex:1, minWidth:240}}>
                <label className="label">المكان (اختياري)</label>
                <input className="input" value={location} onChange={e=>setLocation(e.target.value)} placeholder="ملعب... حي..." />
              </div>
            </div>

            <div style={{height:10}} />
            <button className="btn" onClick={createChallenge} disabled={!fromTeam || !toTeam || loading}>
              {loading ? '...' : 'إرسال'}
            </button>
          </>
        )}

        <hr />
        <h2>التحديات الخاصة بك</h2>
        {challenges.length === 0 ? (
          <p className="small">ما فيش تحديات.</p>
        ) : (
          challenges.map(ch => {
            const amToCaptain = myId && ch.to?.captain_id === myId;
            const pending = ch.status === 'pending';
            return (
              <div key={ch.id} className="card" style={{marginBottom:12}}>
                <b>{ch.from?.name}</b> <span className="small">ضد</span> <b>{ch.to?.name}</b>
                <div className="row" style={{marginTop:6}}>
                  <span className="badge">{new Date(ch.proposed_time).toLocaleString()}</span>
                  {ch.location_text && <span className="badge">{ch.location_text}</span>}
                  <span className="badge">{ch.status}</span>
                </div>
                {pending && amToCaptain && (
                  <div className="row" style={{marginTop:10}}>
                    <button className="btn" onClick={()=>updateChallenge(ch.id, 'accepted')}>قبول</button>
                    <button className="btn secondary" onClick={()=>updateChallenge(ch.id, 'declined')}>رفض</button>
                  </div>
                )}
                {pending && !amToCaptain && (
                  <div className="small" style={{marginTop:10}}>في انتظار رد الفريق المستقبل.</div>
                )}

                {ch.status === 'accepted' && rooms[ch.id] && (
                  <div className="row" style={{marginTop:10}}>
                    <a className="btn sm" href={`/chat/${rooms[ch.id]}`}>فتح الشات</a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
