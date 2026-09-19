export function HeroAnimation() {
  return (
    <div className="relative mx-auto mb-8 h-32 w-full max-w-sm overflow-hidden flex justify-center items-end border-b border-white/5 pb-2">
      <svg viewBox="0 0 400 120" className="w-full h-full text-zinc-400 stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <style>{`
          /* Walking animation */
          @keyframes walkIn {
            0% { transform: translateX(-150px); opacity: 0; }
            5% { opacity: 1; }
            30% { transform: translateX(0px); }
            100% { transform: translateX(0px); }
          }
          
          /* Leg movement */
          @keyframes legSwing {
            0%, 30% { transform: rotate(0deg); }
            0% { transform: rotate(-20deg); }
            5% { transform: rotate(20deg); }
            10% { transform: rotate(-20deg); }
            15% { transform: rotate(20deg); }
            20% { transform: rotate(-20deg); }
            25% { transform: rotate(20deg); }
            30%, 100% { transform: rotate(0deg); }
          }

          /* Lightbulb */
          @keyframes lightbulbIdea {
            0%, 35% { opacity: 0; transform: translateY(10px) scale(0.5); }
            40% { opacity: 1; transform: translateY(0) scale(1.1); stroke: #fbbf24; }
            45%, 55% { opacity: 1; transform: translateY(0) scale(1); stroke: #fbbf24; }
            60%, 100% { opacity: 0; transform: translateY(-10px) scale(0.8); }
          }

          /* Desk & Laptop */
          @keyframes deskAppear {
            0%, 55% { opacity: 0; transform: translateY(20px); }
            60%, 95% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; }
          }
          
          /* Typing arms */
          @keyframes typing {
            0%, 60% { transform: rotate(0deg); }
            65%, 70%, 75%, 80%, 85%, 90% { transform: rotate(15deg); }
            67.5%, 72.5%, 77.5%, 82.5%, 87.5%, 92.5% { transform: rotate(-5deg); }
            95%, 100% { transform: rotate(0deg); }
          }
          
          /* Reset whole scene */
          @keyframes sceneFade {
            0%, 95% { opacity: 1; }
            98%, 100% { opacity: 0; }
          }

          .scene { animation: sceneFade 6s infinite; }
          .character { animation: walkIn 6s infinite ease-out; transform-origin: center bottom; }
          .leg-l { animation: legSwing 6s infinite alternate; transform-origin: 200px 80px; }
          .leg-r { animation: legSwing 6s infinite alternate-reverse; transform-origin: 200px 80px; }
          .arm-typing { animation: typing 6s infinite; transform-origin: 200px 60px; }
          .lightbulb { animation: lightbulbIdea 6s infinite; transform-origin: 200px 20px; }
          .desk { animation: deskAppear 6s infinite; transform-origin: center bottom; }
        `}</style>
        
        <g className="scene">
          {/* Desk & Laptop (appears later) */}
          <g className="desk">
            <line x1="230" y1="90" x2="280" y2="90" strokeWidth="4" />
            <line x1="235" y1="90" x2="235" y2="120" />
            <line x1="275" y1="90" x2="275" y2="120" />
            {/* Laptop */}
            <path d="M245 90 L260 75 L260 90 Z" fill="currentColor" stroke="none" />
          </g>

          {/* Character */}
          <g className="character">
            {/* Head */}
            <circle cx="200" cy="40" r="12" />
            {/* Body */}
            <line x1="200" y1="52" x2="200" y2="80" />
            {/* Legs */}
            <line x1="200" y1="80" x2="190" y2="110" className="leg-l" />
            <line x1="200" y1="80" x2="210" y2="110" className="leg-r" />
            {/* Arms (typing) */}
            <path d="M200 60 L220 70 L240 85" className="arm-typing" />
          </g>

          {/* Lightbulb (Idea!) */}
          <g className="lightbulb">
            <circle cx="200" cy="15" r="8" />
            <line x1="200" y1="23" x2="200" y2="28" />
            <line x1="196" y1="25" x2="204" y2="25" />
            {/* Rays */}
            <line x1="200" y1="2" x2="200" y2="-3" strokeWidth="2" />
            <line x1="188" y1="8" x2="183" y2="3" strokeWidth="2" />
            <line x1="212" y1="8" x2="217" y2="3" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
}
