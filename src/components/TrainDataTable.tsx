import React from 'react';
import { CreditCard as Edit2, Check, X } from 'lucide-react';

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

interface TrainDataTableProps {
  trains: Train[];
  onTrainsUpdate: (trains: Train[]) => void;
  editingRow: number | null;
  onEditingRowChange: (row: number | null) => void;
}

export const TrainDataTable: React.FC<TrainDataTableProps> = ({
  trains,
  onTrainsUpdate,
  editingRow,
  onEditingRowChange,
}) => {
  const [editData, setEditData] = React.useState<Train | null>(null);

  const startEdit = (index: number) => {
    setEditData({ ...trains[index] });
    onEditingRowChange(index);
  };

  const cancelEdit = () => {
    setEditData(null);
    onEditingRowChange(null);
  };

  const saveEdit = () => {
    if (editData && editingRow !== null) {
      const newTrains = [...trains];
      newTrains[editingRow] = editData;
      onTrainsUpdate(newTrains);
      setEditData(null);
      onEditingRowChange(null);
    }
  };

  const updateEditData = (field: string, value: any) => {
    if (editData) {
      if (field.startsWith('fitness.')) {
        const fitnessField = field.split('.')[1];
        setEditData({
          ...editData,
          fitness: { ...editData.fitness, [fitnessField]: value }
        });
      } else {
        setEditData({ ...editData, [field]: value });
      }
    }
  };

  const renderCell = (train: Train, index: number, field: string, value: any) => {
    if (editingRow === index) {
      if (field === 'state') {
        return (
          <select
            value={editData?.[field as keyof Train] as string || ''}
            onChange={(e) => updateEditData(field, e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            <option value="OK">OK</option>
            <option value="IOH">IOH</option>
            <option value="POH">POH</option>
            <option value="HEAVY_REPAIR">HEAVY_REPAIR</option>
          </select>
        );
      }
      
      if (field.startsWith('fitness.')) {
        const fitnessField = field.split('.')[1];
        return (
          <input
            type="checkbox"
            checked={editData?.fitness[fitnessField as keyof typeof editData.fitness] || false}
            onChange={(e) => updateEditData(field, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        );
      }
      
      if (typeof value === 'number') {
        return (
          <input
            type="number"
            value={editData?.[field as keyof Train] as number || 0}
            onChange={(e) => updateEditData(field, Number(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            step={field === 'p_fail' ? 0.001 : 1}
          />
        );
      }
      
      return (
        <input
          type="text"
          value={editData?.[field as keyof Train] as string || ''}
          onChange={(e) => updateEditData(field, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
        />
      );
    }

    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ✗
        </span>
      );
    }

    if (field === 'state') {
      const stateColors = {
        'OK': 'bg-green-100 text-green-800',
        'IOH': 'bg-yellow-100 text-yellow-800',
        'POH': 'bg-blue-100 text-blue-800',
        'HEAVY_REPAIR': 'bg-red-100 text-red-800'
      };
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stateColors[value as keyof typeof stateColors] || 'bg-gray-100 text-gray-800'}`}>
          {value}
        </span>
      );
    }

    return <span className="text-sm text-gray-900">{value}</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Train Fleet Data</h3>
        <p className="text-sm text-gray-600 mt-1">
          Review and edit train information. Click the edit icon to modify any row.
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Mileage</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Since A</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Since B</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P Fail</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Clean</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RS</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIG</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TEL</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branding</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trains.map((train, index) => (
              <tr key={train.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-4 whitespace-nowrap">
                  {editingRow === index ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={saveEdit}
                        className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(index)}
                      disabled={editingRow !== null}
                      className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'id', train.id)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'mileage_total', train.mileage_total)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'since_A', train.since_A)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'since_B', train.since_B)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'state', train.state)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'p_fail', train.p_fail)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'pos', train.pos)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'days_since_clean', train.days_since_clean)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'fitness.RS', train.fitness.RS)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'fitness.SIG', train.fitness.SIG)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'fitness.TEL', train.fitness.TEL)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{renderCell(train, index, 'branding_hours', train.branding_hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};