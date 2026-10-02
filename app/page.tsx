'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
import Nav from './components/Nav'

type Match={id:string;match_date:string;match_time:string|null;opponent:string|null;location:string}

export default function Home(){
  const [matches,setMatches]=useState<Match[]>([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [saving,setSaving]=useState(false)
  const [form,setForm]=useState({match_date:'',match_time:'',opponent:'',location:'Kungsbacka'})

  async function load(){
    const s=supabase()
    const {data:{session}}=await s.auth.getSession()
    if(!session){location.href='/login';return}
    const {data}=await s.from('matches').select('*').gte('match_date',new Date().toISOString().slice(0,10)).order('match_date').order('match_time')
    setMatches(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  async function createMatch(e:React.FormEvent){
    e.preventDefault(); setSaving(true)
    const {error}=await supabase().from('matches').insert({
      match_date:form.match_date,
      match_time:form.match_time||null,
      opponent:form.opponent||null,
      location:form.location,
    })
    setSaving(false)
    if(error){alert(error.message);return}
    setForm({match_date:'',match_time:'',opponent:'',location:'Kungsbacka'})
    setShowForm(false); await load()
  }

  return <main>
    <header><div><small>BASKETLAGET</small><h1>Nästa matcher</h1></div><Link href="/settings" className="avatar">R</Link></header>
    <button className="primary" onClick={()=>setShowForm(v=>!v)}>{showForm?'Stäng':'＋ Ny match'}</button>
    {showForm&&<form className="card form-card" onSubmit={createMatch}>
      <label>Datum<input type="date" required value={form.match_date} onChange={e=>setForm({...form,match_date:e.target.value})}/></label>
      <label>Tid<input type="time" value={form.match_time} onChange={e=>setForm({...form,match_time:e.target.value})}/></label>
      <label>Motståndare<input placeholder="Lagets namn" value={form.opponent} onChange={e=>setForm({...form,opponent:e.target.value})}/></label>
      <label>Plats<select value={form.location} onChange={e=>setForm({...form,location:e.target.value})}><option>Kungsbacka</option><option>Åseda</option></select></label>
      <button className="primary" disabled={saving}>{saving?'Sparar…':'Spara match'}</button>
    </form>}
    {loading?<p>Laddar…</p>:matches.length?<div className="list">{matches.map(m=><Link className="match-card" href={`/matches/${m.id}`} key={m.id}>
      <div className="date">{new Date(m.match_date+'T12:00').toLocaleDateString('sv-SE',{day:'numeric',month:'short'})}</div>
      <div><b>{m.opponent?`Mot ${m.opponent}`:'Hemmamatch'}</b><p>{m.match_time?.slice(0,5)||'Tid ej satt'} · {m.location}</p></div><span className="chev">›</span>
    </Link>)}</div>:<section className="empty"><h2>Inga kommande matcher</h2><p>Lägg in nästa hemmamatch med knappen ovan.</p></section>}
    <Nav/>
  </main>
}
