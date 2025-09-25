import React from 'react';
import { Settings } from 'lucide-react';

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

interface ConfigurationPanelProps {
  config: SchedulingConfig;
  onConfigUpdate: (config: SchedulingConfig) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onConfigUpdate,
}) => {
  const updateConfig = (field: keyof SchedulingConfig, value: number) => {
    onConfigUpdate({ ...config, [field]: value });
  };

  const configItems = [
    // Operational Parameters
    { key: 'A_THRESHOLD_KM', label: 'A Inspection Threshold (km)', description: 'Mileage threshold for A-level inspection', category: 'operational' },
    { key: 'B_THRESHOLD_KM', label: 'B Inspection Threshold (km)', description: 'Mileage threshold for B-level inspection', category: 'operational' },
    { key: 'IOH_THRESHOLD_KM', label: 'IOH Threshold (km)', description: 'Intermediate Overhaul threshold', category: 'operational' },
    { key: 'POH_THRESHOLD_KM', label: 'POH Threshold (km)', description: 'Periodic Overhaul threshold', category: 'operational' },
    { key: 'NUM_INSPECTION_BAYS', label: 'Inspection Bays', description: 'Number of available inspection bays', category: 'operational' },
    { key: 'NUM_WORKSHOP_BAYS', label: 'Workshop Bays', description: 'Number of available workshop bays', category: 'operational' },
    { key: 'NUM_STABLING_SLOTS', label: 'Stabling Slots', description: 'Total number of stabling positions', category: 'operational' },
    { key: 'REQUIRED_IN_SERVICE', label: 'Required In Service', description: 'Minimum trains required in service', category: 'operational' },
    { key: 'MIN_RESERVE', label: 'Minimum Reserve', description: 'Minimum standby trains required', category: 'operational' },
    
    // Weight Parameters
    { key: 'W_SHUNT', label: 'Shunt Weight', description: 'Weight for shunting cost in objective function', category: 'weights' },
    { key: 'W_MILEAGE', label: 'Mileage Weight', description: 'Weight for mileage balancing (typically small)', category: 'weights' },
    { key: 'W_EXPECTED_FAILURE', label: 'Expected Failure Weight', description: 'Weight for expected failure cost', category: 'weights' },
    { key: 'W_OVER_IBL', label: 'Over IBL Penalty', description: 'Penalty for exceeding IBL capacity', category: 'weights' },
    { key: 'W_OVER_WORKSHOP', label: 'Over Workshop Penalty', description: 'Penalty for exceeding workshop capacity', category: 'weights' },
    { key: 'W_SHORT_IN_SERVICE', label: 'Short Service Penalty', description: 'Penalty for not meeting service requirements', category: 'weights' },
    { key: 'W_CLEANING_MISS', label: 'Cleaning Miss Penalty', description: 'Penalty for overdue cleaning (>30 days)', category: 'weights' },
    { key: 'W_BRANDING', label: 'Branding Weight', description: 'Weight for branding hours (negative to maximize)', category: 'weights' },
    { key: 'UNSCHEDULED_WITHDRAWAL_COST', label: 'Unscheduled Withdrawal Cost', description: 'Cost of unscheduled train withdrawal', category: 'weights' },
  ];

  const operationalItems = configItems.filter(item => item.category === 'operational');
  const weightItems = configItems.filter(item => item.category === 'weights');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Scheduling Configuration</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Adjust the scheduling parameters to meet your operational requirements.
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Operational Parameters */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-4">Operational Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operationalItems.map(({ key, label, description }) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  type="number"
                  value={config[key]}
                  onChange={(e) => updateConfig(key, Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  min="0"
                />
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weight Parameters */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-4">Optimization Weights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weightItems.map(({ key, label, description }) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  type="number"
                  value={config[key]}
                  onChange={(e) => updateConfig(key, Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  step={key.includes('W_MILEAGE') || key.includes('W_EXPECTED_FAILURE') ? '0.00001' : key.includes('W_BRANDING') ? '100' : '1'}
                />
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shunt Cost Information */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Shunt Cost Configuration</h4>
          <p className="text-xs text-blue-700 mb-2">
            Shunt costs are randomly assigned per train position with values: 120, 180, 240, 300, 420, 600, 900
          </p>
          <div className="text-xs text-blue-600">
            Current costs: {Object.entries(config.shunt_cost_by_pos).slice(0, 10).map(([pos, cost]) => `P${pos}:${cost}`).join(', ')}
            {Object.keys(config.shunt_cost_by_pos).length > 10 && '...'}
          </div>
        </div>
      </div>
    </div>
  );
};