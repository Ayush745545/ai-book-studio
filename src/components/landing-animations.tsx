"use client";

/* ── Book Craft Animation ──
   Shows pages assembling into a book, then a cover wrapping around it. */
export function BookCraftAnimation() {
  return (
    <div className="relative mx-auto h-48 w-64 flex items-center justify-center">
      <svg viewBox="0 0 260 200" className="w-full h-full" fill="none">
        <defs>
          <linearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fafaf9" />
            <stop offset="100%" stopColor="#e7e5e4" />
          </linearGradient>
        </defs>

        <style>{`
          @keyframes pageStack1 {
            0%   { opacity:0; transform: translateY(-60px) rotate(-15deg); }
            15%  { opacity:1; transform: translateY(0) rotate(0deg); }
            100% { opacity:1; transform: translateY(0) rotate(0deg); }
          }
          @keyframes pageStack2 {
            0%,10%  { opacity:0; transform: translateY(-60px) rotate(10deg); }
            25%     { opacity:1; transform: translateY(0) rotate(0deg); }
            100%    { opacity:1; transform: translateY(0) rotate(0deg); }
          }
          @keyframes pageStack3 {
            0%,20%  { opacity:0; transform: translateY(-60px) rotate(-8deg); }
            35%     { opacity:1; transform: translateY(0) rotate(0deg); }
            100%    { opacity:1; transform: translateY(0) rotate(0deg); }
          }
          @keyframes coverWrap {
            0%,40%  { opacity:0; transform: scaleX(0); }
            55%     { opacity:1; transform: scaleX(1); }
            100%    { opacity:1; transform: scaleX(1); }
          }
          @keyframes titleFade {
            0%,55%  { opacity:0; }
            70%     { opacity:1; }
            100%    { opacity:1; }
          }
          @keyframes sparkle1 {
            0%,60%  { opacity:0; transform: scale(0); }
            70%     { opacity:1; transform: scale(1); }
            85%     { opacity:0; transform: scale(1.5); }
            100%    { opacity:0; }
          }
          @keyframes sparkle2 {
            0%,65%  { opacity:0; transform: scale(0); }
            75%     { opacity:1; transform: scale(1); }
            90%     { opacity:0; transform: scale(1.5); }
            100%    { opacity:0; }
          }
          .pg1 { animation: pageStack1 4s ease-out infinite; transform-origin: center; }
          .pg2 { animation: pageStack2 4s ease-out infinite; transform-origin: center; }
          .pg3 { animation: pageStack3 4s ease-out infinite; transform-origin: center; }
          .cover { animation: coverWrap 4s ease-out infinite; transform-origin: left center; }
          .book-title { animation: titleFade 4s ease-out infinite; }
          .sp1 { animation: sparkle1 4s ease-out infinite; transform-origin: center; }
          .sp2 { animation: sparkle2 4s ease-out infinite; transform-origin: center; }
        `}</style>

        {/* Pages flying in and stacking */}
        <g className="pg1">
          <rect x="90" y="50" width="80" height="110" rx="2" fill="url(#pageGrad)" stroke="#d6d3d1" strokeWidth="1" />
          <line x1="100" y1="68" x2="158" y2="68" stroke="#d4d4d8" strokeWidth="1.5" />
          <line x1="100" y1="78" x2="148" y2="78" stroke="#d4d4d8" strokeWidth="1.5" />
          <line x1="100" y1="88" x2="155" y2="88" stroke="#d4d4d8" strokeWidth="1.5" />
          <line x1="100" y1="98" x2="140" y2="98" stroke="#d4d4d8" strokeWidth="1.5" />
        </g>
        <g className="pg2">
          <rect x="92" y="48" width="80" height="110" rx="2" fill="url(#pageGrad)" stroke="#d6d3d1" strokeWidth="1" />
          <line x1="102" y1="66" x2="160" y2="66" stroke="#d4d4d8" strokeWidth="1.5" />
          <line x1="102" y1="76" x2="150" y2="76" stroke="#d4d4d8" strokeWidth="1.5" />
          <line x1="102" y1="86" x2="157" y2="86" stroke="#d4d4d8" strokeWidth="1.5" />
        </g>
        <g className="pg3">
          <rect x="94" y="46" width="80" height="110" rx="2" fill="url(#pageGrad)" stroke="#d6d3d1" strokeWidth="1" />
          <line x1="104" y1="64" x2="162" y2="64" stroke="#d4d4d8" strokeWidth="1.5" />
          <line x1="104" y1="74" x2="152" y2="74" stroke="#d4d4d8" strokeWidth="1.5" />
        </g>

        {/* Cover wrapping around */}
        <g className="cover">
          <rect x="86" y="42" width="90" height="120" rx="4" fill="url(#coverGrad)" opacity="0.95" />
          {/* Spine */}
          <rect x="86" y="42" width="8" height="120" rx="2" fill="#6366f1" />
        </g>

        {/* Title on cover */}
        <g className="book-title">
          <rect x="102" y="70" width="60" height="4" rx="1" fill="white" opacity="0.8" />
          <rect x="110" y="80" width="44" height="3" rx="1" fill="white" opacity="0.5" />
          <rect x="115" y="88" width="34" height="3" rx="1" fill="white" opacity="0.4" />
        </g>

        {/* Sparkles */}
        <g className="sp1">
          <circle cx="190" cy="55" r="3" fill="#fbbf24" />
          <line x1="190" y1="48" x2="190" y2="44" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="196" y1="52" x2="199" y2="49" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="196" y1="58" x2="199" y2="61" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="sp2">
          <circle cx="75" cy="70" r="2.5" fill="#a78bfa" />
          <line x1="75" y1="64" x2="75" y2="61" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="70" y1="67" x2="67" y2="64" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

/* ── Book Deliver Home Animation ──
   Shows a book sliding into a box, box closing, truck driving to a house. */
export function BookDeliverAnimation() {
  return (
    <div className="relative mx-auto h-56 w-full max-w-lg flex items-center justify-center overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm">
      <svg viewBox="0 0 500 200" className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="truckGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        <style>{`
          @keyframes bookIntoBox {
            0%    { transform: translateY(-50px) scale(0.9); opacity:0; }
            15%   { transform: translateY(0) scale(1); opacity:1; }
            100%  { transform: translateY(0); opacity:1; }
          }
          @keyframes boxLidClose {
            0%,15%  { transform: rotateX(90deg); }
            25%     { transform: rotateX(0deg); }
            100%    { transform: rotateX(0deg); }
          }
          @keyframes truckDrive {
            0%,28%  { transform: translateX(-250px); }
            45%     { transform: translateX(0px); }
            65%     { transform: translateX(0px); }
            90%     { transform: translateX(300px); }
            100%    { transform: translateX(300px); }
          }
          @keyframes boxOntoTruck {
            0%,23%  { opacity:1; transform: translateY(0); }
            33%     { opacity:0; transform: translateY(-15px) scale(0.8); }
            100%    { opacity:0; }
          }
          @keyframes wheelSpin {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes houseAppear {
            0%,55%  { opacity:0.1; transform: scale(0.95); }
            75%     { opacity:1; transform: scale(1); }
            100%    { opacity:1; transform: scale(1); }
          }
          @keyframes doorOpen {
            0%,70%  { transform: scaleX(1); fill: #78716c; }
            80%     { transform: scaleX(0.2); fill: #292524; }
            100%    { transform: scaleX(0.2); fill: #292524; }
          }
          @keyframes packageDrop {
            0%,75%  { opacity:0; transform: translate(-10px, -20px) rotate(-10deg); }
            85%     { opacity:1; transform: translate(0, 0) rotate(0deg); }
            100%    { opacity:1; transform: translate(0, 0) rotate(0deg); }
          }
          @keyframes smokePuff {
            0%,45%  { opacity:0; }
            50%     { opacity:0.5; transform: translate(0,0) scale(1); }
            65%     { opacity:0; transform: translate(-20px,-15px) scale(2.5); }
            100%    { opacity:0; }
          }
          @keyframes cloudDrift {
            0%   { transform: translateX(-50px); }
            100% { transform: translateX(550px); }
          }
          @keyframes roadMove {
            0%   { stroke-dashoffset: 40; }
            100% { stroke-dashoffset: 0; }
          }
          
          .book-drop   { animation: bookIntoBox 8s ease-out infinite; }
          .box-lid     { animation: boxLidClose 8s ease-out infinite; transform-origin: center top; }
          .box-fade    { animation: boxOntoTruck 8s ease-out infinite; }
          .truck       { animation: truckDrive 8s ease-in-out infinite; }
          .wh1         { animation: wheelSpin 0.6s linear infinite; transform-origin: center; }
          .wh2         { animation: wheelSpin 0.6s linear infinite; transform-origin: center; }
          .house       { animation: houseAppear 8s ease-out infinite; transform-origin: 430px 170px; }
          .door        { animation: doorOpen 8s ease-out infinite; transform-origin: right center; }
          .pkg         { animation: packageDrop 8s ease-out infinite; }
          .smoke       { animation: smokePuff 8s ease-out infinite; }
          .cloud1      { animation: cloudDrift 20s linear infinite; }
          .cloud2      { animation: cloudDrift 35s linear infinite reverse; }
          .road-line   { animation: roadMove 1s linear infinite; }
        `}</style>

        {/* ── Background Scenery ── */}
        <circle cx="420" cy="50" r="24" fill="url(#sunGrad)" opacity="0.9" />
        <g className="cloud1" opacity="0.4" fill="#e4e4e7">
          <circle cx="100" cy="60" r="12" />
          <circle cx="115" cy="55" r="16" />
          <circle cx="130" cy="60" r="12" />
          <rect x="100" y="60" width="30" height="12" />
        </g>
        <g className="cloud2" opacity="0.3" fill="#e4e4e7">
          <circle cx="250" cy="30" r="10" />
          <circle cx="265" cy="25" r="14" />
          <circle cx="280" cy="30" r="10" />
          <rect x="250" y="30" width="30" height="10" />
        </g>

        {/* Road and ground */}
        <rect x="0" y="170" width="500" height="30" fill="#27272a" />
        <line x1="0" y1="170" x2="500" y2="170" stroke="#3f3f46" strokeWidth="2" />

        {/* ── Phase 1: Book drops into box (left side) ── */}
        <g className="box-fade">
          {/* Book */}
          <g className="book-drop">
            <rect x="60" y="110" width="34" height="46" rx="2" fill="#818cf8" stroke="#4f46e5" strokeWidth="1" />
            <rect x="60" y="110" width="6" height="46" rx="1" fill="#4f46e5" />
            <rect x="72" y="120" width="16" height="2" rx="1" fill="white" opacity="0.9" />
            <rect x="72" y="126" width="12" height="1.5" rx="1" fill="white" opacity="0.6" />
          </g>
          {/* Gift Box body */}
          <rect x="48" y="125" width="54" height="45" rx="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
          {/* Gift Ribbon Vertical */}
          <rect x="70" y="125" width="10" height="45" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
          {/* Gift Box lid */}
          <g className="box-lid">
            <rect x="45" y="122" width="60" height="8" rx="2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
            {/* Bow on lid */}
            <path d="M 68 122 C 60 110, 75 110, 75 122 C 75 110, 90 110, 82 122" fill="none" stroke="#fde047" strokeWidth="3" />
          </g>
        </g>

        {/* ── Phase 2: Truck drives across ── */}
        <g className="truck">
          {/* Exhaust smoke */}
          <circle cx="150" cy="160" r="5" fill="#a1a1aa" className="smoke" />
          <circle cx="140" cy="155" r="7" fill="#a1a1aa" className="smoke" style={{animationDelay: '0.2s'}} />
          
          {/* Truck Body */}
          <rect x="155" y="115" width="75" height="45" rx="5" fill="url(#truckGrad)" stroke="#3730a3" strokeWidth="1" />
          <line x1="155" y1="140" x2="230" y2="140" stroke="#4f46e5" strokeWidth="2" opacity="0.5" />
          
          {/* Cabin */}
          <path d="M230 125 L255 125 C 262 125, 268 132, 268 140 L268 160 L230 160 Z" fill="#4338ca" />
          {/* Windshield */}
          <path d="M236 128 L252 128 C 255 128, 258 132, 259 135 L260 142 L236 142 Z" fill="#bfdbfe" opacity="0.8" />
          {/* Headlight & Taillight */}
          <circle cx="265" cy="150" r="2" fill="#fef08a" />
          <polygon points="267,148 280,140 280,160" fill="#fef08a" opacity="0.3" />
          <rect x="153" y="145" width="3" height="8" fill="#ef4444" />
          
          {/* Package on truck (Gift Box) */}
          <rect x="175" y="125" width="24" height="20" rx="2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
          <rect x="185" y="125" width="4" height="20" fill="#fde047" />
          <path d="M 183 125 C 180 118, 187 118, 187 125 C 187 118, 194 118, 191 125" fill="none" stroke="#fde047" strokeWidth="1.5" />
          
          {/* Wheels (solid, no spinning dots) */}
          <circle cx="185" cy="170" r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="245" cy="170" r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
        </g>

        {/* ── Phase 3: House with delivered package ── */}
        <g className="house">
          {/* Trees / Bushes */}
          <circle cx="380" cy="160" r="12" fill="#166534" />
          <circle cx="390" cy="155" r="16" fill="#15803d" />
          <circle cx="485" cy="160" r="14" fill="#166534" />

          {/* House body */}
          <rect x="400" y="105" width="75" height="65" rx="2" fill="#e7e5e4" stroke="#a8a29e" strokeWidth="1.5" />
          {/* Roof */}
          <polygon points="392,107 437,70 483,107" fill="#dc2626" stroke="#b91c1c" strokeWidth="2" strokeLinejoin="round" />
          {/* Window */}
          <rect x="412" y="122" width="16" height="16" rx="1" fill="#fef08a" stroke="#d6d3d1" strokeWidth="1.5" />
          <line x1="420" y1="122" x2="420" y2="138" stroke="#d6d3d1" strokeWidth="1.5" />
          <line x1="412" y1="130" x2="428" y2="130" stroke="#d6d3d1" strokeWidth="1.5" />
          {/* Door */}
          <rect x="442" y="125" width="20" height="45" rx="1" fill="#78716c" className="door" />
          <circle cx="445" cy="148" r="2" fill="#d6d3d1" />
          {/* Chimney */}
          <rect x="452" y="75" width="10" height="24" fill="#a8a29e" stroke="#78716c" strokeWidth="1" />
          <circle cx="457" cy="65" r="4" fill="#d6d3d1" opacity="0.6" className="smoke" style={{animationDelay: '1s'}} />
        </g>

        {/* Delivered package (Gift Box) */}
        <g className="pkg">
          <rect x="428" y="152" width="20" height="16" rx="2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
          <rect x="436" y="152" width="4" height="16" fill="#fde047" />
          <path d="M 434 152 C 430 146, 438 146, 438 152 C 438 146, 446 146, 442 152" fill="none" stroke="#fde047" strokeWidth="1.5" />
          
          {/* Heart / checkmark */}
          <path d="M434 161 L437 164 L443 157" stroke="#22c55e" strokeWidth="2.5" fill="none" />
        </g>
      </svg>
    </div>
  );
}
