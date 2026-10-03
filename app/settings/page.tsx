'use client'
import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import Nav from '../components/Nav'

export default function Settings(){
  const [email,setEmail]=useState('')
  useEffect(()=>{supabase().auth.getUser().then(({data})=>setEmail(data.user?.email||''))},[])
  async function logout(){await supabase().auth.signOut(); location.href='/login'}
  return <main><header><div><small>BASKETLAGET</small><h1>Inställningar</h1></div></header>
    <section className="card"><b>Inloggad</b><p>{email||'…'}</p></section>
    <section className="card"><b>Hemmaplaner</b><p>Kungsbacka och Åsa</p></section>
    <button className="secondary danger" onClick={logout}>Logga ut</button>
    <Nav/></main>
}
