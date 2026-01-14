'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { PlateConfiguration, getPlateConfiguration, savePlateConfiguration, STANDARD_PLATES, BARBELL_WEIGHT } from '@/lib/plateCalculator';

interface PlateSettingsProps {
  onClose: () => void;
}

export default function PlateSettings({ onClose }: PlateSettingsProps) {
  const [plates, setPlates] = useState<PlateConfiguration[]>([]);
  const [barbellWeight, setBarbellWeight] = useState(BARBELL_WEIGHT);
  const [newPlateWeight, setNewPlateWeight] = useState('');

  useEffect(() => {
    const config = getPlateConfiguration();
    setPlates(config);
    
    // Load barbell weight from localStorage
    try {
    const stored = localStorage.getItem('barbell-weight');
    if (stored) {
      setBarbellWeight(parseFloat(stored));
      }
    } catch (error) {
      console.warn('Failed to read barbell weight from localStorage:', error);
    }
  }, []);

  const handleSave = () => {
    savePlateConfiguration(plates);
    try {
    localStorage.setItem('barbell-weight', barbellWeight.toString());
    } catch (error) {
      console.warn('Failed to save barbell weight to localStorage:', error);
    }
    onClose();
  };

  const handleUpdatePlate = (index: number, field: 'weight' | 'available', value: number) => {
    const updated = [...plates];
    updated[index] = { ...updated[index], [field]: value };
    setPlates(updated);
  };

  const handleAddPlate = () => {
    const weight = parseFloat(newPlateWeight);
    if (isNaN(weight) || weight <= 0) {
      alert('Please enter a valid weight');
      return;
    }
    setPlates([...plates, { weight, available: 2 }]);
    setNewPlateWeight('');
  };

  const handleDeletePlate = (index: number) => {
    setPlates(plates.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    if (confirm('Reset to default plate configuration?')) {
      const defaultPlates = STANDARD_PLATES.map(w => ({ weight: w, available: 10 }));
      setPlates(defaultPlates);
      setBarbellWeight(BARBELL_WEIGHT);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#15151c] border border-[#242432] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-100">
            Plate Configuration
          </h3>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#1f232b] text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Configure your available plates for accurate plate math calculations.
        </p>

        {/* Barbell Weight */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Barbell Weight (lbs)
          </label>
          <input
            type="number"
            value={barbellWeight}
            onChange={(e) => setBarbellWeight(parseFloat(e.target.value) || 45)}
            className="w-full min-h-[44px] px-3 py-2 border border-[#2a2f3a] rounded-lg bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
          />
        </div>

        {/* Existing Plates */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Available Plates
          </h4>
          <div className="space-y-2">
            {plates
              .sort((a, b) => b.weight - a.weight)
              .map((plate, index) => {
                const originalIndex = plates.findIndex(p => p === plate);
                return (
                  <div key={originalIndex} className="flex items-center gap-2">
                    <input
                      type="number"
                      value={plate.weight}
                      onChange={(e) => handleUpdatePlate(originalIndex, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-24 min-h-[44px] px-3 py-2 border border-[#2a2f3a] rounded-lg bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                      placeholder="Weight"
                    />
                    <span className="text-sm text-gray-500">lbs ×</span>
                    <input
                      type="number"
                      value={plate.available}
                      onChange={(e) => handleUpdatePlate(originalIndex, 'available', parseInt(e.target.value) || 0)}
                      className="w-20 min-h-[44px] px-3 py-2 border border-[#2a2f3a] rounded-lg bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                      placeholder="Count"
                    />
                    <span className="text-sm text-gray-500">plates</span>
                    <button
                      onClick={() => handleDeletePlate(originalIndex)}
                      className="ml-auto min-w-[44px] min-h-[44px] rounded-lg hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Add New Plate */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Add Plate
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              value={newPlateWeight}
              onChange={(e) => setNewPlateWeight(e.target.value)}
              placeholder="Weight (lbs)"
              className="flex-1 min-h-[44px] px-3 py-2 border border-[#2a2f3a] rounded-lg bg-[#0f1218] text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
            />
            <button
              onClick={handleAddPlate}
              className="px-4 py-2 min-h-[44px] bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 min-h-[44px] py-3 px-4 bg-[#1f232b] text-gray-200 rounded-xl font-semibold hover:bg-[#2a2f3a] transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            className="flex-1 min-h-[44px] py-3 px-4 bg-[#c6ff5e] hover:bg-[#b6f54e] text-black rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

