'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../lib/supabase'
import Nav from './components/Nav'

type Match={id:string;match_date:string;match_time:string|null;opponent:string|null;location:string}
type Player={id:string;name:string;active:boolean}
type Parent={id:string;player_id:string;name:string|null;phone:string|null;education:'none'|'secretariat'|'secretariat_24'}
type MatchPlayer={match_id:string;player_id:string}
type Assignment={id:string;match_id:string;player_id:string;role:'secretariat'|'timekeeping'|'filming'|'match_host'}
const roles=[
  {key:'secretariat',label:'Sekretariat',short:'Sekr.'},
  {key:'timekeeping',label:'Tidtagning',short:'Tid'},
  {key:'filming',label:'Filmning',short:'Film'},
  {key:'match_host',label:'Matchvärd',short:'Värd'},
] as const
const timeOptions=Array.from({length:96},(_,i)=>{
  const h=String(Math.floor(i/4)).padStart(2,'0')
  const m=String((i%4)*15).padStart(2,'0')
  return `${h}:${m}`
})

export default function Home(){
  const [matches,setMatches]=useState<Match[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [parents,setParents]=useState<Parent[]>([])
  const [matchPlayers,setMatchPlayers]=useState<MatchPlayer[]>([])
  const [assignments,setAssignments]=useState<Assignment[]>([])
  const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState<Match|null>(null)
  const [creating,setCreating]=useState(false)
  const [saving,setSaving]=useState(false)
  const [choosingRole,setChoosingRole]=useState<string|null>(null)
  const [playersOpen,setPlayersOpen]=useState(true)
  const [form,setForm]=useState({match_date:'',match_time:'',opponent:'',location:'Kungsbacka'})

  async function load(){
    const s=supabase()
    const {data:{session}}=await s.auth.getSession()
    if(!session){location.href='/login';return}
    const [m,p,pa,mp,a]=await Promise.all([
      s.from('matches').select('*').gte('match_date',new Date().toISOString().slice(0,10)).order('match_date').order('match_time'),
      s.from('players').select('id,name,active').eq('active',true).order('name'),
      s.from('parents').select('id,player_id,name,phone,education'),
      s.from('match_players').select('match_id,player_id'),
      s.from('assignments').select('*'),
    ])
    setMatches(m.data||[]); setPlayers(p.data||[]); setParents(pa.data||[]); setMatchPlayers(mp.data||[]); setAssignments(a.data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const currentMatchPlayers=editing?matchPlayers.filter(x=>x.match_id===editing.id):[]
  const currentIds=new Set(currentMatchPlayers.map(x=>x.player_id))
  const currentAssignments=editing?assignments.filter(x=>x.match_id===editing.id):[]
  const selectedPlayers=players.filter(p=>currentIds.has(p.id))
  const unselectedPlayers=players.filter(p=>!currentIds.has(p.id))

  async function createMatch(e:React.FormEvent){
    e.preventDefault(); setSaving(true)
    const {data,error}=await supabase().from('matches').insert({
      match_date:form.match_date,match_time:form.match_time||null,opponent:form.opponent||null,location:form.location
    }).select('*').single()
    setSaving(false)
    if(error){alert(error.message);return}
    setCreating(false); setForm({match_date:'',match_time:'',opponent:'',location:'Kungsbacka'})
    await load(); if(data)setEditing(data)
  }

  async function saveMatch(){
    if(!editing)return
    setSaving(true)
    const {error}=await supabase().from('matches').update({
      match_date:editing.match_date,match_time:editing.match_time||null,opponent:editing.opponent||null,location:editing.location
    }).eq('id',editing.id)
    setSaving(false)
    if(error){alert(error.message);return}
    await load()
  }

  async function togglePlayer(playerId:string,on:boolean){
    if(!editing)return
    const s=supabase()
    const {error}=on
      ? await s.from('match_players').insert({match_id:editing.id,player_id:playerId})
      : await s.from('match_players').delete().eq('match_id',editing.id).eq('player_id',playerId)
    if(error){alert(error.message);return}
    if(!on){
      await s.from('assignments').delete().eq('match_id',editing.id).eq('player_id',playerId)
    }
    await load()
  }

  function qualified(playerId:string,role:string){
    if(role!=='secretariat')return true
    return parents.some(p=>p.player_id===playerId&&(p.education==='secretariat'||p.education==='secretariat_24'))
  }

  async function assign(role:Assignment['role'],playerId:string){
    if(!editing)return
    const s=supabase()
    const old=currentAssignments.find(a=>a.role===role)
    if(old) await s.from('assignments').delete().eq('id',old.id)
    const {error}=await s.from('assignments').insert({match_id:editing.id,player_id:playerId,role})
    if(error){alert(error.message);return}
    setChoosingRole(null); await load()
  }

  async function clearRole(role:string){
    if(!editing)return
    const old=currentAssignments.find(a=>a.role===role)
    if(!old)return
    const {error}=await supabase().from('assignments').delete().eq('id',old.id)
    if(error){alert(error.message);return}
    await load()
  }

  function openMatch(m:Match){setEditing(m);setChoosingRole(null);setPlayersOpen(true)}

  return <main>
    <header><div><small>BASKETLAGET</small><h1>Nästa matcher</h1></div><button className="primary compact" onClick={()=>setCreating(true)}>＋ Ny</button></header>

    {loading?<p>Laddar…</p>:matches.length?<div className="list">{matches.map(m=>{
      const a=assignments.filter(x=>x.match_id===m.id)
      return <button className="match-card" onClick={()=>openMatch(m)} key={m.id}>
        <div className="date">{new Date(m.match_date+'T12:00').toLocaleDateString('sv-SE',{day:'numeric',month:'short'})}</div>
        <div className="match-main"><b>{m.opponent?`Mot ${m.opponent}`:'Hemmamatch'}</b><p>{m.match_time?.slice(0,5)||'Tid ej satt'} · {m.location}</p>
          <div className="role-statuses">{roles.map(r=>{
            const found=a.find(x=>x.role===r.key)
            const worker=players.find(p=>p.id===found?.player_id)
            return <span key={r.key} className={found?'role-pill ok':'role-pill missing'}>{r.short}: {worker?.name||'saknas'}</span>
          })}</div>
        </div><span className="chev">›</span>
      </button>
    })}</div>:<section className="empty"><h2>Inga kommande matcher</h2><p>Lägg in nästa hemmamatch med knappen ovan.</p></section>}

    {(creating||editing)&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setCreating(false);setEditing(null)}}}>
      <section className="modal">
        <div className="modal-head">
          <div><small>{creating?'NY MATCH':'REDIGERA MATCH'}</small><h2>{creating?'Skapa match':editing?.opponent?`Mot ${editing.opponent}`:'Hemmamatch'}</h2></div>
          <button className="icon-btn" onClick={()=>{setCreating(false);setEditing(null)}}>✕</button>
        </div>
        {creating?<form className="modal-body form-card bare" onSubmit={createMatch}>
          <div className="date-time-row">
            <label>Datum<input type="date" required value={form.match_date} onChange={e=>setForm({...form,match_date:e.target.value})}/></label>
            <label>Tid<select value={form.match_time} onChange={e=>setForm({...form,match_time:e.target.value})}><option value="">Tid ej satt</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
          </div>
          <label>Motståndare<input value={form.opponent} onChange={e=>setForm({...form,opponent:e.target.value})}/></label>
          <label>Plats<select value={form.location} onChange={e=>setForm({...form,location:e.target.value})}><option>Kungsbacka</option><option>Åsa</option></select></label>
          <button className="primary" disabled={saving}>{saving?'Sparar…':'Skapa match'}</button>
        </form>:editing&&<div className="modal-body">
          <div className="edit-grid">
            <div className="date-time-row date-time-span">
              <label>Datum<input type="date" value={editing.match_date} onChange={e=>setEditing({...editing,match_date:e.target.value})}/></label>
              <label>Tid<select value={editing.match_time?.slice(0,5)||''} onChange={e=>setEditing({...editing,match_time:e.target.value||null})}><option value="">Tid ej satt</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
            </div>
            <label>Motståndare<input value={editing.opponent||''} onChange={e=>setEditing({...editing,opponent:e.target.value})}/></label>
            <label>Plats<select value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})}><option>Kungsbacka</option><option>Åsa</option></select></label>
          </div>
          <button className="secondary full" onClick={saveMatch} disabled={saving}>{saving?'Sparar…':'Spara matchinfo'}</button>

          <button className="section-toggle" onClick={()=>setPlayersOpen(v=>!v)}>
            <span><b>Spelare</b><small>{currentIds.size} valda</small></span>
            <span>{playersOpen?'Dölj ▴':'Visa ▾'}</span>
          </button>
          {playersOpen&&<div className="player-picker card">
            <div className="player-picker-label">Valda · {selectedPlayers.length}</div>
            {selectedPlayers.length?selectedPlayers.map(p=><div className="player-pick-row selected" key={p.id}><span>{p.name}</span><button aria-label={`Ta bort ${p.name}`} onClick={()=>togglePlayer(p.id,false)}>−</button></div>):<p className="player-picker-empty">Inga spelare valda.</p>}
            <div className="player-picker-divider"><span>Välj fler</span></div>
            {unselectedPlayers.map(p=><div className="player-pick-row" key={p.id}><span>{p.name}</span><button aria-label={`Lägg till ${p.name}`} onClick={()=>togglePlayer(p.id,true)}>＋</button></div>)}
          </div>}

          <div className="section-head"><div><h3>Arbetspass</h3><p>Tryck på ett pass för att välja familj.</p></div></div>
          <div className="list">{roles.map(r=>{
            const a=currentAssignments.find(x=>x.role===r.key)
            const p=players.find(x=>x.id===a?.player_id)
            return <div className="card role-card" key={r.key}>
              <button className="role-main" onClick={()=>setChoosingRole(choosingRole===r.key?null:r.key)}>
                <span><b>{r.label}</b><small>{r.key==='secretariat'?'Kräver utbildning':'Ingen särskild utbildning krävs'}</small></span>
                <span className={a?'assigned':'unassigned'}>{p?.name||'Välj'}</span>
              </button>
              {a&&<button className="clear" onClick={()=>clearRole(r.key)}>Ta bort</button>}
              {choosingRole===r.key&&<div className="candidate-list">
                {players.filter(p=>currentIds.has(p.id)&&qualified(p.id,r.key)&&!currentAssignments.some(a=>a.player_id===p.id&&a.role!==r.key)).map(p=><button key={p.id} onClick={()=>assign(r.key,p.id)}><span>{p.name}</span><span>{parents.some(pa=>pa.player_id===p.id)?'Förälder registrerad':'Saknar förälder'}</span></button>)}
                {!players.some(p=>currentIds.has(p.id)&&qualified(p.id,r.key))&&<p className="muted">Ingen valbar spelare.</p>}
              </div>}
            </div>
          })}</div>
        </div>}
      </section>
    </div>}
    <Nav/>
  </main>
}
