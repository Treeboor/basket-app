'use client'
import {useState} from 'react'
import {supabase} from '../../lib/supabase'

export default function Login(){
  const [email,setEmail]=useState('')
  const [msg,setMsg]=useState('')
  const [sending,setSending]=useState(false)

  async function login(e:React.FormEvent){
    e.preventDefault()
    setSending(true)
    setMsg('')
    const {error}=await supabase().auth.signInWithOtp({
      email,
      options:{
        shouldCreateUser:false,
        emailRedirectTo:"https://basket-app-robert-2460s-projects.vercel.app/"
      }
    })
    setSending(false)
    setMsg(error
      ? 'Den mejladressen är inte inbjuden till basketappen, eller så kunde länken inte skickas.'
      : 'Kolla din mejl – vi skickade en inloggningslänk.'
    )
  }

  return <main className="login"><div>
    <small>BASKETLAGET</small>
    <h1>Logga in</h1>
    <p>Endast inbjudna användare kan logga in.</p>
    <form onSubmit={login}>
      <input type="email" required placeholder="din@mejl.se" value={email} onChange={e=>setEmail(e.target.value)}/>
      <button disabled={sending}>{sending?'Skickar…':'Skicka inloggningslänk'}</button>
    </form>
    {msg&&<p>{msg}</p>}
  </div></main>
}
