import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TrafficState, LaneId, Vehicle } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  const PORT = 3000;

  // Simulation State
  let state: TrafficState = {
    lanes: {
      NORTH: { light: 'GREEN', density: 0, queueLength: 0 },
      SOUTH: { light: 'GREEN', density: 0, queueLength: 0 },
      EAST: { light: 'RED', density: 0, queueLength: 0 },
      WEST: { light: 'RED', density: 0, queueLength: 0 },
    },
    vehicles: [],
    isAiEnabled: true,
    emergencyPreemption: { active: false },
    densityHistory: [],
    timestamp: Date.now(),
    averageSpeed: 0,
    congestionScore: 0,
    simulationStep: 0,
    currentPhase: 'NS_GREEN',
  };

  // Simulation Constants
  let spawn_prob = 0.5; 
  const VEHICLE_SPEED = 0.08;
  const LIGHT_CYCLE_MIN = 5000; // 5s min green
  const LIGHT_CYCLE_MAX = 20000; // 20s max green
  const YELLOW_DURATION = 2000; // 2s yellow
  
  let lastSwitchTime = Date.now();
  let currentPhase: 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW' = 'NS_GREEN';

  // Statistics History
  setInterval(() => {
    const totalDensity = state.vehicles.length;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.densityHistory.push({ time, density: totalDensity });
    if (state.densityHistory.length > 50) state.densityHistory.shift();
  }, 1000);

  // Helper: Update densities
  const updateDensities = () => {
    (Object.keys(state.lanes) as LaneId[]).forEach(laneId => {
      const activeVehicles = state.vehicles.filter(v => v.lane === laneId);
      state.lanes[laneId].density = activeVehicles.length;
      state.lanes[laneId].queueLength = activeVehicles.filter(v => v.progress < 0.1).length;
    });
  };

  const switchLights = (toGroup: 'NS' | 'EW') => {
    const now = Date.now();
    lastSwitchTime = now;
    
    if (toGroup === 'NS') {
      currentPhase = 'NS_GREEN';
      state.currentPhase = 'NS_GREEN';
      state.lanes.NORTH.light = 'GREEN';
      state.lanes.SOUTH.light = 'GREEN';
      state.lanes.EAST.light = 'RED';
      state.lanes.WEST.light = 'RED';
    } else {
      currentPhase = 'EW_GREEN';
      state.currentPhase = 'EW_GREEN';
      state.lanes.NORTH.light = 'RED';
      state.lanes.SOUTH.light = 'RED';
      state.lanes.EAST.light = 'GREEN';
      state.lanes.WEST.light = 'GREEN';
    }
    io.emit('traffic_state', state);
  };

  const setYellow = () => {
    lastSwitchTime = Date.now();
    if (currentPhase === 'NS_GREEN') {
      currentPhase = 'NS_YELLOW';
      state.currentPhase = 'NS_YELLOW';
      state.lanes.NORTH.light = 'YELLOW';
      state.lanes.SOUTH.light = 'YELLOW';
    } else if (currentPhase === 'EW_GREEN') {
      currentPhase = 'EW_YELLOW';
      state.currentPhase = 'EW_YELLOW';
      state.lanes.EAST.light = 'YELLOW';
      state.lanes.WEST.light = 'YELLOW';
    }
    io.emit('traffic_state', state);
  };

  // Helper: Handle Emergency Preemption
  const handleEmergencyPreemption = () => {
    const emergencyVehicle = state.vehicles.find(v => v.isEmergency && v.progress < 0.5);
    
    if (emergencyVehicle) {
      state.emergencyPreemption = { active: true, lane: emergencyVehicle.lane };
      const group: 'NS' | 'EW' = (emergencyVehicle.lane === 'NORTH' || emergencyVehicle.lane === 'SOUTH') ? 'NS' : 'EW';
      
      // If we are in the wrong group's yellow or green, stay/switch. 
      // Simplified: If emergency is in NS and we are not in NS_GREEN, jump to NS_GREEN (ignoring yellow for emergency vehicle safety)
      if (group === 'NS' && currentPhase !== 'NS_GREEN') {
        switchLights('NS');
      } else if (group === 'EW' && currentPhase !== 'EW_GREEN') {
        switchLights('EW');
      }
    } else {
      state.emergencyPreemption = { active: false };
    }
  };

  // Simulation Phase Manager: Handles Transitions
  const handleSignalTransitions = () => {
    const now = Date.now();
    const timeSinceSwitch = now - lastSwitchTime;

    if (currentPhase === 'NS_YELLOW') {
      if (timeSinceSwitch >= YELLOW_DURATION) {
        switchLights('EW');
      }
    } else if (currentPhase === 'EW_YELLOW') {
      if (timeSinceSwitch >= YELLOW_DURATION) {
        switchLights('NS');
      }
    }
  };

  // AI Logic: Decision making (Advanced Actuated Control)
  const runAiLogic = () => {
    if (!state.isAiEnabled || state.emergencyPreemption?.active) return;
    if (currentPhase === 'NS_YELLOW' || currentPhase === 'EW_YELLOW') return;

    const now = Date.now();
    const timeSinceSwitch = now - lastSwitchTime;

    // Minimum green time guarantee
    if (timeSinceSwitch < LIGHT_CYCLE_MIN) return;

    // Calculate demand scores (Number of vehicles waiting at stop line)
    const getLaneDemand = (id: LaneId) => {
      return state.vehicles.filter(v => v.lane === id && v.progress > 0.32 && v.progress <= 0.35).length;
    };

    const nsDemand = getLaneDemand('NORTH') + getLaneDemand('SOUTH');
    const ewDemand = getLaneDemand('EAST') + getLaneDemand('WEST');

    if (currentPhase === 'NS_GREEN') {
      // 1. Actuated Gap Out: If N-S is empty, switch early
      const nsEmpty = nsDemand === 0;
      // 2. Pressure Switch: If E-W has significantly more demand or reached max time
      const highEwDemand = ewDemand > nsDemand + 2;
      const reachedMax = timeSinceSwitch > LIGHT_CYCLE_MAX;

      if (nsEmpty || reachedMax || (highEwDemand && timeSinceSwitch > LIGHT_CYCLE_MIN * 2)) {
        if (ewDemand > 0 || reachedMax) setYellow();
      }
    } else if (currentPhase === 'EW_GREEN') {
      // 1. Actuated Gap Out: If E-W is empty, switch early
      const ewEmpty = ewDemand === 0;
      // 2. Pressure Switch: If N-S has significantly more demand or reached max time
      const highNsDemand = nsDemand > ewDemand + 2;
      const reachedMax = timeSinceSwitch > LIGHT_CYCLE_MAX;

      if (ewEmpty || reachedMax || (highNsDemand && timeSinceSwitch > LIGHT_CYCLE_MIN * 2)) {
        if (nsDemand > 0 || reachedMax) setYellow();
      }
    }
  };

  // Main Simulation Loop
  setInterval(() => {
    // 1. Progress vehicles
    state.vehicles = state.vehicles.filter(v => {
      const lane = state.lanes[v.lane];
      const vehicleSpeed = v.speed * 1.5;
      const stopLine = 0.35; // Junction starts at 35% from entrance
      
      // Step 1: Find vehicle directly ahead in same path
      const carAhead = state.vehicles
        .filter(other => {
          if (other.id === v.id) return false;
          
          // In approach: same entrance lane and ahead
          if (v.progress < stopLine && other.lane === v.lane && other.progress < 0.4 && other.progress > v.progress) {
            return true;
          }
          // In exit: same target lane and ahead
          if (v.progress > 0.65 && other.targetLane === v.targetLane && other.progress > v.progress) {
            return true;
          }
          // In intersection: respect others in the intersection heading same way
          if (v.progress >= stopLine && v.progress <= 0.65 && other.progress >= stopLine && other.progress <= 0.7 && other.targetLane === v.targetLane) {
            return other.progress > v.progress;
          }
          return false;
        })
        .sort((a, b) => a.progress - b.progress)[0];

      let nextProgress = v.progress + vehicleSpeed;
      let targetProgress = nextProgress;

      // Logic A: Traffic Light Check
      const isLeft = (v.lane === 'NORTH' && v.targetLane === 'EAST') || 
                    (v.lane === 'SOUTH' && v.targetLane === 'WEST') || 
                    (v.lane === 'WEST' && v.targetLane === 'NORTH') || 
                    (v.lane === 'EAST' && v.targetLane === 'SOUTH');

      if (lane.light !== 'GREEN' && !isLeft && v.progress <= stopLine && nextProgress > stopLine) {
        targetProgress = stopLine;
      }

      // Logic B: Roundabout Yielding (Yield to circulating traffic)
      if (v.progress > 0.32 && v.progress < stopLine && !isLeft) {
        const circulatingCars = state.vehicles.filter(ov => ov.progress >= 0.35 && ov.progress <= 0.65);
        if (circulatingCars.length > 5) { // Roundabout capacity check
          targetProgress = v.progress; // Wait
        }
      }

      // Logic C: Collision Avoidance (Following distance)
      const buffer = 0.05; 
      if (carAhead && targetProgress > carAhead.progress - buffer) {
        targetProgress = Math.max(v.progress, carAhead.progress - buffer);
      }

      // Final Movement Assignment
      v.progress = targetProgress;
      
      return v.progress < 1.0;
    });

    // 2. Spawn vehicles
    (Object.keys(state.lanes) as LaneId[]).forEach(laneId => {
      if (Math.random() < spawn_prob / 10) { // Divide by 10 because loop is frequent
        const hasCarAtStart = state.vehicles.some(v => v.lane === laneId && v.progress < 0.1);
        if (!hasCarAtStart) {
          const types: Vehicle['type'][] = ['🚗', '🚕', '🚙', '🚌', '🚓'];
          const possibleTargets: LaneId[] = (Object.keys(state.lanes) as LaneId[]).filter(id => id !== laneId);
          state.vehicles.push({
            id: Math.random().toString(36).substring(7),
            lane: laneId,
            targetLane: possibleTargets[Math.floor(Math.random() * possibleTargets.length)],
            progress: 0,
            type: types[Math.floor(Math.random() * types.length)],
            speed: 0.01 + Math.random() * 0.01,
          });
        }
      }
    });

    // 3. Update AI
    handleSignalTransitions();
    handleEmergencyPreemption();
    runAiLogic();
    updateDensities();

    // 4. Calculate Analytics
    state.simulationStep++;
    const speeds = state.vehicles.map(v => v.speed);
    state.averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    
    // Congestion score (normalized -100 to 100)
    // Positive = Congested, Negative = Free Flow
    const densityRatio = state.vehicles.length / 50; // max expected cars 50
    state.congestionScore = Math.floor((densityRatio * 200) - 100);

    state.timestamp = Date.now();
    io.emit('traffic_state', state);
  }, 100);

  // Socket Events
  io.on('connection', (socket) => {
    socket.emit('traffic_state', state);

    socket.on('toggle_ai', (enabled: boolean) => {
      state.isAiEnabled = enabled;
      io.emit('traffic_state', state);
    });

    socket.on('manual_lane_switch', (laneId: LaneId) => {
      if (!state.isAiEnabled) {
        lastSwitchTime = Date.now();
        // Set all to RED first for safety, then the target to GREEN
        Object.keys(state.lanes).forEach(id => {
          state.lanes[id as LaneId].light = 'RED';
        });
        state.lanes[laneId].light = 'GREEN';
        // For bidirectional flow logic, if user clicks North, green South too? 
        // User said "4 manual overrides", so maybe they want individual.
        // Let's stick to individual as requested "4 mannual overrides control".
        io.emit('traffic_state', state);
      }
    });

    socket.on('spawn_emergency', (laneId: LaneId) => {
      const hasCarAtStart = state.vehicles.some(v => v.lane === laneId && v.progress < 0.1);
      if (!hasCarAtStart) {
        state.vehicles.push({
          id: Math.random().toString(36).substring(7),
          lane: laneId,
          targetLane: (['NORTH', 'SOUTH', 'EAST', 'WEST'] as LaneId[]).filter(id => id !== laneId)[Math.floor(Math.random() * 3)],
          progress: 0,
          type: '🚑',
          speed: 0.02 + Math.random() * 0.01,
          isEmergency: true,
        });
        io.emit('traffic_state', state);
      }
    });

    socket.on('refresh_data', () => {
      state.vehicles = [];
      state.densityHistory = [];
      io.emit('traffic_state', state);
    });

    socket.on('increase_traffic', () => {
      spawn_prob = Math.min(1.0, spawn_prob + 0.1);
      io.emit('traffic_state', state);
    });
  });

  // Vite setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
