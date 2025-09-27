import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  RefreshCw, 
  MapPin,
  Wrench,
  Calendar,
  Activity
} from 'lucide-react';
import { MapPin } from "lucide-react";
import { BayAllocator } from '../utils/bayAllocator';
import { 
  AllocationPlan, 
  BayConfiguration, 
  ForecastParameters, 
  TrainReadiness,
  BayAssignment 
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

interface BayAllocationDashboardProps {
  scheduleResults: ScheduleResult[];
}

export const BayAllocationDashboard: React.FC<BayAllocationDashboardProps> = ({
  scheduleResults
}) => {
  const [currentPlan, setCurrentPlan] = useState<AllocationPlan | null>(null);
  const [trainReadiness, setTrainReadiness] = useState<TrainReadiness[]>([]);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const bayConfig: BayConfiguration = {
    primaryBays: ['A1', 'B1', 'C1'],
    standbyBays: ['A2', 'B2', 'C2'],
    overflowBays: ['A3', 'B3', 'C3'],
    maxShuntingDistance: 5
  };

  const forecastParams: ForecastParameters = {
    cleaningThresholdDays: 30,
    minBrandingHours: 8,
    runtimeBalanceWeight: 0.1,
    jobCardWeight: 0.3,
    shuntingPenalty: 10,
    readinessThreshold: 70
  };

  const allocator = new BayAllocator(bayConfig, forecastParams);

  useEffect(() => {
    if (scheduleResults.length > 0) {
      // Generate initial daily forecast
      const dailyPlan = allocator.generateDailyForecast(scheduleResults);
      setCurrentPlan(dailyPlan);
      
      // Generate mock readiness data
      const readiness = allocator.generateMockReadiness(scheduleResults);
      setTrainReadiness(readiness);
    }
  }, [scheduleResults]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRealTimeMode && currentPlan && trainReadiness.length > 0) {
      interval = setInterval(() => {
        // Simulate real-time updates
        const updatedReadiness = trainReadiness.map(r => ({
          ...r,
          readinessScore: Math.max(0, r.readinessScore + (Math.random() - 0.5) * 10),
          isReady: Math.random() > 0.1, // 90% ready rate
          lastUpdated: new Date()
        }));
        
        setTrainReadiness(updatedReadiness);
        
        const updatedPlan = allocator.updateRealTimeAllocation(
          currentPlan,
          updatedReadiness,
          scheduleResults
        );
        
        setCurrentPlan(updatedPlan);
        setLastUpdate(new Date());
      }, 5000); // Update every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeMode, currentPlan, trainReadiness]);

  const generateNewDailyForecast = () => {
    if (scheduleResults.length > 0) {
      const dailyPlan = allocator.generateDailyForecast(scheduleResults);
      setCurrentPlan(dailyPlan);
      setIsRealTimeMode(false);
    }
  };

  const getBayStatusColor = (bay: BayAssignment) => {
    if (!bay.trainId) return 'bg-gray-100 border-gray-300';
    
    const readiness = trainReadiness.find(r => r.id === bay.trainId);
    if (!readiness) return 'bg-blue-100 border-blue-300';
    
    if (readiness.readinessScore >= 80) return 'bg-green-100 border-green-300';
    if (readiness.readinessScore >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getBayIcon = (bayType: string) => {
    switch (bayType) {
      case 'PRIMARY': return <MapPin className="w-4 h-4 text-green-600" />;
      case 'STANDBY': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'OVERFLOW': return <Activity className="w-4 h-4 text-orange-600" />;
      default: return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!currentPlan) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Bay Allocation System
          </h3>
          <p className="text-gray-600">
            Generate a schedule first to create bay allocations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Train Bay Allocation & Forecasting System
            </h2>
            <p className="text-gray-600">
              Mode: <span className="font-semibold">{currentPlan.mode.replace('_', ' ')}</span> | 
              Last Updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={generateNewDailyForecast}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Daily Forecast
            </button>
            <button
              onClick={() => setIsRealTimeMode(!isRealTimeMode)}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                isRealTimeMode
                  ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                  : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRealTimeMode ? 'animate-spin' : ''}`} />
              {isRealTimeMode ? 'Stop Real-Time' : 'Start Real-Time'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-900">
                {currentPlan.summary.primaryBaysOccupied}
              </div>
              <div className="text-sm text-green-700">Primary Bays</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {currentPlan.summary.standbyBaysOccupied}
              </div>
              <div className="text-sm text-blue-700">Standby Bays</div>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {currentPlan.summary.overflowBaysOccupied}
              </div>
              <div className="text-sm text-orange-700">Overflow Bays</div>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2">
            <ArrowRight className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {currentPlan.summary.totalShuntingSteps}
              </div>
              <div className="text-sm text-purple-700">Shunting Steps</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bay Layout */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bay Layout</h3>
        
        <div className="grid grid-cols-3 gap-6">
          {['A', 'B', 'C'].map(section => (
            <div key={section} className="space-y-3">
              <h4 className="text-md font-medium text-gray-700 text-center">
                Section {section}
              </h4>
              
              {[1, 2, 3].map(bayNum => {
                const bayId = `${section}${bayNum}`;
                const bay = currentPlan.bays.find(b => b.bayId === bayId);
                const readiness = bay?.trainId ? trainReadiness.find(r => r.id === bay.trainId) : null;
                
                return (
                  <div
                    key={bayId}
                    className={`p-4 rounded-lg border-2 ${getBayStatusColor(bay!)} transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getBayIcon(bay?.bayType || '')}
                        <span className="font-semibold">{bayId}</span>
                      </div>
                      {readiness && (
                        <div className="flex items-center space-x-1">
                          {readiness.isReady ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs font-medium">
                            {readiness.readinessScore.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {bay?.trainId ? (
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{bay.trainId}</div>
                        <div className="text-xs text-gray-600">{bay.reason}</div>
                        {bay.departureTime && (
                          <div className="text-xs text-blue-600">
                            Departs: {bay.departureTime.toLocaleTimeString()}
                          </div>
                        )}
                        {readiness && readiness.issues.length > 0 && (
                          <div className="text-xs text-red-600">
                            Issues: {readiness.issues.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Available</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Changes */}
      {currentPlan.changes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Changes</h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {currentPlan.changes
              .slice(-10)
              .reverse()
              .map((change, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {change.type === 'REPLACEMENT' ? (
                      <ArrowRight className="w-4 h-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {change.reason}
                    </div>
                    <div className="text-xs text-gray-500">
                      {change.timestamp.toLocaleTimeString()} | 
                      Shunting: {change.shuntingSteps} step(s)
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};