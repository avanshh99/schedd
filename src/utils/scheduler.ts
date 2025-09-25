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
  // weights
  W_SHUNT: number;
  W_MILEAGE: number;
  W_EXPECTED_FAILURE: number;
  W_OVER_IBL: number;
  W_OVER_WORKSHOP: number;
  W_SHORT_IN_SERVICE: number;
  W_CLEANING_MISS: number;
  W_BRANDING: number;
  UNSCHEDULED_WITHDRAWAL_COST: number;
  shunt_cost_by_pos: { [key: number]: number };
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

    if (['IOH', 'POH', 'HEAVY_REPAIR'].includes(train.state)) {
      assignment = 'WORKSHOP';
      reason = `Required maintenance: ${train.state}`;
      workshopCount++;
    } else if (train.since_A >= config.A_THRESHOLD_KM || train.since_B >= config.B_THRESHOLD_KM) {
      assignment = 'IBL';
      reason = `Overdue inspection - A: ${train.since_A}km, B: ${train.since_B}km`;
      iblCount++;
    } else if (!train.fitness.RS || !train.fitness.SIG || !train.fitness.TEL) {
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
        reason = `Fitness issues but no bays available`;
      }
    }

    if (assignment) {
      results.push({ id: train.id, assignment, reason, train });
    }
  });

  // Step 2: Score eligible trains with CP-SAT-inspired objective
  const eligibleTrains = trains
    .filter(train => !results.some(r => r.id === train.id))
    .map(train => {
      const meanMileage = trains.reduce((s, t) => s + t.mileage_total, 0) / trains.length;

      // penalties & rewards
      const shuntCost = config.shunt_cost_by_pos[train.pos] || 300;
      const mileageVar = Math.pow(train.mileage_total - meanMileage, 2);
      const expectedFailure = train.p_fail * config.UNSCHEDULED_WITHDRAWAL_COST;
      const cleaningPenalty = train.days_since_clean >= 30 ? config.W_CLEANING_MISS : 0;
      const brandingReward = train.branding_hours * config.W_BRANDING;

      // Objective: lower cost is better (convert to score by negating)
      const cost =
        config.W_SHUNT * shuntCost +
        config.W_MILEAGE * mileageVar +
        config.W_EXPECTED_FAILURE * expectedFailure +
        cleaningPenalty -
        brandingReward;

      const score = -cost; // higher score = better candidate

      return { train, score, id: train.id };
    })
    .sort((a, b) => b.score - a.score);

  // Step 3: Assign in-service up to REQUIRED_IN_SERVICE
  let inServiceCount = 0;
  const requiredInService = Math.min(config.REQUIRED_IN_SERVICE, eligibleTrains.length);

  for (let i = 0; i < requiredInService; i++) {
    const item = eligibleTrains[i];
    results.push({
      id: item.id,
      assignment: 'IN_SERVICE',
      reason: `Selected for service - Score: ${item.score.toFixed(1)}`,
      score: item.score,
      train: item.train,
    });
    inServiceCount++;
  }

  // Step 4: Remaining → STANDBY
  for (let i = requiredInService; i < eligibleTrains.length; i++) {
    const item = eligibleTrains[i];
    results.push({
      id: item.id,
      assignment: 'STANDBY',
      reason: `Reserve candidate - Score: ${item.score.toFixed(1)}`,
      score: item.score,
      train: item.train,
    });
  }

  // Step 5: Summary
  const summary = {
    inService: results.filter(r => r.assignment === 'IN_SERVICE').length,
    standby: results.filter(r => r.assignment === 'STANDBY').length,
    ibl: results.filter(r => r.assignment === 'IBL').length,
    workshop: results.filter(r => r.assignment === 'WORKSHOP').length,
  };

  // Sorting: IN_SERVICE > STANDBY > IBL > WORKSHOP
  results.sort((a, b) => {
    const priority = { IN_SERVICE: 0, STANDBY: 1, IBL: 2, WORKSHOP: 3 };
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