export interface TrainReadiness {
  id: string;
  isReady: boolean;
  readinessScore: number;
  cleaningStatus: 'CLEAN' | 'NEEDS_CLEANING' | 'IN_PROGRESS';
  brandingHours: number;
  runtimeBalance: number;
  jobCardStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  lastUpdated: Date;
  issues: string[];
}

export interface BayAssignment {
  bayId: string;
  trainId: string | null;
  bayType: 'PRIMARY' | 'STANDBY' | 'OVERFLOW';
  assignedAt: Date;
  departureTime?: Date;
  reason: string;
}

export interface AllocationPlan {
  planId: string;
  createdAt: Date;
  mode: 'DAILY_FORECAST' | 'REAL_TIME';
  bays: BayAssignment[];
  changes: AllocationChange[];
  summary: {
    primaryBaysOccupied: number;
    standbyBaysOccupied: number;
    overflowBaysOccupied: number;
    totalShuntingSteps: number;
  };
}

export interface AllocationChange {
  timestamp: Date;
  type: 'ASSIGNMENT' | 'REPLACEMENT' | 'SWAP';
  fromBay?: string;
  toBay: string;
  trainId: string;
  replacedTrainId?: string;
  reason: string;
  shuntingSteps: number;
}

export interface BayConfiguration {
  primaryBays: string[];
  standbyBays: string[];
  overflowBays: string[];
  maxShuntingDistance: number;
}

export interface ForecastParameters {
  cleaningThresholdDays: number;
  minBrandingHours: number;
  runtimeBalanceWeight: number;
  jobCardWeight: number;
  shuntingPenalty: number;
  readinessThreshold: number;
}