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

interface SchedulingConfig {
  A_THRESHOLD_KM: number;
  B_THRESHOLD_KM: number;
  IOH_THRESHOLD_KM: number;
  POH_THRESHOLD_KM: number;
  NUM_INSPECTION_BAYS: number;
  NUM_WORKSHOP_BAYS: number;
  NUM_STABLING_SLOTS: number;
  REQUIRED_IN_SERVICE: number;
  MIN_RESERVE: number;
}

interface ScheduleResult {
  id: string;
  assignment: string;
  reason: string;
  score?: number;
  train: Train;
}

export const scheduleTrains = (trains: Train[], config: SchedulingConfig): {
  results: ScheduleResult[];
  summary: { inService: number; standby: number; ibl: number; workshop: number };
} => {
  const results: ScheduleResult[] = [];
  let workshopCount = 0;
  let iblCount = 0;

  // Step 1: Hard constraints - assign trains that MUST go to workshop or IBL
  trains.forEach(train => {
    let assignment = '';
    let reason = '';

    // Hard lock: IOH/POH/HEAVY_REPAIR -> WORKSHOP
    if (['IOH', 'POH', 'HEAVY_REPAIR'].includes(train.state)) {
      assignment = 'WORKSHOP';
      reason = `Required maintenance: ${train.state}`;
      workshopCount++;
    }
    // Overdue inspections -> IBL (if not in workshop)
    else if (train.since_A >= config.A_THRESHOLD_KM || train.since_B >= config.B_THRESHOLD_KM) {
      assignment = 'IBL';
      reason = `Overdue inspection - A: ${train.since_A}km, B: ${train.since_B}km`;
      iblCount++;
    }
    // Fitness issues -> cannot be in service
    else if (!train.fitness.RS || !train.fitness.SIG || !train.fitness.TEL) {
      const issues = [];
      if (!train.fitness.RS) issues.push('RS');
      if (!train.fitness.SIG) issues.push('SIG');
      if (!train.fitness.TEL) issues.push('TEL');
      
      if (workshopCount < config.NUM_WORKSHOP_BAYS) {
        assignment = 'WORKSHOP';
        reason = `Fitness certificate issues: ${issues.join(', ')}`;
        workshopCount++;
      } else if (iblCount < config.NUM_INSPECTION_BAYS) {
        assignment = 'IBL';
        reason = `Fitness certificate issues: ${issues.join(', ')} - Workshop full`;
        iblCount++;
      } else {
        assignment = 'STANDBY';
        reason = `Fitness certificate issues: ${issues.join(', ')} - All bays full`;
      }
    }

    if (assignment) {
      results.push({
        id: train.id,
        assignment,
        reason,
        train
      });
    }
  });

  // Step 2: Calculate scores for eligible trains (not assigned to workshop/IBL)
  const eligibleTrains = trains
    .filter(train => !results.some(r => r.id === train.id))
    .map(train => {
      const meanMileage = trains.reduce((sum, t) => sum + t.mileage_total, 0) / trains.length;
      const mileageDeviation = Math.abs(train.mileage_total - meanMileage);
      
      // Score calculation (higher is better for in-service)
      let score = 0;
      score += train.branding_hours * 10; // Branding value
      score -= train.p_fail * 10000; // Reliability penalty
      score -= mileageDeviation / 1000; // Mileage balancing
      score -= train.days_since_clean > 30 ? 100 : 0; // Cleaning penalty
      
      return {
        train,
        score,
        id: train.id
      };
    })
    .sort((a, b) => b.score - a.score); // Sort by score descending

  // Step 3: Assign in-service trains
  let inServiceCount = 0;
  const requiredInService = Math.min(config.REQUIRED_IN_SERVICE, eligibleTrains.length);

  for (let i = 0; i < requiredInService && i < eligibleTrains.length; i++) {
    const item = eligibleTrains[i];
    results.push({
      id: item.id,
      assignment: 'IN_SERVICE',
      reason: `Selected for service - Score: ${item.score.toFixed(1)}`,
      score: item.score,
      train: item.train
    });
    inServiceCount++;
  }

  // Step 4: Assign remaining eligible trains to standby
  for (let i = requiredInService; i < eligibleTrains.length; i++) {
    const item = eligibleTrains[i];
    results.push({
      id: item.id,
      assignment: 'STANDBY',
      reason: `Standby reserve - Score: ${item.score.toFixed(1)}`,
      score: item.score,
      train: item.train
    });
  }

  // Count final assignments
  const summary = {
    inService: results.filter(r => r.assignment === 'IN_SERVICE').length,
    standby: results.filter(r => r.assignment === 'STANDBY').length,
    ibl: results.filter(r => r.assignment === 'IBL').length,
    workshop: results.filter(r => r.assignment === 'WORKSHOP').length,
  };

  // Sort results by assignment priority and then by score/id
  results.sort((a, b) => {
    const priority = { 'IN_SERVICE': 0, 'STANDBY': 1, 'IBL': 2, 'WORKSHOP': 3 };
    if (a.assignment !== b.assignment) {
      return priority[a.assignment as keyof typeof priority] - priority[b.assignment as keyof typeof priority];
    }
    if (a.score !== undefined && b.score !== undefined) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });

  return { results, summary };
};