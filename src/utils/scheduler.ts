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
  CANDIDATE_POOL_SIZE: number;
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
  slot?: number;
  train: Train;
}

export const scheduleTrains = (trains: Train[], config: SchedulingConfig): {
  results: ScheduleResult[];
  summary: { inService: number; standby: number; ibl: number; workshop: number };
} => {
  const results: ScheduleResult[] = [];
  const trainsCopy = trains.map(t => ({ ...t }));

  // Step 1: Greedy pre-selection
  const meanMileage = trainsCopy.reduce((sum, t) => sum + t.mileage_total, 0) / trainsCopy.length;
  const eligible: Array<{ score: number; index: number }> = [];

  const computeScore = (train: Train): number => {
    let score = train.branding_hours;
    score -= Math.abs(train.mileage_total - meanMileage) / 1000;
    if (train.days_since_clean >= 30) {
      score -= 50;
    }
    return score;
  };

  // Assign initial roles based on hard constraints
  trainsCopy.forEach((train, index) => {
    if (['IOH', 'POH', 'HEAVY_REPAIR'].includes(train.state)) {
      results.push({
        id: train.id,
        assignment: 'WORKSHOP',
        reason: `Required maintenance: ${train.state}`,
        train,
      });
    } else if (train.since_A >= config.A_THRESHOLD_KM || train.since_B >= config.B_THRESHOLD_KM) {
      results.push({
        id: train.id,
        assignment: 'IBL',
        reason: `Overdue inspection - A: ${train.since_A}km, B: ${train.since_B}km`,
        train,
      });
    } else if (!train.fitness.RS || !train.fitness.SIG || !train.fitness.TEL) {
      const issues = [];
      if (!train.fitness.RS) issues.push('RS');
      if (!train.fitness.SIG) issues.push('SIG');
      if (!train.fitness.TEL) issues.push('TEL');
      
      results.push({
        id: train.id,
        assignment: 'STANDBY',
        reason: `Fitness certificate issues: ${issues.join(', ')}`,
        train,
      });
    } else {
      // Eligible for candidate pool
      const score = computeScore(train);
      eligible.push({ score, index });
    }
  });

  // Sort eligible trains by score (descending)
  eligible.sort((a, b) => b.score - a.score);

  // Select candidate pool
  const candidatePoolSize = Math.min(config.CANDIDATE_POOL_SIZE || 15, eligible.length);
  const candidateIndices = eligible.slice(0, candidatePoolSize).map(e => e.index);

  // Step 2: CP-SAT-inspired optimization for slot assignment
  // Since we can't use actual CP-SAT in browser, we'll simulate the optimization
  
  const candidates = candidateIndices.map(i => trainsCopy[i]);
  const maxMileage = Math.max(...candidates.map(t => t.mileage_total));

  // Calculate weighted scores for candidates (lower mileage = higher weight)
  const candidateScores = candidates.map((train, localIdx) => {
    const mileageWeight = maxMileage - train.mileage_total; // Higher weight for lower mileage
    const brandingScore = train.branding_hours * 100;
    const cleaningPenalty = train.days_since_clean >= 30 ? -5000 : 0;
    
    return {
      localIdx,
      globalIdx: candidateIndices[localIdx],
      train,
      score: mileageWeight + brandingScore + cleaningPenalty,
    };
  });

  // Sort by score (descending) and assign slots
  candidateScores.sort((a, b) => b.score - a.score);

  // Assign IN_SERVICE roles with slots
  const requiredInService = Math.min(config.REQUIRED_IN_SERVICE, candidateScores.length);
  
  for (let i = 0; i < requiredInService; i++) {
    const candidate = candidateScores[i];
    const slot = i + 1; // Assign slots 1, 2, 3, ... for optimal positioning
    
    results.push({
      id: candidate.train.id,
      assignment: 'IN_SERVICE',
      reason: `Selected for service - Optimization score: ${candidate.score.toFixed(0)}`,
      score: candidate.score,
      slot: slot,
      train: candidate.train,
    });
  }

  // Assign remaining candidates to STANDBY
  for (let i = requiredInService; i < candidateScores.length; i++) {
    const candidate = candidateScores[i];
    
    results.push({
      id: candidate.train.id,
      assignment: 'STANDBY',
      reason: `Reserve candidate - Optimization score: ${candidate.score.toFixed(0)}`,
      score: candidate.score,
      train: candidate.train,
    });
  }

  // Step 3: Generate summary
  const summary = {
    inService: results.filter(r => r.assignment === 'IN_SERVICE').length,
    standby: results.filter(r => r.assignment === 'STANDBY').length,
    ibl: results.filter(r => r.assignment === 'IBL').length,
    workshop: results.filter(r => r.assignment === 'WORKSHOP').length,
  };

  // Sort results by assignment priority and then by score/slot
  results.sort((a, b) => {
    const priority = { IN_SERVICE: 0, STANDBY: 1, IBL: 2, WORKSHOP: 3 };
    const aPriority = priority[a.assignment as keyof typeof priority];
    const bPriority = priority[b.assignment as keyof typeof priority];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Within same assignment, sort by slot (for IN_SERVICE) or score
    if (a.assignment === 'IN_SERVICE' && b.assignment === 'IN_SERVICE') {
      return (a.slot || 0) - (b.slot || 0);
    }
    
    if (a.score !== undefined && b.score !== undefined) {
      return b.score - a.score;
    }
    
    return a.id.localeCompare(b.id);
  });

  return { results, summary };
};