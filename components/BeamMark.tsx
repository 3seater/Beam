import { useId } from 'react';
const SHAPE = 'M413.01,112.99l-3,191.01,193.7-65.86c2.77-.17,2.93,5.64,4.15,7.56l-.84,1.75-170.99,123.04,125.8,124.99-5.83,8.07-170.98-67.56-67.9,191.38-8.47.48,1.36-191.86-194.52,67.86-3.53-8.35,1.08-2,169.91-123.16-124.81-124.65c2.48-2.29,4.09-7.83,7.9-7.32l168.95,65.58,67.14-190.86,10.91-.11Z';
export function BeamOutline({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="75 75 590 590" fill="none" className={className} aria-hidden="true">
      <path d={SHAPE} stroke="#9be7fd" strokeWidth="9" strokeLinejoin="round" opacity=".22" />
      <path className="beam-loader-trace" d={SHAPE} pathLength="100" stroke="#38a0e1" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BeamMark({
  sculptural = false,
  className = ''
}: {
  sculptural?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="75 75 590 590" fill="none" className={className} aria-hidden="true">{sculptural ? <><defs><linearGradient id={`${id}face`} x1="190" y1="140" x2="490" y2="580" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset=".23" stopColor="#ddf7ff" /><stop offset=".44" stopColor="#9be7fd" /><stop offset=".53" stopColor="#eefcff" /><stop offset=".7" stopColor="#79d6fc" /><stop offset="1" stopColor="#d5f4fe" /></linearGradient><linearGradient id={`${id}edge`} x1="180" y1="180" x2="480" y2="600" gradientUnits="userSpaceOnUse"><stop stopColor="#eefcff" /><stop offset=".5" stopColor="#38a0e1" /><stop offset="1" stopColor="#247db5" /></linearGradient></defs>{Array.from({
        length: 18
      }, (_, i) => <path key={i} d={SHAPE} transform={`translate(${(18 - i) * .6} ${(18 - i) * 1.1})`} fill={`url(#${id}edge)`} />)}<path d={SHAPE} fill={`url(#${id}face)`} stroke="#effbff" strokeWidth="2" strokeLinejoin="round" /></> : <path d={SHAPE} fill="currentColor" />}</svg>;
}
