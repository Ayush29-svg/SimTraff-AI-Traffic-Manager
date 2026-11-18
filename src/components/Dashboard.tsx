import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import type { TrafficState } from '../types';

interface DashboardProps {
  state: TrafficState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const chartData = useMemo(() => [
    { name: 'NORTH LANE', density: Math.min(100, state.lanes.NORTH.density * 15) },
    { name: 'SOUTH LANE', density: Math.min(100, state.lanes.SOUTH.density * 15) },
    { name: 'EAST LANE', density: Math.min(100, state.lanes.EAST.density * 15) },
    { name: 'WEST LANE', density: Math.min(100, state.lanes.WEST.density * 15) },
  ], [state]);

  const stats = [
    { label: 'Vehicles', value: state.vehicles.length, icon: '🚗' },
    { label: 'Avg Speed', value: `${(state.averageSpeed * 100).toFixed(2)} km/h`, icon: '⚡' },
    { label: 'Congestion', value: state.congestionScore > 0 ? 'High' : state.congestionScore > -50 ? 'Medium' : 'Low', icon: '🚦' },
    { label: 'Sim Step', value: state.simulationStep, icon: '⏱️' },
    { label: 'Congestion Score', value: state.congestionScore, icon: '📉' },
  ];

  return (
    <div className="bg-white flex flex-col space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-lg mb-1">{stat.icon}</span>
            <span className="text-[10px] text-slate-500 uppercase mono font-bold tracking-tight">{stat.label}</span>
            <span className="text-lg font-black text-slate-800 tracking-tight">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <label className="text-[10px] mono text-slate-500 uppercase tracking-widest">Lane Density Analytics</label>
        <div className="space-y-4">
          {chartData.map((lane) => {
            const percentage = Math.min(100, lane.density);
            const isWarning = percentage > 70;
            const isCritical = percentage > 90;
            
            return (
              <div key={lane.name}>
                <div className="flex justify-between text-[11px] mono mb-1">
                  <span className="text-slate-600 font-medium">{lane.name}</span>
                  <span className={cn(
                    "uppercase font-bold",
                    isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {isCritical ? 'Critical' : isWarning ? 'High' : 'Optimal'} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={cn(
                      "h-full transition-colors duration-500",
                      isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
