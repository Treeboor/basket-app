'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import Nav from '../components/Nav'

type Member={
  id:string
  email:string
  user_id:string|null
  role:'admin'|'member'
  invited_at:string
  accepted_at:string|null
}

export default function Settings(){
  const [email,setEmail]=useState('')
  const [members,setMembers]=useState<Member[]>([])
  const [isAdmin,setIsAdmin]=useState(false)
  const [inviteEmail,setInviteEmail]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')

  async function load(){
    const s=supabase()
    const {data:{user}}=await s.auth.getUser()
    if(!user){location.href='/login';return}
    setEmail(user.email||'')

    const {data:me}=await s.from('members').select('id,email,user_id,role,invited_at,accepted_at').eq('user_id',user.id).maybeSingle()
    setIsAdmin(me?.role==='admin')

    if(me?.role==='admin'){
      const {data,error}=await s.from('members').select('id,email,user_id,role,invited_at,accepted_at').order('created_at')
      if(error)setMsg(error.message)
      setMembers(data||[])
    }else{
      setMembers(me?[me]:[])
    }
    setLoading(false)
  }

  useEffect(()=>{load()},[])

  async function invite(e:React.FormEvent){
    e.preventDefault()
    if(!inviteEmail.trim())return
    setBusy(true);setMsg('')
    const {data,error}=await supabase().functions.invoke('basket-members',{
      body:{action:'invite',email:inviteEmail.trim()}
    })
    setBusy(false)
    if(error){setMsg(error.message);return}
    if(data?.error){setMsg(data.error);return}
    setInviteEmail('')
    setMsg(data?.inviteSent
      ? 'Inbjudan skickad.'
      : data?.inviteNote||'Åtkomst tillagd.'
    )
    await load()
  }

  async function remove(member:Member){
    if(!confirm(`Ta bort åtkomst för ${member.email}?`))return
    setBusy(true);setMsg('')
    const {data,error}=await supabase().functions.invoke('basket-members',{
      body:{action:'remove',memberId:member.id}
    })
    setBusy(false)
    if(error){setMsg(error.message);return}
    if(data?.error){setMsg(data.error);return}
    setMsg('Åtkomsten är borttagen.')
    await load()
  }

  async function logout(){
    await supabase().auth.signOut()
    location.href='/login'
  }

  return <main>
    <header><div><small>BASKETLAGET</small><h1>Inställningar</h1></div></header>

    <section className="card settings-card">
      <b>Inloggad</b>
      <p>{email||'…'}</p>
    </section>

    <section className="card settings-card">
      <b>Hemmaplaner</b>
      <p>Kungsbacka och Åsa</p>
    </section>

    {isAdmin&&<section className="settings-section">
      <div className="section-head"><div><h2>Användare</h2><p>Endast personer du bjuder in får åtkomst.</p></div></div>
      <form className="inline-form" onSubmit={invite}>
        <input type="email" required placeholder="namn@mejl.se" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/>
        <button className="primary" disabled={busy}>{busy?'Vänta…':'Bjud in'}</button>
      </form>

      {loading?<p>Laddar…</p>:<div className="list">
        {members.map(m=><section className="card member-row" key={m.id}>
          <div>
            <b>{m.email}</b>
            <p>{m.role==='admin'?'Admin':m.accepted_at||m.user_id?'Aktiv':'Inbjuden'}</p>
          </div>
          {m.role!=='admin'&&<button className="danger-link" disabled={busy} onClick={()=>remove(m)}>Ta bort</button>}
        </section>)}
      </div>}
      {msg&&<p className="settings-message">{msg}</p>}
    </section>}

    <button className="secondary danger" onClick={logout}>Logga ut</button>
    <Nav/>
  </main>
}
