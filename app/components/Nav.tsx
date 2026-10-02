'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

const items=[
  {href:'/',label:'Matcher'},
  {href:'/players',label:'Spelare'},
  {href:'/schedule',label:'Schema'},
  {href:'/settings',label:'Inställningar'},
]

export default function Nav(){
  const path=usePathname()
  return <nav>{items.map(item=>{
    const active=item.href==='/'?path==='/' : path.startsWith(item.href)
    return <Link key={item.href} href={item.href} className={active?'active':''}>{item.label}</Link>
  })}</nav>
}
