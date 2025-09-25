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
    { key: 'A_THRESHOLD_KM', label: 'A Inspection Threshold (km)', description: 'Mileage threshold for A-level inspection' },
    { key: 'B_THRESHOLD_KM', label: 'B Inspection Threshold (km)', description: 'Mileage threshold for B-level inspection' },
    { key: 'IOH_THRESHOLD_KM', label: 'IOH Threshold (km)', description: 'Intermediate Overhaul threshold' },
    { key: 'POH_THRESHOLD_KM', label: 'POH Threshold (km)', description: 'Periodic Overhaul threshold' },
    { key: 'NUM_INSPECTION_BAYS', label: 'Inspection Bays', description: 'Number of available inspection bays' },
    { key: 'NUM_WORKSHOP_BAYS', label: 'Workshop Bays', description: 'Number of available workshop bays' },
    { key: 'NUM_STABLING_SLOTS', label: 'Stabling Slots', description: 'Total number of stabling positions' },
    { key: 'REQUIRED_IN_SERVICE', label: 'Required In Service', description: 'Minimum trains required in service' },
    { key: 'MIN_RESERVE', label: 'Minimum Reserve', description: 'Minimum standby trains required' },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configItems.map(({ key, label, description }) => (
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
    </div>
  );
};