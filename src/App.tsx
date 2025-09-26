import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { TrainDataTable } from './components/TrainDataTable';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { SchedulingResults } from './components/SchedulingResults';
import { scheduleTrains } from './utils/scheduler';
import { Play, FileSpreadsheet, Settings, BarChart3 } from 'lucide-react';

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

function App() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [scheduleResults, setScheduleResults] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'edit' | 'config' | 'results'>('upload');
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  // Generate random shunt costs for positions (matching Python logic)
  const generateShuntCosts = (numTrains: number) => {
    const costs: { [key: number]: number } = {};
    const possibleCosts = [120, 180, 240, 300, 420, 600, 900];
    for (let i = 0; i < numTrains; i++) {
      costs[i] = possibleCosts[Math.floor(Math.random() * possibleCosts.length)];
    }
    return costs;
  };

  const [config, setConfig] = useState<SchedulingConfig>({
    A_THRESHOLD_KM: 5000,
    B_THRESHOLD_KM: 15000,
    IOH_THRESHOLD_KM: 420000,
    POH_THRESHOLD_KM: 840000,
    NUM_INSPECTION_BAYS: 3,
    NUM_WORKSHOP_BAYS: 2,
    NUM_STABLING_SLOTS: 25,
    REQUIRED_IN_SERVICE: 10,
    MIN_RESERVE: 2,
    CANDIDATE_POOL_SIZE: 15,
    // Weight parameters from Python code
    W_SHUNT: 1,
    W_MILEAGE: 0.0001,
    W_EXPECTED_FAILURE: 0.00001,
    W_OVER_IBL: 200000,
    W_OVER_WORKSHOP: 250000,
    W_SHORT_IN_SERVICE: 500000,
    W_CLEANING_MISS: 20000,
    W_BRANDING: -1000, // negative because we want to maximize branding exposure
    UNSCHEDULED_WITHDRAWAL_COST: 100000,
    shunt_cost_by_pos: generateShuntCosts(25),
  });

  const handleDataLoad = (data: Train[]) => {
    setTrains(data);
    setCurrentStep('edit');
    setError('');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleTrainsUpdate = (updatedTrains: Train[]) => {
    setTrains(updatedTrains);
  };

  const handleSchedule = () => {
    if (trains.length === 0) {
      setError('Please load train data first.');
      return;
    }

    const results = scheduleTrains(trains, config);
    setScheduleResults(results);
    setCurrentStep('results');
    setError('');
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'upload':
        return <FileSpreadsheet className="w-5 h-5" />;
      case 'edit':
        return <FileSpreadsheet className="w-5 h-5" />;
      case 'config':
        return <Settings className="w-5 h-5" />;
      case 'results':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['upload', 'edit', 'config', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'upload', name: 'Import Data' },
      { id: 'edit', name: 'Review & Edit' },
      { id: 'config', name: 'Configuration' },
      { id: 'results', name: 'Scheduling Results' },
    ];

    return (
      <nav className="mb-8">
        <ol className="flex items-center space-x-5">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            return (
              <li key={step.id} className="flex items-center">
                {index > 0 && (
                  <div className={`flex-shrink-0 w-5 h-px ${
                    status === 'completed' ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
                <button
                  onClick={() => {
                    if (step.id === 'edit' && trains.length > 0) setCurrentStep('edit');
                    if (step.id === 'config' && trains.length > 0) setCurrentStep('config');
                    if (step.id === 'results' && scheduleResults) setCurrentStep('results');
                    if (step.id === 'upload') setCurrentStep('upload');
                  }}
                  disabled={
                    (step.id === 'edit' && trains.length === 0) ||
                    (step.id === 'config' && trains.length === 0) ||
                    (step.id === 'results' && !scheduleResults)
                  }
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status === 'current'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : status === 'completed'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {getStepIcon(step.id)}
                  <span>{step.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Train Scheduling Management System
          </h1>
          <p className="text-gray-600">
            Optimize train fleet assignments with constraint-based scheduling
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {currentStep === 'upload' && (
            <FileUpload onDataLoad={handleDataLoad} onError={handleError} />
          )}

          {currentStep === 'edit' && trains.length > 0 && (
            <div className="space-y-6">
              <TrainDataTable
                trains={trains}
                onTrainsUpdate={handleTrainsUpdate}
                editingRow={editingRow}
                onEditingRowChange={setEditingRow}
              />
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('config')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Parameters
                </button>
              </div>
            </div>
          )}

          {currentStep === 'config' && (
            <div className="space-y-6">
              <ConfigurationPanel config={config} onConfigUpdate={setConfig} />
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('edit')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Data
                </button>
                <button
                  onClick={handleSchedule}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Generate Schedule
                </button>
              </div>
            </div>
          )}

          {currentStep === 'results' && scheduleResults && (
            <div className="space-y-6">
              <SchedulingResults
                results={scheduleResults.results}
                summary={scheduleResults.summary}
              />
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('config')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Modify Configuration
                </button>
                <button
                  onClick={handleSchedule}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Regenerate Schedule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;