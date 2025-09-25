import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onDataLoad: (data: any[]) => void;
  onError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoad, onError }) => {
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          // Auto-detect data types
          if (!isNaN(Number(value)) && value !== '') {
            row[header] = Number(value);
          } else if (value.toLowerCase() === 'true') {
            row[header] = true;
          } else if (value.toLowerCase() === 'false') {
            row[header] = false;
          } else {
            row[header] = value;
          }
        });
        data.push(row);
      }
    }
    return data;
  };

  const convertToTrainFormat = (data: any[]): any[] => {
    return data.map((row, index) => ({
      id: row.id || row.ID || `T${(index + 1).toString().padStart(2, '0')}`,
      mileage_total: Number(row.mileage_total || row.total_mileage || row.mileage || 100000),
      since_A: Number(row.since_A || row.a_inspection || row.since_a || 1000),
      since_B: Number(row.since_B || row.b_inspection || row.since_b || 8000),
      state: row.state || row.status || 'OK',
      p_fail: Number(row.p_fail || row.failure_prob || row.prob_fail || 0.01),
      pos: Number(row.pos || row.position || index),
      days_since_clean: Number(row.days_since_clean || row.cleaning_days || row.clean_days || 10),
      fitness: {
        RS: row.fitness_RS !== undefined ? Boolean(row.fitness_RS) : 
            row.RS !== undefined ? Boolean(row.RS) : true,
        SIG: row.fitness_SIG !== undefined ? Boolean(row.fitness_SIG) : 
             row.SIG !== undefined ? Boolean(row.SIG) : true,
        TEL: row.fitness_TEL !== undefined ? Boolean(row.fitness_TEL) : 
             row.TEL !== undefined ? Boolean(row.TEL) : true
      },
      branding_hours: Number(row.branding_hours || row.branding || 8)
    }));
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rawData = parseCSV(text);
        
        if (rawData.length === 0) {
          onError('No valid data found in the file. Please check the CSV format.');
          return;
        }

        const trainData = convertToTrainFormat(rawData);
        onDataLoad(trainData);
      } catch (error) {
        onError(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  }, [onDataLoad, onError]);

  const handleSampleData = () => {
    const sampleData = [
      {
        id: 'T01', mileage_total: 120000, since_A: 4000, since_B: 12000, state: 'OK', p_fail: 0.01,
        pos: 0, days_since_clean: 15, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 8
      },
      {
        id: 'T02', mileage_total: 150000, since_A: 3000, since_B: 14000, state: 'OK', p_fail: 0.02,
        pos: 1, days_since_clean: 32, fitness: { RS: true, SIG: true, TEL: false }, branding_hours: 10
      },
      {
        id: 'T03', mileage_total: 180000, since_A: 6000, since_B: 10000, state: 'OK', p_fail: 0.03,
        pos: 2, days_since_clean: 20, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 6
      },
      {
        id: 'T04', mileage_total: 220000, since_A: 2000, since_B: 12000, state: 'IOH', p_fail: 0.05,
        pos: 3, days_since_clean: 40, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 12
      },
      {
        id: 'T05', mileage_total: 250000, since_A: 7000, since_B: 15000, state: 'OK', p_fail: 0.01,
        pos: 4, days_since_clean: 10, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 7
      },
      {
        id: 'T06', mileage_total: 300000, since_A: 1000, since_B: 5000, state: 'POH', p_fail: 0.06,
        pos: 5, days_since_clean: 5, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 9
      },
      {
        id: 'T07', mileage_total: 320000, since_A: 4000, since_B: 16000, state: 'OK', p_fail: 0.02,
        pos: 6, days_since_clean: 35, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 8
      },
      {
        id: 'T08', mileage_total: 350000, since_A: 3000, since_B: 8000, state: 'OK', p_fail: 0.01,
        pos: 7, days_since_clean: 25, fitness: { RS: true, SIG: false, TEL: true }, branding_hours: 11
      },
      {
        id: 'T09', mileage_total: 400000, since_A: 5000, since_B: 10000, state: 'HEAVY_REPAIR', p_fail: 0.07,
        pos: 8, days_since_clean: 45, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 5
      },
      {
        id: 'T10', mileage_total: 420000, since_A: 2500, since_B: 12000, state: 'OK', p_fail: 0.015,
        pos: 9, days_since_clean: 12, fitness: { RS: true, SIG: true, TEL: true }, branding_hours: 10
      }
    ];
    onDataLoad(sampleData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 rounded-full">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Train Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file with train information or use sample data to get started
          </p>
        </div>

        <div className="space-y-3">
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="sr-only"
            />
            <div className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 transition-colors">
              <FileText className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-blue-600 font-medium">Choose CSV File</span>
            </div>
          </label>

          <div className="text-xs text-gray-500">or</div>

          <button
            onClick={handleSampleData}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Load Sample Data
          </button>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium mb-1">Expected CSV columns:</div>
              <div className="space-y-0.5">
                <div>• <strong>Required:</strong> id, mileage_total, since_A, since_B</div>
                <div>• <strong>Optional:</strong> state, p_fail, pos, days_since_clean</div>
                <div>• <strong>Fitness:</strong> RS, SIG, TEL (or fitness_RS, fitness_SIG, fitness_TEL)</div>
                <div>• <strong>Other:</strong> branding_hours</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};