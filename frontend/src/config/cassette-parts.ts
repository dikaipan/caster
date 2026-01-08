export interface CassettePart {
  id: string;
  name: string;
  category: 'outer' | 'inner';
}

export interface CassettePartsConfig {
  SR: {
    outer: CassettePart[];
    inner: CassettePart[];
  };
  VS: {
    outer: CassettePart[];
    inner: CassettePart[];
  };
}

export const CASSETTE_PARTS: CassettePartsConfig = {
  SR: {
    outer: [
      { id: 'sr-outer-1', name: 'Fascia key', category: 'outer' },
      { id: 'sr-outer-2', name: 'Handle', category: 'outer' },
      { id: 'sr-outer-3', name: 'Body', category: 'outer' },
      { id: 'sr-outer-4', name: 'Roller', category: 'outer' },
      { id: 'sr-outer-5', name: 'Inlet', category: 'outer' },
      { id: 'sr-outer-6', name: 'Docking', category: 'outer' },
    ],
    inner: [
      { id: 'sr-inner-1', name: 'Top Guide', category: 'inner' },
      { id: 'sr-inner-2', name: 'Side Guide +3', category: 'inner' },
      { id: 'sr-inner-3', name: 'Tentakel', category: 'inner' },
      { id: 'sr-inner-4', name: 'Inside Gear (z23/z24)', category: 'inner' },
      { id: 'sr-inner-5', name: 'Fixing Pins', category: 'inner' },
      { id: 'sr-inner-6', name: 'Bottom Gear +2', category: 'inner' },
      { id: 'sr-inner-7', name: 'Pusher Plate', category: 'inner' },
      { id: 'sr-inner-8', name: 'Roller pusher plate +2', category: 'inner' },
      { id: 'sr-inner-9', name: 'Stack Guide 3', category: 'inner' },
      { id: 'sr-inner-10', name: 'Timing Belt', category: 'inner' },
      { id: 'sr-inner-11', name: 'Cover Sensor', category: 'inner' },
    ],
  },
  VS: {
    outer: [
      { id: 'vs-outer-1', name: 'Head cover BH-PM7626094M', category: 'outer' },
      { id: 'vs-outer-2', name: 'Handle BH-PM7626094E', category: 'outer' },
      { id: 'vs-outer-3', name: 'Gear to LF BH-PM7613167V', category: 'outer' },
      { id: 'vs-outer-4', name: 'Feed Gear BH-PM7628721B', category: 'outer' },
      { id: 'vs-outer-5', name: 'Pusher plate Gear BH-P4P005190-001', category: 'outer' },
      { id: 'vs-outer-6', name: 'Inlet BH-PM7626094M', category: 'outer' },
      { id: 'vs-outer-7', name: 'Docking BH-P2P003988A', category: 'outer' },
    ],
    inner: [
      { id: 'vs-inner-1', name: 'Top Guide BH-PM7626094E', category: 'inner' },
      { id: 'vs-inner-2', name: 'Side Guide +3 BH-P2P005419-002 BH-P2P005419-001', category: 'inner' },
      { id: 'vs-inner-3', name: 'SF ASSY BH-PM7628721C', category: 'inner' },
      { id: 'vs-inner-4', name: 'Side Guide', category: 'inner' },
      { id: 'vs-inner-5', name: 'Pusher Plate BH-P2P004406-001 (AB)', category: 'inner' },
      { id: 'vs-inner-6', name: 'Timing Belt BH-PY69608-031', category: 'inner' },
      { id: 'vs-inner-7', name: 'Pin Side Guide', category: 'inner' },
      { id: 'vs-inner-8', name: 'Spring Fascia', category: 'inner' },
    ],
  },
};

export function getPartsForMachineType(machineType: 'SR' | 'VS' | string | undefined): {
  outer: CassettePart[];
  inner: CassettePart[];
} {
  if (!machineType || (machineType !== 'SR' && machineType !== 'VS')) {
    return { outer: [], inner: [] };
  }
  return CASSETTE_PARTS[machineType];
}

