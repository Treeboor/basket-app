'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../../lib/supabase'
import Nav from '../components/Nav'

type Player={id:string;name:string;active:boolean}
type Parent={id:string;player_id:string;name:string|null;phone:string|null;education:'none'|'secretariat'|'secretariat_24'}
type Row={player_id:string}

const educationLabels={none:'Ingen',secretariat:'Sekretariat',secretariat_24:'Sekretariat 24'}

export default function Players(){
  const [players,setPlayers]=useState<Player[]>([])
  const [participations,setParticipations]=useState<Row[]>([])
  const [assignments,setAssignments]=useState<Row[]>([])
  const [parents,setParents]=useState<Parent[]>([])
  const [name,setName]=useState('')
  const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState<Player|null>(null)
  const [playerName,setPlayerName]=useState('')
  const [parentDraft,setParentDraft]=useState({name:'',phone:'',education:'none' as Parent['education']})

  async function load(){
    const s=supabase(); const {data:{session}}=await s.auth.getSession(); if(!session){location.href='/login';return}
    const [p,mp,a,pa]=await Promise.all([
      s.from('players').select('id,name,active').eq('active',true).order('name'),
      s.from('match_players').select('player_id'),
      s.from('assignments').select('player_id'),
      s.from('parents').select('id,player_id,name,phone,education').order('created_at'),
    ])
    setPlayers(p.data||[]); setParticipations(mp.data||[]); setAssignments(a.data||[]); setParents(pa.data||[]); setLoading(false)
  }
  useEffect(()=>{load()},[])

  const stats=useMemo(()=>players.map(p=>{
    const games=participations.filter(x=>x.player_id===p.id).length
    const jobs=assignments.filter(x=>x.player_id===p.id).length
    const parentCount=parents.filter(x=>x.player_id===p.id).length
    return {...p,games,jobs,ratio:games?jobs/games:0,parentCount}
  }).sort((a,b)=>a.ratio-b.ratio||a.name.localeCompare(b.name,'sv')), [players,participations,assignments,parents])

  async function add(e:React.FormEvent){e.preventDefault(); if(!name.trim())return; const {error}=await supabase().from('players').insert({name:name.trim()}); if(error){alert(error.message);return}; setName(''); await load()}
  function openPlayer(p:Player){setEditing(p);setPlayerName(p.name);setParentDraft({name:'',phone:'',education:'none'})}
  async function savePlayer(){if(!editing)return;const {error}=await supabase().from('players').update({name:playerName.trim()}).eq('id',editing.id);if(error){alert(error.message);return};await load();setEditing({...editing,name:playerName.trim()})}
  async function addParent(e:React.FormEvent){e.preventDefault();if(!editing)return;const {error}=await supabase().from('parents').insert({player_id:editing.id,name:parentDraft.name||null,phone:parentDraft.phone||null,education:parentDraft.education});if(error){alert(error.message);return};setParentDraft({name:'',phone:'',education:'none'});await load()}
  async function updateParent(p:Parent,patch:Partial<Parent>){const {error}=await supabase().from('parents').update(patch).eq('id',p.id);if(error){alert(error.message);return};await load()}
  async function deleteParent(id:string){if(!confirm('Ta bort föräldern?'))return;const {error}=await supabase().from('parents').delete().eq('id',id);if(error){alert(error.message);return};await load()}

  return <main><header><div><small>BASKETLAGET</small><h1>Spelare</h1></div></header>
    <form className="inline-form" onSubmit={add}><input placeholder="Spelarens namn" value={name} onChange={e=>setName(e.target.value)}/><button className="primary">Lägg till</button></form>
    {loading?<p>Laddar…</p>:<div className="list">{stats.map(p=><button className="card player-row button-row" key={p.id} onClick={()=>openPlayer(p)}><div><b>{p.name}</b><p>{p.jobs} av {p.games} matcher · {Math.round(p.ratio*100)}%</p></div><span className={p.parentCount?'badge':'badge warn'}>{p.parentCount?`${p.parentCount} förälder${p.parentCount>1?'ar':''}`:'Saknar förälder'}</span></button>)}</div>}

    {editing&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
      <section className="modal">
        <div className="modal-head"><div><small>REDIGERA SPELARE</small><h2>{editing.name}</h2></div><button className="icon-btn" onClick={()=>setEditing(null)}>✕</button></div>
        <div className="modal-body">
          <label className="stack-label">Spelarens namn<input value={playerName} onChange={e=>setPlayerName(e.target.value)}/></label>
          <button className="secondary full" onClick={savePlayer}>Spara namn</button>

          <div className="section-head"><div><h3>Föräldrar</h3><p>Namn, telefon och utbildning.</p></div></div>
          <div className="list">{parents.filter(p=>p.player_id===editing.id).map(p=><div className="card parent-card" key={p.id}>
            <label>Namn<input defaultValue={p.name||''} onBlur={e=>updateParent(p,{name:e.target.value||null})}/></label>
            <label>Telefon<input defaultValue={p.phone||''} onBlur={e=>updateParent(p,{phone:e.target.value||null})}/></label>
            <label>Utbildning<select value={p.education} onChange={e=>updateParent(p,{education:e.target.value as Parent['education']})}>
              <option value="none">Ingen</option><option value="secretariat">Sekretariat</option><option value="secretariat_24">Sekretariat 24</option>
            </select></label>
            <button className="danger-link" onClick={()=>deleteParent(p.id)}>Ta bort förälder</button>
          </div>)}</div>

          <form className="card parent-card add-parent" onSubmit={addParent}>
            <b>Lägg till förälder</b>
            <label>Namn<input value={parentDraft.name} onChange={e=>setParentDraft({...parentDraft,name:e.target.value})} placeholder="Valfritt"/></label>
            <label>Telefon<input value={parentDraft.phone} onChange={e=>setParentDraft({...parentDraft,phone:e.target.value})} placeholder="Valfritt"/></label>
            <label>Utbildning<select value={parentDraft.education} onChange={e=>setParentDraft({...parentDraft,education:e.target.value as Parent['education']})}><option value="none">Ingen</option><option value="secretariat">Sekretariat</option><option value="secretariat_24">Sekretariat 24</option></select></label>
            <button className="primary">Lägg till förälder</button>
          </form>
        </div>
      </section>
    </div>}
    <Nav/></main>
}
