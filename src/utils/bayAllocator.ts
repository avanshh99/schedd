import { 
  TrainReadiness, 
  BayAssignment, 
  AllocationPlan, 
  AllocationChange, 
  BayConfiguration, 
  ForecastParameters 
} from '../types/bayAllocation';

interface Train {
  id: string;
  mileage_total: number;
  since_A: number;
  since_B: number;
  state: string;
  p_fail: number;
  pos: number;
  days_since_clean: number;
  fitness: {
    RS: boolean;
    SIG: boolean;
    TEL: boolean;
  };
  branding_hours: number;
}

interface ScheduleResult {
  id: string;
  assignment: string;
  reason: string;
  score?: number;
  slot?: number;
  train: Train;
}

export class BayAllocator {
  private config: BayConfiguration;
  private parameters: ForecastParameters;

  constructor(config: BayConfiguration, parameters: ForecastParameters) {
    this.config = config;
    this.parameters = parameters;
  }

  // Calculate train readiness score based on multiple factors
  calculateReadinessScore(train: Train, readiness?: Partial<TrainReadiness>): number {
    let score = 100; // Start with perfect score

    // Fitness certificates (critical)
    if (!train.fitness.RS || !train.fitness.SIG || !train.fitness.TEL) {
      score -= 50;
    }

    // Cleaning status
    if (train.days_since_clean > this.parameters.cleaningThresholdDays) {
      score -= 20;
    }

    // Branding hours (positive factor)
    if (train.branding_hours >= this.parameters.minBrandingHours) {
      score += 10;
    }

    // Job card status (if available)
    if (readiness?.jobCardStatus === 'OPEN') {
      score -= 30;
    } else if (readiness?.jobCardStatus === 'IN_PROGRESS') {
      score -= 15;
    }

    // Runtime balance (lower mileage is better)
    const avgMileage = 250000; // Approximate average
    const mileageDiff = Math.abs(train.mileage_total - avgMileage);
    score -= (mileageDiff / 10000) * this.parameters.runtimeBalanceWeight;

    // Cleaning status override
    if (readiness?.cleaningStatus === 'NEEDS_CLEANING') {
      score -= 25;
    } else if (readiness?.cleaningStatus === 'IN_PROGRESS') {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Generate daily forecast allocation (night run)
  generateDailyForecast(scheduleResults: ScheduleResult[]): AllocationPlan {
    const inServiceTrains = scheduleResults
      .filter(r => r.assignment === 'IN_SERVICE')
      .sort((a, b) => (a.slot || 0) - (b.slot || 0));

    const standbyTrains = scheduleResults
      .filter(r => r.assignment === 'STANDBY')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const bays: BayAssignment[] = [];
    const changes: AllocationChange[] = [];
    const now = new Date();

    // Assign primary bays to earliest departures (based on slot order)
    this.config.primaryBays.forEach((bayId, index) => {
      if (index < inServiceTrains.length) {
        const train = inServiceTrains[index];
        const departureTime = new Date(now.getTime() + (6 + index * 0.5) * 60 * 60 * 1000); // 6 AM + 30min intervals
        
        bays.push({
          bayId,
          trainId: train.id,
          bayType: 'PRIMARY',
          assignedAt: now,
          departureTime,
          reason: `Primary bay assignment for slot ${train.slot} departure`
        });

        changes.push({
          timestamp: now,
          type: 'ASSIGNMENT',
          toBay: bayId,
          trainId: train.id,
          reason: `Daily forecast: Primary bay assignment`,
          shuntingSteps: 0
        });
      } else {
        bays.push({
          bayId,
          trainId: null,
          bayType: 'PRIMARY',
          assignedAt: now,
          reason: 'Available primary bay'
        });
      }
    });

    // Assign standby bays as backups
    this.config.standbyBays.forEach((bayId, index) => {
      if (index < standbyTrains.length) {
        const train = standbyTrains[index];
        
        bays.push({
          bayId,
          trainId: train.id,
          bayType: 'STANDBY',
          assignedAt: now,
          reason: `Standby backup with score ${train.score?.toFixed(1)}`
        });

        changes.push({
          timestamp: now,
          type: 'ASSIGNMENT',
          toBay: bayId,
          trainId: train.id,
          reason: `Daily forecast: Standby bay assignment`,
          shuntingSteps: 0
        });
      } else {
        bays.push({
          bayId,
          trainId: null,
          bayType: 'STANDBY',
          assignedAt: now,
          reason: 'Available standby bay'
        });
      }
    });

    // Assign overflow bays for remaining trains
    const remainingTrains = inServiceTrains.slice(this.config.primaryBays.length);
    this.config.overflowBays.forEach((bayId, index) => {
      if (index < remainingTrains.length) {
        const train = remainingTrains[index];
        const departureTime = new Date(now.getTime() + (10 + index * 0.5) * 60 * 60 * 1000); // Later departures
        
        bays.push({
          bayId,
          trainId: train.id,
          bayType: 'OVERFLOW',
          assignedAt: now,
          departureTime,
          reason: `Overflow assignment for later departure`
        });

        changes.push({
          timestamp: now,
          type: 'ASSIGNMENT',
          toBay: bayId,
          trainId: train.id,
          reason: `Daily forecast: Overflow bay assignment`,
          shuntingSteps: 0
        });
      } else {
        bays.push({
          bayId,
          trainId: null,
          bayType: 'OVERFLOW',
          assignedAt: now,
          reason: 'Available overflow bay'
        });
      }
    });

    return {
      planId: `DAILY_${now.toISOString().split('T')[0]}`,
      createdAt: now,
      mode: 'DAILY_FORECAST',
      bays,
      changes,
      summary: {
        primaryBaysOccupied: bays.filter(b => b.bayType === 'PRIMARY' && b.trainId).length,
        standbyBaysOccupied: bays.filter(b => b.bayType === 'STANDBY' && b.trainId).length,
        overflowBaysOccupied: bays.filter(b => b.bayType === 'OVERFLOW' && b.trainId).length,
        totalShuntingSteps: 0
      }
    };
  }

  // Real-time monitoring and dynamic reallocation
  updateRealTimeAllocation(
    currentPlan: AllocationPlan, 
    trainReadiness: TrainReadiness[], 
    scheduleResults: ScheduleResult[]
  ): AllocationPlan {
    const updatedBays = [...currentPlan.bays];
    const newChanges: AllocationChange[] = [];
    let totalShuntingSteps = currentPlan.summary.totalShuntingSteps;

    // Check each primary bay for train readiness
    const primaryBays = updatedBays.filter(b => b.bayType === 'PRIMARY' && b.trainId);
    
    for (const bay of primaryBays) {
      if (!bay.trainId) continue;

      const readiness = trainReadiness.find(r => r.id === bay.trainId);
      const train = scheduleResults.find(r => r.id === bay.trainId)?.train;
      
      if (!train) continue;

      const readinessScore = readiness ? readiness.readinessScore : 
        this.calculateReadinessScore(train, readiness);

      // If train is not ready, find replacement
      if (readinessScore < this.parameters.readinessThreshold || !readiness?.isReady) {
        const replacement = this.findBestReplacement(
          bay, 
          updatedBays, 
          trainReadiness, 
          scheduleResults
        );

        if (replacement) {
          const shuntingSteps = this.calculateShuntingSteps(replacement.fromBay, bay.bayId);
          
          // Update bay assignments
          const replacementBayIndex = updatedBays.findIndex(b => b.bayId === replacement.fromBay);
          const currentBayIndex = updatedBays.findIndex(b => b.bayId === bay.bayId);

          if (replacementBayIndex !== -1 && currentBayIndex !== -1) {
            // Move replacement train to primary bay
            updatedBays[currentBayIndex] = {
              ...bay,
              trainId: replacement.trainId,
              assignedAt: new Date(),
              reason: `Real-time replacement: ${replacement.reason}`
            };

            // Move unready train to replacement's bay or mark as available
            updatedBays[replacementBayIndex] = {
              ...updatedBays[replacementBayIndex],
              trainId: bay.trainId,
              assignedAt: new Date(),
              reason: `Moved from ${bay.bayId} due to readiness issues`
            };

            totalShuntingSteps += shuntingSteps;

            newChanges.push({
              timestamp: new Date(),
              type: 'REPLACEMENT',
              fromBay: replacement.fromBay,
              toBay: bay.bayId,
              trainId: replacement.trainId,
              replacedTrainId: bay.trainId,
              reason: replacement.reason,
              shuntingSteps
            });
          }
        }
      }
    }

    return {
      ...currentPlan,
      mode: 'REAL_TIME',
      bays: updatedBays,
      changes: [...currentPlan.changes, ...newChanges],
      summary: {
        ...currentPlan.summary,
        totalShuntingSteps
      }
    };
  }

  private findBestReplacement(
    targetBay: BayAssignment,
    allBays: BayAssignment[],
    trainReadiness: TrainReadiness[],
    scheduleResults: ScheduleResult[]
  ): { trainId: string; fromBay: string; reason: string } | null {
    const candidates = allBays
      .filter(b => b.trainId && b.bayId !== targetBay.bayId)
      .map(bay => {
        const readiness = trainReadiness.find(r => r.id === bay.trainId);
        const scheduleResult = scheduleResults.find(r => r.id === bay.trainId);
        
        if (!scheduleResult?.train) return null;

        const readinessScore = readiness ? readiness.readinessScore : 
          this.calculateReadinessScore(scheduleResult.train, readiness);
        
        const shuntingSteps = this.calculateShuntingSteps(bay.bayId, targetBay.bayId);
        const shuntingPenalty = shuntingSteps * this.parameters.shuntingPenalty;
        
        const totalScore = readinessScore - shuntingPenalty;

        return {
          trainId: bay.trainId!,
          fromBay: bay.bayId,
          readinessScore,
          shuntingSteps,
          totalScore,
          isReady: readiness?.isReady ?? true
        };
      })
      .filter(c => c !== null && c.isReady && c.readinessScore >= this.parameters.readinessThreshold)
      .sort((a, b) => b!.totalScore - a!.totalScore);

    if (candidates.length > 0 && candidates[0]) {
      const best = candidates[0];
      return {
        trainId: best.trainId,
        fromBay: best.fromBay,
        reason: `Train ${targetBay.trainId} not ready: replaced by Train ${best.trainId} from ${best.fromBay} with ${best.shuntingSteps} shunting step(s)`
      };
    }

    return null;
  }

  private calculateShuntingSteps(fromBay: string, toBay: string): number {
    // Simplified shunting calculation based on bay positions
    const bayPositions: { [key: string]: number } = {
      'A1': 1, 'A2': 2, 'A3': 3,
      'B1': 4, 'B2': 5, 'B3': 6,
      'C1': 7, 'C2': 8, 'C3': 9
    };

    const fromPos = bayPositions[fromBay] || 0;
    const toPos = bayPositions[toBay] || 0;
    
    return Math.abs(toPos - fromPos);
  }

  // Generate mock train readiness data for demonstration
  generateMockReadiness(scheduleResults: ScheduleResult[]): TrainReadiness[] {
    return scheduleResults.map(result => {
      const readinessScore = this.calculateReadinessScore(result.train);
      const isReady = readinessScore >= this.parameters.readinessThreshold;
      
      const issues: string[] = [];
      if (!result.train.fitness.RS) issues.push('RS certificate expired');
      if (!result.train.fitness.SIG) issues.push('SIG certificate expired');
      if (!result.train.fitness.TEL) issues.push('TEL certificate expired');
      if (result.train.days_since_clean > this.parameters.cleaningThresholdDays) {
        issues.push('Overdue for cleaning');
      }

      return {
        id: result.id,
        isReady,
        readinessScore,
        cleaningStatus: result.train.days_since_clean > 30 ? 'NEEDS_CLEANING' : 'CLEAN',
        brandingHours: result.train.branding_hours,
        runtimeBalance: result.train.mileage_total,
        jobCardStatus: Math.random() > 0.8 ? 'OPEN' : 'CLOSED',
        lastUpdated: new Date(),
        issues
      };
    });
  }
}