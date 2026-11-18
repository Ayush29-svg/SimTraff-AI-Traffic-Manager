import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TrafficState, LaneId } from './types';
import TrafficMap from './components/TrafficMap';
import ControlPanel from './components/ControlPanel';
import Dashboard from './components/Dashboard';
import { Activity, MapPin, ShieldCheck, Zap } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [state, setState] = useState<TrafficState | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('traffic_state', (newState: TrafficState) => {
      setState(newState);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleToggleAi = (enabled: boolean) => {
    socket?.emit('toggle_ai', enabled);
  };

  const handleManualLaneSwitch = (lane: LaneId) => {
    socket?.emit('manual_lane_switch', lane);
  };

  const handleSpawnEmergency = (lane: LaneId) => {
    socket?.emit('spawn_emergency', lane);
  };

  const handleRefreshData = () => {
    socket?.emit('refresh_data');
  };

  const handleIncreaseTraffic = () => {
    socket?.emit('increase_traffic');
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-900 p-4 text-center">
        <Activity className="w-12 h-12 text-sky-500 animate-pulse mb-4" />
        <p className="text-slate-500 font-mono tracking-widest text-sm uppercase">Smart Traffic Management System</p>
        <p className="text-[10px] text-slate-400 mt-2 font-mono">Initializing Neural Simulation Engine...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-50 shrink-0 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <h1 className="text-lg font-black tracking-tight text-slate-800 uppercase">
            Smart Traffic Management System
          </h1>
        </div>
        
        <div className="hidden lg:flex items-center space-x-6 text-xs mono uppercase tracking-widest text-slate-500 font-medium">
          <div>LAT: 30.7333° N</div>
          <div>LON: 76.7794° E</div>
          <div className={cn(
            "px-3 py-1 rounded border transition-colors",
            connected ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
          )}>
            {connected ? "SYSTEM ACTIVE" : "OFFLINE"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Section: Map Viewer */}
        <section className="flex-[2] bg-slate-50 relative border-r border-slate-200 flex items-center justify-center p-4">
          <div className="absolute top-6 left-6 flex space-x-2 z-20">
            <div className="px-3 py-1 bg-white/90 border border-slate-200 rounded text-[10px] mono text-slate-500 uppercase tracking-tighter shadow-sm font-bold">
              SUMO BRIDGE: CONNECTED
            </div>
            <div className="px-3 py-1 bg-sky-50 shadow-sm border border-sky-200 rounded text-[10px] mono text-sky-600 uppercase tracking-tighter font-bold">
              Live Feed: 60 FPS
            </div>
          </div>
          <div className="w-full h-full flex items-center justify-center">
            <TrafficMap state={state} />
          </div>
        </section>

        {/* Right Section: Controls & Dashboard */}
        <section className="flex-1 bg-white p-6 flex flex-col space-y-6 overflow-y-auto border-l border-slate-200 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
          <ControlPanel 
            state={state} 
            onToggleAi={handleToggleAi} 
            onManualLaneSwitch={handleManualLaneSwitch} 
            onSpawnEmergency={handleSpawnEmergency}
            onRefreshData={handleRefreshData}
            onIncreaseTraffic={handleIncreaseTraffic}
          />
          <div className="flex-1 min-h-0">
            <Dashboard state={state} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-8 text-[10px] mono text-slate-400 shrink-0">
        <div>BUILD_ID: 2026.04.22.CHANDIGARH</div>
        <div className="hidden sm:block uppercase font-medium">ENVIRONMENT: SUMO_GUI_SIMULATOR (JAVA_TRACI_V4)</div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={cn("w-1.5 h-1.5 rounded-full mr-2", connected ? "bg-emerald-500" : "bg-red-500")} />
            WEBSOCKET: {connected ? "OK" : "ERR"}
          </div>
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2" />
            SUMO: RUNNING
          </div>
        </div>
      </footer>
    </div>
  );
}
