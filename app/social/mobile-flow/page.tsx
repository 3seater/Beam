'use client';

import { BeamFlowFrame } from '@/components/BeamFlowFrame';
import { BeamSentReceipt } from '@/components/BeamSentReceipt';
import { BeamGiftCard } from '@/components/BeamGiftCard';
import { ClaimButton } from '@/app/claim/ClaimButton';
import { AssetChip } from '@/app/send/SendPageClient';
import { DollarAmountInput } from '@/components/CreateBeamModal/DollarAmountInput';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import './mobile.css';

const names = {home:'Homepage',asset:'Select an asset',amount:'Set an amount',send:'Share your Beam',claim:'Claim your Beam'};
const nvda = {type:'erc20' as const,address:'0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC' as `0x${string}`,symbol:'NVDA',name:'NVIDIA',decimals:18,logoUrl:'/social/hires/nvda.png'};
function AmountScreen(){
  const [value,setValue]=useState('');
  const [tokenAmount,setTokenAmount]=useState<string|null>(null);
  const [error,setError]=useState<string|null>('Please enter an amount');
  return <><div className="beam-send-mode" role="tablist" aria-label="Beam type"><button role="tab" aria-selected>Single asset</button><button role="tab" aria-selected={false}>Spectrum <span>Bundle</span></button></div><BeamFlowFrame title="Set an amount" onBack={()=>{}}><div className="flex flex-col gap-5 flex-1"><AssetChip asset={nvda} onClick={()=>{}}/><DollarAmountInput dollarValue={value} onChange={setValue} onTokenAmount={setTokenAmount} onError={setError} selectedAsset={nvda}/><div className="mt-auto pt-2"><Button variant="primary" size="lg" disabled={error!==null || tokenAmount===null || !(Number(value)>0)} rightIcon={<ArrowLeft size={18} className="rotate-180" aria-hidden="true"/>} className="w-full !justify-center !py-4">Continue</Button></div></div></BeamFlowFrame></>;
}
const source = (screen:string) => screen==='home' ? '/' : screen==='asset' ? '/send' : `/social/mobile-flow?screen=${screen}&inner=1`;
export default function MobileFlow({searchParams}:{searchParams:{screen?:string;inner?:string}}){
  const screen=searchParams.screen as keyof typeof names;
  if(!names[screen]) return <main className="mobile-flow-gallery"><h1>Beam / Mobile flow</h1><p>Live mobile homepage and asset picker. Share and claim use production layouts with demo data.</p><div>{Object.entries(names).map(([key,name],i)=><a key={key} href={`?screen=${key}`}><span>{String(i+1).padStart(2,'0')} / {name}</span><iframe title={name} src={source(key)}/></a>)}</div></main>;
  if(searchParams.inner!=='1') return <main className="mobile-export"><iframe title={names[screen]} src={source(screen)}/></main>;
  if(screen==='amount') return <div className="mobile-production-demo"><AmountScreen/></div>;
  return <div className="mobile-production-demo">
    {screen==='send' ? <BeamFlowFrame title="Your Beam is ready" finished onBack={()=>{}}><div className="flex flex-col gap-5 flex-1"><BeamSentReceipt amount="$100" symbol="NVDA" logoUrl="/social/hires/nvda.png" beamLink="https://usebe.am/claim#demo" onSendAnother={()=>{}}/></div></BeamFlowFrame> : <main className="app-page beam-flow-page claim-page min-h-screen flex flex-col items-center px-4 py-28 gap-8"><div className="claim-receive-shell w-full flex flex-col gap-5"><h1 className="receipt-heading">Claim your Beam.</h1><div className="w-full"><div className="claim-deposit" role="region" aria-label="Deposit details"><BeamGiftCard amount="$100" symbol="NVDA" logoUrl="/social/hires/nvda.png" label="A little something for you" status="Ready to claim"/><div className="claim-sender"><span>From</span><span>0x1234…5678</span></div></div></div><div className="w-full"><ClaimButton claimStep="idle" error={null} alreadyClaimed={false} onClaim={()=>{}}/></div></div></main>}
  </div>;
}
