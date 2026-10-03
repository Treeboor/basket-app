'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import Nav from '../components/Nav'

type Match={id:string;match_date:string;match_time:string|null;opponent:string|null;location:string}
type Player={id:string;name:string}
type Assignment={id:string;match_id:string;player_id:string;role:string}
const roleName:Record<string,string>={secretariat:'Sekretariat',timekeeping:'Tidtagning',filming:'Filmning',match_host:'Matchvärd'}

export default function Schedule(){
  const [rows,setRows]=useState<{a:Assignment;m?:Match;p?:Player;isCoach:boolean;nameClass:string}[]>([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{const s=supabase();const {data:{session}}=await s.auth.getSession();if(!session){location.href='/login';return}
    const [aa,mm,pp,pa]=await Promise.all([s.from('assignments').select('*'),s.from('matches').select('*').order('match_date'),s.from('players').select('id,name'),s.from('parents').select('player_id,is_coach,education')])
    const matches=new Map((mm.data||[]).map((x:any)=>[x.id,x])); const players=new Map((pp.data||[]).map((x:any)=>[x.id,x]))
    const parentRows=(pa.data||[]) as any[]
    const coachIds=new Set(parentRows.filter((x:any)=>x.is_coach).map((x:any)=>x.player_id))
    const nameClass=(playerId:string)=>{
      const family=parentRows.filter((x:any)=>x.player_id===playerId)
      if(family.some((x:any)=>x.is_coach))return 'coach-name'
      if(family.some((x:any)=>x.education==='secretariat_24'))return 'edu24-name'
      if(family.some((x:any)=>x.education==='secretariat'))return 'edu-secretariat-name'
      return 'edu-none-name'
    }
    setRows((aa.data||[]).map((a:any)=>({a,m:matches.get(a.match_id),p:players.get(a.player_id),isCoach:coachIds.has(a.player_id),nameClass:nameClass(a.player_id)})).filter((x:any)=>x.m).sort((x:any,y:any)=>x.m.match_date.localeCompare(y.m.match_date))); setLoading(false)
  })()},[])
  return <main><header><div><small>BASKETLAGET</small><h1>Schema</h1></div></header>
    {loading?<p>Laddar…</p>:rows.length?<div className="list">{rows.map(({a,m,p,isCoach,nameClass})=><section className="card schedule-card" key={a.id}><b>{roleName[a.role]||a.role}</b><p><span className={nameClass}>{p?.name||'Okänd spelare'}</span>{isCoach?' · Tränare':''} · {m?.match_date} · {m?.location}</p></section>)}</div>:<section className="empty"><h2>Inget fördelat ännu</h2><p>Öppna en match och tryck på en arbetsroll för att fördela den.</p></section>}
    <Nav/></main>
}
