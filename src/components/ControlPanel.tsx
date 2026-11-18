import React from 'react';
import type { TrafficState, LaneId } from '../types';
import { cn } from '../lib/utils';

interface ControlPanelProps {
  state: TrafficState;
  onToggleAi: (enabled: boolean) => void;
  onManualLaneSwitch: (lane: LaneId) => void;
  onSpawnEmergency: (lane: LaneId) => void;
  onRefreshData: () => void;
  onIncreaseTraffic: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  state, 
  onToggleAi, 
  onManualLaneSwitch, 
  onSpawnEmergency,
  onRefreshData,
  onIncreaseTraffic
}) => {
  return (
    <div className="bg-white flex flex-col space-y-6">
      {/* Global Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onRefreshData} className="px-2 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-emerald-600 hover:text-white shadow-sm">Refresh Data</button>
        <button onClick={onIncreaseTraffic} className="px-2 py-2 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-amber-600 hover:text-white shadow-sm">Rush Hour</button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-[10px] mono text-slate-500 uppercase tracking-widest">Control Mode</label>
          {state.emergencyPreemption?.active && (
            <span className="text-[9px] mono text-red-600 font-bold animate-pulse px-2 py-0.5 bg-red-50 border border-red-200 rounded">
              PREEMPTION_ACTIVE
            </span>
          )}
        </div>
        <div className="flex p-1 bg-slate-50 rounded-lg border border-slate-200">
          <button
            onClick={() => onToggleAi(true)}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all",
              state.isAiEnabled 
                ? "bg-white text-sky-600 shadow-sm border border-slate-200" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            AI AUTOMATED
          </button>
          <button
            onClick={() => onToggleAi(false)}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all",
              !state.isAiEnabled 
                ? "bg-white text-sky-600 shadow-sm border border-slate-200" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            MANUAL OVERRIDE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as LaneId[]).map(lane => (
          <ManualControlButton 
            key={lane}
            label={`${lane} LIGHT`} 
            active={state.lanes[lane].light === 'GREEN'} 
            disabled={state.isAiEnabled || state.emergencyPreemption?.active}
            onClick={() => onManualLaneSwitch(lane)} 
          />
        ))}
      </div>

      <div className="space-y-3">
        <label className="text-[10px] mono text-slate-500 uppercase tracking-widest">Simulation Injection</label>
        <div className="grid grid-cols-4 gap-2">
          {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as LaneId[]).map(lane => (
            <button
              key={lane}
              onClick={() => onSpawnEmergency(lane)}
              className="group relative h-10 bg-white border border-slate-200 rounded-lg hover:border-red-400/50 transition-all flex items-center justify-center overflow-hidden shadow-sm"
              title={`Spawn Emergency (Ambulance) in ${lane}`}
            >
              <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors" />
              <span className="text-lg group-hover:scale-125 transition-transform">🚑</span>
              <span className="absolute bottom-1 right-1 text-[7px] mono text-slate-400 font-bold uppercase">{lane.charAt(0)}</span>
            </button>
          ))}
        </div>
        <p className="text-[9px] mono text-slate-500 leading-tight">TIP: Spawn an ambulance to trigger the priority override logic.</p>
      </div>
    </div>
  );
};

const ManualControlButton = ({ label, active, disabled, onClick }: { label: string, active: boolean, disabled: boolean, onClick: () => void }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "relative h-16 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm",
      disabled ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-100" : "cursor-pointer",
      active 
        ? "bg-emerald-50 border-emerald-500/30" 
        : "bg-white border-slate-200 hover:border-slate-300"
    )}
  >
    <div className={cn(
      "w-2 h-2 rounded-full",
      active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
    )} />
    <span className={cn("text-[10px] mono font-bold", active ? "text-emerald-700" : "text-slate-500")}>{label}</span>
  </button>
);

export default ControlPanel;
