'use client'
import Link from 'next/link'
import {useParams} from 'next/navigation'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../../../lib/supabase'
import Nav from '../../components/Nav'

type Match={id:string;match_date:string;match_time:string|null;opponent:string|null;location:string}
type Player={id:string;name:string;active:boolean}
type Parent={player_id:string;education:'none'|'secretariat'|'secretariat_24';is_coach:boolean}
type Assignment={id:string;match_id:string;player_id:string;role:string}
type MatchPlayer={match_id:string;player_id:string}
const roles=[
  {key:'secretariat',label:'Sekretariat',note:'Kräver utbildning'},
  {key:'timekeeping',label:'Tidtagning',note:'Utbildning är ett plus'},
  {key:'filming',label:'Filmning',note:'Ingen utbildning krävs'},
  {key:'match_host',label:'Matchvärd',note:'Ingen utbildning krävs'},
]

export default function MatchDetail(){
  const {id}=useParams<{id:string}>()
  const [match,setMatch]=useState<Match|null>(null); const [players,setPlayers]=useState<Player[]>([]); const [current,setCurrent]=useState<MatchPlayer[]>([])
  const [allParticipation,setAllParticipation]=useState<MatchPlayer[]>([]); const [assignments,setAssignments]=useState<Assignment[]>([]); const [allAssignments,setAllAssignments]=useState<Assignment[]>([])
  const [parents,setParents]=useState<Parent[]>([]); const [editingPlayers,setEditingPlayers]=useState(false); const [choosing,setChoosing]=useState<string|null>(null); const [loading,setLoading]=useState(true)

  async function load(){
    const s=supabase(); const {data:{session}}=await s.auth.getSession(); if(!session){location.href='/login';return}
    const [m,p,mp,amp,a,aa,pa]=await Promise.all([
      s.from('matches').select('*').eq('id',id).single(),
      s.from('players').select('id,name,active').eq('active',true).order('name'),
      s.from('match_players').select('match_id,player_id').eq('match_id',id),
      s.from('match_players').select('match_id,player_id'),
      s.from('assignments').select('*').eq('match_id',id),
      s.from('assignments').select('*'),
      s.from('parents').select('player_id,education,is_coach'),
    ])
    setMatch(m.data||null); setPlayers(p.data||[]); setCurrent(mp.data||[]); setAllParticipation(amp.data||[]); setAssignments(a.data||[]); setAllAssignments(aa.data||[]); setParents(pa.data||[]); setLoading(false)
  }
  useEffect(()=>{load()},[id])

  const currentIds=new Set(current.map(x=>x.player_id))
  const coachPlayerIds=new Set(parents.filter(p=>p.is_coach).map(p=>p.player_id))
  const playerNameClass=(playerId:string)=>{
    const family=parents.filter(p=>p.player_id===playerId)
    if(family.some(p=>p.is_coach))return 'coach-name'
    if(family.some(p=>p.education==='secretariat_24'))return 'edu24-name'
    if(family.some(p=>p.education==='secretariat'))return 'edu-secretariat-name'
    return 'edu-none-name'
  }
  const participating=players.filter(p=>currentIds.has(p.id))
  const notParticipating=players.filter(p=>!currentIds.has(p.id))
  const stats=useMemo(()=>new Map(players.map(p=>{
    const games=allParticipation.filter(x=>x.player_id===p.id).length
    const jobs=allAssignments.filter(x=>x.player_id===p.id).length
    return [p.id,{games,jobs,ratio:games?jobs/games:0}]
  })),[players,allParticipation,allAssignments])

  async function togglePlayer(playerId:string,on:boolean){
    const s=supabase()
    const {error}=on?await s.from('match_players').insert({match_id:id,player_id:playerId}):await s.from('match_players').delete().eq('match_id',id).eq('player_id',playerId)
    if(error){alert(error.message);return}
    if(!on) await s.from('assignments').delete().eq('match_id',id).eq('player_id',playerId)
    await load()
  }
  function qualified(playerId:string,role:string){
    if(role!=='secretariat')return true
    return parents.some(p=>p.player_id===playerId&&(p.education==='secretariat'||p.education==='secretariat_24'))
  }
  async function assign(role:string,playerId:string){
    const s=supabase(); const old=assignments.find(a=>a.role===role)
    if(old){const {error}=await s.from('assignments').delete().eq('id',old.id); if(error){alert(error.message);return}}
    const {error}=await s.from('assignments').insert({match_id:id,player_id:playerId,role})
    if(error){alert(error.message); await load(); return}; setChoosing(null); await load()
  }
  async function clear(role:string){const old=assignments.find(a=>a.role===role); if(!old)return; const {error}=await supabase().from('assignments').delete().eq('id',old.id); if(error){alert(error.message);return}; await load()}

  if(loading)return <main><p>Laddar…</p></main>
  if(!match)return <main><p>Matchen hittades inte.</p><Link href="/">Till matcher</Link></main>
  return <main>
    <div className="backline"><Link href="/">‹ Matcher</Link></div>
    <header><div><small>{match.location.toUpperCase()}</small><h1>{match.opponent?`Mot ${match.opponent}`:'Hemmamatch'}</h1><p>{match.match_date} · {match.match_time?.slice(0,5)||'Tid ej satt'}</p></div></header>

    <section className="section-head"><div><h2>Spelare i matchen</h2><p>{participating.length} valda</p></div><button className="text-button" onClick={()=>setEditingPlayers(v=>!v)}>{editingPlayers?'Klar':'Redigera'}</button></section>
    {editingPlayers?<section className="player-picker card">
      <div className="player-picker-label">Valda · {participating.length}</div>
      {participating.length?participating.map(p=><div className="player-pick-row selected" key={p.id}><span className={playerNameClass(p.id)}>{p.name}</span><button aria-label={`Ta bort ${p.name}`} onClick={()=>togglePlayer(p.id,false)}>−</button></div>):<p className="player-picker-empty">Inga spelare valda.</p>}
      <div className="player-picker-divider"><span>Välj fler</span></div>
      {notParticipating.map(p=><div className="player-pick-row" key={p.id}><span className={playerNameClass(p.id)}>{p.name}</span><button aria-label={`Lägg till ${p.name}`} onClick={()=>togglePlayer(p.id,true)}>＋</button></div>)}
    </section>:<div className="chips">{participating.length?participating.map(p=><span key={p.id}><span className={playerNameClass(p.id)}>{p.name}</span></span>):<p>Inga spelare valda ännu.</p>}</div>}

    <section className="section-head"><div><h2>Arbetsroller</h2><p>Tryck på en roll för att fördela den.</p></div></section>
    <div className="list">{roles.map(role=>{
      const a=assignments.find(x=>x.role===role.key); const p=players.find(x=>x.id===a?.player_id)
      return <section className="card role-card" key={role.key}>
        <button className="role-main" onClick={()=>setChoosing(choosing===role.key?null:role.key)}><span><b>{role.label}</b><small>{role.note}</small></span><span className={a?'assigned':'unassigned'}>{p?<span className={playerNameClass(p.id)}>{p.name}</span>:'Välj'}</span></button>
        {a&&<button className="clear" onClick={()=>clear(role.key)}>Ta bort</button>}
        {choosing===role.key&&<div className="candidate-list">{participating
          .sort((a,b)=>Number(coachPlayerIds.has(a.id))-Number(coachPlayerIds.has(b.id))||(stats.get(a.id)?.ratio||0)-(stats.get(b.id)?.ratio||0))
          .map(p=>{
            const st=stats.get(p.id)!
            const coach=coachPlayerIds.has(p.id)
            const hasPermission=qualified(p.id,role.key)
            const otherRole=assignments.some(a=>a.player_id===p.id&&a.role!==role.key)
            const disabled=!hasPermission||otherRole
            const status=coach
              ? 'Tränare · ej i kvoten'
              : !hasPermission
                ? `Saknar behörighet · ${st.jobs} av ${st.games} · ${Math.round(st.ratio*100)}%`
                : otherRole
                  ? `Redan tilldelad · ${st.jobs} av ${st.games} · ${Math.round(st.ratio*100)}%`
                  : `${st.jobs} av ${st.games} · ${Math.round(st.ratio*100)}%`
            return <button className={disabled?'candidate-disabled':''} disabled={disabled} key={p.id} onClick={()=>assign(role.key,p.id)}><span className={playerNameClass(p.id)}>{p.name}</span><span>{status}</span></button>
          })}</div>}
      </section>
    })}</div>
    <Nav/>
  </main>
}
