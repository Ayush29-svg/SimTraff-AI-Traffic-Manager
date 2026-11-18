export type LaneId = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export interface Vehicle {
  id: string;
  lane: LaneId;
  targetLane: LaneId;
  progress: number; // 0 to 1
  type: '🚗' | '🚕' | '🚙' | '🚌' | '🚓' | '🚑';
  speed: number;
  isEmergency?: boolean;
}

export interface TrafficState {
  lanes: Record<LaneId, {
    light: 'GREEN' | 'YELLOW' | 'RED';
    density: number;
    queueLength: number;
  }>;
  vehicles: Vehicle[];
  isAiEnabled: boolean;
  emergencyPreemption?: {
    active: boolean;
    lane?: LaneId;
  };
  densityHistory: { time: string, density: number }[];
  timestamp: number;
  averageSpeed: number;
  congestionScore: number;
  simulationStep: number;
  currentPhase: 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW';
}
