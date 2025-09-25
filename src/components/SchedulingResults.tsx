import React from 'react';
import { Clock, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';

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
  train: Train;
}

interface SchedulingResultsProps {
  results: ScheduleResult[];
  summary: {
    inService: number;
    standby: number;
    ibl: number;
    workshop: number;
  };
}

export const SchedulingResults: React.FC<SchedulingResultsProps> = ({
  results,
  summary,
}) => {
  const getAssignmentIcon = (assignment: string) => {
    switch (assignment) {
      case 'IN_SERVICE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'STANDBY':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'IBL':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'WORKSHOP':
        return <Wrench className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getAssignmentColor = (assignment: string) => {
    switch (assignment) {
      case 'IN_SERVICE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'STANDBY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IBL':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'WORKSHOP':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const fitnessOK = (fitness: { RS: boolean; SIG: boolean; TEL: boolean }) => {
    return fitness.RS && fitness.SIG && fitness.TEL;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Scheduling Results</h3>
        <p className="text-sm text-gray-600 mt-1">
          Optimized train assignments based on current fleet status and operational constraints.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-900">{summary.inService}</div>
                <div className="text-sm text-green-700">In Service</div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-900">{summary.standby}</div>
                <div className="text-sm text-blue-700">Standby</div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-900">{summary.ibl}</div>
                <div className="text-sm text-yellow-700">IBL</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-900">{summary.workshop}</div>
                <div className="text-sm text-red-700">Workshop</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Train ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Since A</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Since B</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P Fail</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Clean</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fitness</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branding</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => (
              <tr key={result.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{result.id}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getAssignmentColor(result.assignment)}`}>
                    {getAssignmentIcon(result.assignment)}
                    <span>{result.assignment}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-600 max-w-xs truncate" title={result.reason}>
                    {result.reason}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{result.train.since_A.toLocaleString()}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{result.train.since_B.toLocaleString()}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    result.train.state === 'OK' ? 'bg-green-100 text-green-800' :
                    result.train.state === 'IOH' ? 'bg-yellow-100 text-yellow-800' :
                    result.train.state === 'POH' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {result.train.state}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{result.train.p_fail.toFixed(3)}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{result.train.days_since_clean}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    fitnessOK(result.train.fitness) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {fitnessOK(result.train.fitness) ? 'OK' : 'Issues'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{result.train.branding_hours}h</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};