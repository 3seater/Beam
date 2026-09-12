'use client';

import { BeamGiftCard } from './BeamGiftCard';
import { BeamLinkDisplay } from './CreateBeamModal/BeamLinkDisplay';
import { ArrowUpRight } from 'lucide-react';

export function BeamSentReceipt({ beamLink, amount, symbol, logoUrl, warning, onSendAnother }: { beamLink: string; warning?: string | null; amount?: string; symbol?: string; logoUrl?: string; onSendAnother: () => void }) {
  return <div className="beam-receipt">
    <h1 className="receipt-heading">Your Beam is ready.</h1>
    <BeamGiftCard amount={amount} symbol={symbol} logoUrl={logoUrl} />
    {warning && <p role="alert" className="text-sm">{warning}</p>}
    <BeamLinkDisplay beamLink={beamLink} />
    <button type="button" className="receipt-another" onClick={onSendAnother}>Send another Beam <ArrowUpRight size={14} /></button>
  </div>;
}
