'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../../lib/supabase'
import Nav from '../components/Nav'

type Player={id:string;name:string;active:boolean}
type Row={player_id:string}

export default function Players(){
  const [players,setPlayers]=useState<Player[]>([])
  const [participations,setParticipations]=useState<Row[]>([])
  const [assignments,setAssignments]=useState<Row[]>([])
  const [parents,setParents]=useState<Row[]>([])
  const [name,setName]=useState('')
  const [loading,setLoading]=useState(true)

  async function load(){
    const s=supabase(); const {data:{session}}=await s.auth.getSession(); if(!session){location.href='/login';return}
    const [p,mp,a,pa]=await Promise.all([
      s.from('players').select('id,name,active').eq('active',true).order('name'),
      s.from('match_players').select('player_id'),
      s.from('assignments').select('player_id'),
      s.from('parents').select('player_id'),
    ])
    setPlayers(p.data||[]); setParticipations(mp.data||[]); setAssignments(a.data||[]); setParents(pa.data||[]); setLoading(false)
  }
  useEffect(()=>{load()},[])

  const stats=useMemo(()=>players.map(p=>{
    const games=participations.filter(x=>x.player_id===p.id).length
    const jobs=assignments.filter(x=>x.player_id===p.id).length
    const hasParent=parents.some(x=>x.player_id===p.id)
    return {...p,games,jobs,ratio:games?jobs/games:0,hasParent}
  }).sort((a,b)=>a.ratio-b.ratio||a.name.localeCompare(b.name,'sv')), [players,participations,assignments,parents])

  async function add(e:React.FormEvent){e.preventDefault(); if(!name.trim())return; const {error}=await supabase().from('players').insert({name:name.trim()}); if(error){alert(error.message);return}; setName(''); await load()}

  return <main><header><div><small>BASKETLAGET</small><h1>Spelare</h1></div></header>
    <form className="inline-form" onSubmit={add}><input placeholder="Spelarens namn" value={name} onChange={e=>setName(e.target.value)}/><button className="primary">Lägg till</button></form>
    {loading?<p>Laddar…</p>:<div className="list">{stats.map(p=><section className="card player-row" key={p.id}><div><b>{p.name}</b><p>{p.jobs} av {p.games} matcher · {Math.round(p.ratio*100)}%</p></div><span className={p.hasParent?'badge':'badge warn'}>{p.hasParent?'Förälder finns':'Saknar förälder'}</span></section>)}</div>}
    <Nav/></main>
}
