'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import Nav from '../components/Nav'

type Match={id:string;match_date:string;match_time:string|null;opponent:string|null;location:string}
type Player={id:string;name:string}
type Assignment={id:string;match_id:string;player_id:string;role:string}
const roleName:Record<string,string>={secretariat:'Sekretariat',timekeeping:'Tidtagning',filming:'Filmning',match_host:'Matchvärd'}

export default function Schedule(){
  const [rows,setRows]=useState<{a:Assignment;m?:Match;p?:Player}[]>([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{const s=supabase();const {data:{session}}=await s.auth.getSession();if(!session){location.href='/login';return}
    const [aa,mm,pp]=await Promise.all([s.from('assignments').select('*'),s.from('matches').select('*').order('match_date'),s.from('players').select('id,name')])
    const matches=new Map((mm.data||[]).map((x:any)=>[x.id,x])); const players=new Map((pp.data||[]).map((x:any)=>[x.id,x]))
    setRows((aa.data||[]).map((a:any)=>({a,m:matches.get(a.match_id),p:players.get(a.player_id)})).filter((x:any)=>x.m).sort((x:any,y:any)=>x.m.match_date.localeCompare(y.m.match_date))); setLoading(false)
  })()},[])
  return <main><header><div><small>BASKETLAGET</small><h1>Schema</h1></div></header>
    {loading?<p>Laddar…</p>:rows.length?<div className="list">{rows.map(({a,m,p})=><section className="card" key={a.id}><b>{roleName[a.role]||a.role}</b><p>{p?.name||'Okänd spelare'} · {m?.match_date} · {m?.location}</p></section>)}</div>:<section className="empty"><h2>Inget fördelat ännu</h2><p>Öppna en match och tryck på en arbetsroll för att fördela den.</p></section>}
    <Nav/></main>
}
