'use client';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

type Invite = {
  id: string;
  team_id: string;
  status: 'pending'|'accepted'|'declined';
  created_at: string;
  teams: { name: string; city: string; level: string; captain_id: string };
};

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setMyId(uid);
    if (!uid) { setInvites([]); return; }

    const { data, error } = await supabase.from('team_invites')
      .select('id, team_id, status, created_at, teams:teams(name, city, level, captain_id)')
      .eq('invited_player', uid)
      .order('created_at', { ascending:false });

    if (error) alert(error.message);
    else setInvites(data as any);
  }

  useEffect(() => { load(); }, []);

  async function respond(invite: Invite, action: 'accepted'|'declined') {
    if (!myId) { alert('لازم تسجل'); return; }

    // update invite status
    const { error: e1 } = await supabase.from('team_invites')
      .update({ status: action })
      .eq('id', invite.id);

    if (e1) { alert(e1.message); return; }

    if (action === 'accepted') {
      // add member immediately (max 3 enforced by trigger)
      const { error: e2 } = await supabase.from('team_members')
        .insert({ team_id: invite.team_id, player_id: myId, role: 'member' });
      if (e2) { alert(e2.message); }
    }

    await load();
  }

  return (
    <>
      <Nav />
      <div className="card">
        <h1>الدعوات</h1>
        <p className="small">قبولك للدعوة يضيفك للفريق مباشرة (حد أقصى 3 فرق).</p>
        <hr />
        {invites.length === 0 ? (
          <p className="small">ما فيش دعوات.</p>
        ) : (
          invites.map(inv => (
            <div key={inv.id} className="card" style={{marginBottom:12}}>
              <b>{inv.teams.name}</b>
              <div className="row">
                <span className="badge">{inv.teams.city}</span>
                <span className="badge">{inv.teams.level}</span>
                <span className="badge">{inv.status}</span>
              </div>
              {inv.status === 'pending' && (
                <div className="row" style={{marginTop:10}}>
                  <button className="btn" onClick={()=>respond(inv, 'accepted')}>قبول</button>
                  <button className="btn secondary" onClick={()=>respond(inv, 'declined')}>رفض</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
