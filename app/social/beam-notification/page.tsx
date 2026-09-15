import type { Metadata } from 'next';
import { LockKeyhole, Wifi, Signal, BatteryFull, Flashlight, Camera } from 'lucide-react';
import './lockscreen.css';

export const metadata: Metadata = { title:'Beam — Lock screen video reference',robots:{index:false,follow:false} };
export default function BeamNotification({searchParams}:{searchParams:{native?:string}}){
  return <main className={`notification-page${searchParams.native==='1'?' notification-native':''}`}>
    <article className="notification-screen" aria-label="Illustrative iPhone lock screen with a Messages notification from Alex about a Beam">
      <div className="lock-wallpaper"><i/><i/><i/></div>
      <div className="lock-status"><span>9:41</span><div><Signal/><Wifi/><BatteryFull/></div></div>
      <div className="lock-island"/>
      <LockKeyhole className="lock-icon" strokeWidth={2.2}/>
      <div className="lock-date">Monday, September 14</div>
      <div className="lock-time">9:41</div>
      <section className="message-notification" aria-label="Messages notification">
        <div className="message-app"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 11C18.2 11 7 19.8 7 30.7c0 6.4 3.9 12.1 10 15.7l-2.4 8.2 10-4.8c2.3.5 4.8.8 7.4.8 13.8 0 25-8.9 25-19.9S45.8 11 32 11Z" fill="white"/></svg></div>
        <div className="message-body"><div className="message-top"><strong>Alex</strong><span>now</span></div><p>I sent you a Beam 💙</p><p>$100 of NVDA. Tap the link to claim:</p><p className="message-link">usebe.am/claim</p></div>
      </section>
      <div className="lock-actions"><span><Flashlight strokeWidth={1.8}/></span><span><Camera strokeWidth={1.8}/></span></div>
      <div className="lock-swipe">Swipe up to open</div><div className="lock-home-indicator"/>
    </article>
  </main>;
}
