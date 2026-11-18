import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import type { TrafficState, LaneId, Vehicle } from '../types';

interface TrafficMapProps {
  state: TrafficState;
}

const TrafficMap: React.FC<TrafficMapProps> = ({ state }) => {
  const getVehiclePos = (v: Vehicle) => {
    const p = v.progress;
    let curX = 50, curY = 50;
    
    // Determine Turn Type for Lane Assignment
    const isLeft = (v.lane === 'NORTH' && v.targetLane === 'EAST') || 
                  (v.lane === 'SOUTH' && v.targetLane === 'WEST') || 
                  (v.lane === 'WEST' && v.targetLane === 'NORTH') || 
                  (v.lane === 'EAST' && v.targetLane === 'SOUTH');

    const isStraight = (v.lane === 'NORTH' && v.targetLane === 'SOUTH') || 
                      (v.lane === 'SOUTH' && v.targetLane === 'NORTH') || 
                      (v.lane === 'WEST' && v.targetLane === 'EAST') || 
                      (v.lane === 'EAST' && v.targetLane === 'WEST');

    const isRight = !isLeft && !isStraight;

    // 3-LANE LHT/RHT HYBRID SETUP
    // NS: Incoming Right, Outgoing Left (LHT)
    // EW: Incoming Left, Outgoing Right (RHT - requested swap)
    
    let incomingOffset = 7.0; 
    if (isLeft) incomingOffset = 10.5;
    else if (isRight) incomingOffset = 3.5;

    const outgoingOffset = 7.0;

    const stopLine = 0.35;
    const exitLine = 0.65;

    // Segment 1: Approach 
    if (p <= stopLine) {
      const relP = p / stopLine; 
      if (v.lane === 'NORTH') { curX = 50 + incomingOffset; curY = relP * 35; } 
      else if (v.lane === 'SOUTH') { curX = 50 - incomingOffset; curY = 100 - (relP * 35); }
      // SWAPPED EW as requested
      else if (v.lane === 'WEST') { curX = relP * 35; curY = 50 - incomingOffset; }
      else if (v.lane === 'EAST') { curX = 100 - (relP * 35); curY = 50 + incomingOffset; }
    } 
    // Segment 2: Intersection
    else if (p <= exitLine) {
      const relP = (p - stopLine) / (exitLine - stopLine); 
      
      let startX = 0, startY = 0, endX = 0, endY = 0;
      if (v.lane === 'NORTH') { startX = 50 + incomingOffset; startY = 35; }
      else if (v.lane === 'SOUTH') { startX = 50 - incomingOffset; startY = 65; }
      // SWAPPED EW
      else if (v.lane === 'WEST') { startX = 35; startY = 50 - incomingOffset; }
      else if (v.lane === 'EAST') { startX = 65; startY = 50 + incomingOffset; }

      // Exit lanes
      if (v.targetLane === 'SOUTH') { endX = 50 + outgoingOffset; endY = 65; }
      else if (v.targetLane === 'NORTH') { endX = 50 - outgoingOffset; endY = 35; } 
      // SWAPPED EW target exit side
      else if (v.targetLane === 'WEST') { endX = 35; endY = 50 + outgoingOffset; }
      else if (v.targetLane === 'EAST') { endX = 65; endY = 50 - outgoingOffset; }

      // Roundabout via Concentric Rings (Clockwise direction)
      const radius = isStraight ? 12 : 8;
      const angleStart = Math.atan2(startY - 50, startX - 50);
      const angleEnd = Math.atan2(endY - 50, endX - 50);
      
      let diff = angleEnd - angleStart;
      while (diff <= 0) diff += 2 * Math.PI; 
      
      const currentAngle = angleStart + diff * relP;
      curX = 50 + Math.cos(currentAngle) * radius;
      curY = 50 + Math.sin(currentAngle) * radius;
    }
    // Segment 3: Exit
    else {
      const relP = (p - exitLine) / (1 - exitLine); 
      if (v.targetLane === 'SOUTH') { curX = 50 + outgoingOffset; curY = 65 + (relP * 35); }
      else if (v.targetLane === 'NORTH') { curX = 50 - outgoingOffset; curY = 35 - (relP * 35); }
      // SWAPPED EW exit lanes
      else if (v.targetLane === 'EAST') { curX = 65 + (relP * 35); curY = 50 - outgoingOffset; }
      else if (v.targetLane === 'WEST') { curX = 35 - (relP * 35); curY = 50 + outgoingOffset; }
    }

    return { x: curX, y: curY };
  };

  const getVehicleRotation = (v: Vehicle) => {
    const p = v.progress;
    const pos = getVehiclePos(v);
    
    // Look ahead for tangent calculation
    const aheadP = Math.min(1, p + 0.02);
    const posAhead = getVehiclePos({ ...v, progress: aheadP });
    
    const dx = posAhead.x - pos.x;
    const dy = posAhead.y - pos.y;
    
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 0;
    
    // Degrees: forward facing (Offset by 180 because emoji faces left by default)
    return ((Math.atan2(dy, dx) * 180) / Math.PI) + 180;
  };

  return (
    <div className="relative w-full aspect-square bg-[#f8fafc] rounded-2xl overflow-hidden border border-slate-200 shadow-xl road-texture">
      {/* SUMO Style Map Rendering */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
           {/* Main Road Foundations (Dark Asphalt) */}
           <g stroke="#1e293b" strokeWidth="24" strokeLinecap="butt" fill="none">
             <path d="M 0 50 L 100 50" />
             <path d="M 50 0 L 50 100" />
           </g>

           {/* Roundabout Asphalt base */}
           <circle cx="50" cy="50" r="18" fill="#1e293b" />
           <circle cx="50" cy="50" r="6" fill="#f8fafc" /> {/* Island center */}

           {/* White Lane Markings (Dashed) - Adjusted for NS LHT and EW RHT */}
           <g stroke="white" strokeWidth="0.3" strokeDasharray="1 1" fill="none" className="opacity-40">
              {/* Vertical Roads: NS Incoming Right / Outgoing Left */}
              <path d="M 53.5 0 L 53.5 32" />
              <path d="M 57 0 L 57 32" />
              <path d="M 60.5 0 L 60.5 32" /> 
              <path d="M 43 0 L 43 32" />

              <path d="M 46.5 68 L 46.5 100" />
              <path d="M 43 68 L 43 100" />
              <path d="M 39.5 68 L 39.5 100" />
              <path d="M 57 68 L 57 100" />

              {/* Horizontal Roads: SWAPPED EW (Incoming Left / Outgoing Right from junction perspective) */}
              {/* West road: y < 50 is Incoming, y > 50 is Outgoing */}
              <path d="M 0 46.5 L 32 46.5" />
              <path d="M 0 43 L 32 43" />
              <path d="M 0 39.5 L 32 39.5" />
              <path d="M 0 57 L 32 57" />

              {/* East road: y > 50 is Incoming, y < 50 is Outgoing */}
              <path d="M 68 53.5 L 100 53.5" />
              <path d="M 68 57 L 100 57" />
              <path d="M 68 60.5 L 100 60.5" />
              <path d="M 68 43 L 100 43" />
              
              {/* Concentric Roundabout Markings */}
              <circle cx="50" cy="50" r="10" />
              <circle cx="50" cy="50" r="14" />
           </g>

           {/* Central Median Lines for road division */}
           <g stroke="white" strokeWidth="0.4" fill="none" className="opacity-80">
              <path d="M 50 0 L 50 32" />
              <path d="M 50 68 L 50 100" />
              <path d="M 0 50 L 32 50" />
              <path d="M 68 50 L 100 50" />
           </g>
        </svg>

        {/* Central Island Detail */}
        <div className="absolute w-[12%] h-[12%] bg-white rounded-full z-0 shadow-lg border-2 border-slate-200 flex items-center justify-center">
           <div className="w-1/2 h-1/2 bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* North */}
      <LightIndicator state={state.lanes.NORTH.light} className="top-[32%] left-[50%] translate-x-12" />
      {/* South */}
      <LightIndicator state={state.lanes.SOUTH.light} className="bottom-[32%] left-[50%] -translate-x-12" />
      {/* East */}
      <LightIndicator state={state.lanes.EAST.light} className="right-[32%] top-[50%] translate-y-12 flex-row" />
      {/* West */}
      <LightIndicator state={state.lanes.WEST.light} className="left-[32%] top-[50%] -translate-y-12 flex-row" />

      {/* Labels */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-slate-400 text-[10px] mono font-bold tracking-widest uppercase opacity-60">Phase Alpha</div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-[10px] mono font-bold tracking-widest uppercase opacity-60">Phase Omega</div>

      {/* Vehicles */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {state.vehicles.map((v) => {
            const { x, y } = getVehiclePos(v);
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  left: `${x}%`, 
                  top: `${y}%`,
                  opacity: 1, 
                  scale: 1,
                  rotate: getVehicleRotation(v)
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ 
                  left: { duration: 0.12, ease: "linear" },
                  top: { duration: 0.12, ease: "linear" },
                  rotate: { duration: 0 }, // Instant rotation to prevent spinning animation
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                className={cn(
                  "absolute w-8 h-8 flex items-center justify-center text-3xl -translate-x-1/2 -translate-y-1/2 drop-shadow-md",
                  v.isEmergency && "z-20"
                )}
                style={{ willChange: "left, top, transform" }}
              >
                {v.isEmergency && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 0.2, repeat: Infinity }}
                      className="absolute w-10 h-10 bg-red-500/30 rounded-full blur-md"
                    />
                  </div>
                )}
                <span className={cn(v.isEmergency && "animate-pulse")}>{v.type}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Preemption Indicator */}
      <AnimatePresence>
        {state.emergencyPreemption?.active && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120px] z-50 pointer-events-none"
          >
            <div className="bg-red-600/90 text-white px-4 py-2 rounded-lg border-2 border-white/20 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-3">
              <span className="w-3 h-3 bg-white rounded-full animate-ping" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Emergency Override</span>
                <span className="text-[8px] mono font-bold text-red-100 uppercase italic">Clearing Corridor: {state.emergencyPreemption.lane}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 right-4 text-[9px] mono text-slate-700 tracking-tighter">CANVAS_OVERLAY_BETA</div>
    </div>
  );
};

const LightIndicator = ({ state, className, flexRow = false }: { state: 'GREEN' | 'YELLOW' | 'RED', className: string, flexRow?: boolean }) => {
  return (
    <div className={`absolute z-30 flex ${flexRow ? 'flex-row h-5 px-1' : 'flex-col w-5 py-1'} gap-1.5 bg-white rounded-full border-2 border-slate-200 items-center justify-center shadow-sm ${className}`}>
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${state === 'RED' ? 'bg-red-500 glow-red' : 'bg-slate-100'}`} />
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${state === 'YELLOW' ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : 'bg-slate-100'}`} />
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${state === 'GREEN' ? 'bg-emerald-500 glow-green' : 'bg-slate-100'}`} />
    </div>
  );
}

export default TrafficMap;
