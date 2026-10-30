import type { CSSProperties } from 'react';
export function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    external: <><path d="M7 17 17 7M7 7h10v10" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <path d="m9 5 11 7-11 7V5Z" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4M12 17h.01" /></>,
    sound: <><path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
    muted: <><path d="m11 5-6 4H2v6h3l6 4V5ZM16 9l6 6M22 9l-6 6" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    basket: <><path d="m5 10 7-7 7 7M3 10h18l-2 10H5L3 10ZM9 14v3M15 14v3" /></>,
    home: <><path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7" /></>,
    leaf: <><path d="M20 3C7 1 2 8 5 15s16 3 15-12ZM5 19 16 8" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M5 16a8 8 0 0 0 13 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.leaf}</svg>;
}
export function HamsterMark({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="#c5945d"/><circle cx="36" cy="13" r="8" fill="#c5945d"/><circle cx="12" cy="13" r="4.5" fill="#eac1a4"/><circle cx="36" cy="13" r="4.5" fill="#eac1a4"/><path d="M4 28c0-13 9-20 20-20s20 7 20 20c0 12-9 17-20 17S4 40 4 28Z" fill="#d7aa70"/><ellipse cx="24" cy="32" rx="16" ry="12" fill="#fff1d5"/><ellipse cx="16" cy="24" rx="2.5" ry="3.3" fill="#3b362c"/><ellipse cx="32" cy="24" rx="2.5" ry="3.3" fill="#3b362c"/><ellipse cx="24" cy="29" rx="3" ry="2" fill="#a67051"/><path d="M24 31v4m-4 1 4-1 4 1" stroke="#a67051" strokeWidth="1.5" strokeLinecap="round"/><ellipse cx="10" cy="30" rx="4" ry="2.5" fill="#e4ad90"/><ellipse cx="38" cy="30" rx="4" ry="2.5" fill="#e4ad90"/></svg>;
}
export function SeedIcon({ size = 24, className = '', style }: { size?: number; className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} width={size} height={size} viewBox="0 0 28 32" fill="none" aria-hidden="true"><path d="M14 2C2 12 0 23 8 28c3 2 9 2 12 0 8-5 6-16-6-26Z" fill="#efc65c" stroke="#ad7a2f" strokeWidth="1.8"/><path d="M14 9v15" stroke="#fff2b1" strokeWidth="2.5" strokeLinecap="round"/></svg>;
}
export function Wheel({ running, practice }: { running: boolean; practice: boolean }) {
  return <svg className={`wheel-art ${running ? 'is-running' : ''}`} viewBox="0 0 280 176" fill="none" aria-hidden="true">
    <ellipse cx="140" cy="156" rx="91" ry="10" fill="#e1decb"/>
    <path d="m112 149 15-56h28l15 56" stroke="#a5997a" strokeWidth="8" strokeLinecap="round"/>
    <g className="wheel-spokes"><circle cx="140" cy="77" r="63" fill="#f0ebd8" stroke="#aa9a73" strokeWidth="7"/><circle cx="140" cy="77" r="54" stroke="#d7c9a6" strokeWidth="2"/>
      {[0,45,90,135].map(angle=><path key={angle} d="M140 20v114" transform={`rotate(${angle} 140 77)`} stroke="#d6c8a7" strokeWidth="3"/>)}
      <circle cx="140" cy="77" r="7" fill="#ad9a70"/>
    </g>
    <path d="M104 149h72" stroke="#aa9a73" strokeWidth="8" strokeLinecap="round"/>
    <g transform={`translate(${running ? 127 : 126} ${running ? 107 : 115})`}>
      <ellipse cx="12" cy="10" rx="27" ry="18" fill="#c59661"/><ellipse cx="26" cy="4" rx="16" ry="15" fill="#d7aa70"/><circle cx="22" cy="-9" r="7" fill="#c59661"/><circle cx="22" cy="-9" r="3.5" fill="#e9bda0"/>
      <ellipse cx="33" cy="9" rx="10" ry="7" fill="#fff1d5"/>
      {running ? <circle cx="31" cy="1" r="2" fill="#3b362c"/> : <path d="m27 1 4 2 4-2" stroke="#3b362c" strokeWidth="1.7" strokeLinecap="round"/>}
      <circle cx="41" cy="7" r="2" fill="#a87051"/><path d="m-4 21 8-1m17 0 8 1" stroke="#a17a4f" strokeWidth="5" strokeLinecap="round"/>
    </g>
    {!running && <><path d="m188 60 7-1-4 8 7-1m-1-18 9-2-5 10 9-2" stroke="#8f9270" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>}
    {practice && <path d="m214 126 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6Z" fill="#d6b663"/>}
  </svg>;
}
