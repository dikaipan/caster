'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Cassette {
  id: string;
  serialNumber: string;
}

interface CassetteSelectionListProps {
  selectedCassettes: Cassette[];
  MAX_CASSETTES: number;
  onClear: () => void;
}

export default function CassetteSelectionList({
  selectedCassettes,
  MAX_CASSETTES,
  onClear,
}: CassetteSelectionListProps) {
  if (selectedCassettes.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-teal-50/50 dark:bg-teal-900/10 border-2 border-teal-200 dark:border-teal-800/50 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {selectedCassettes.length} kaset dipilih
          </p>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
            Tiket akan dibuat terpisah untuk setiap kaset
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedCassettes.map((cassette) => (
              <span
                key={cassette.id}
                className="text-xs bg-white dark:bg-slate-700 border border-teal-300 dark:border-teal-700/50 px-2 py-1 rounded font-mono text-gray-900 dark:text-slate-200"
              >
                {cassette.serialNumber}
              </span>
            ))}
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="text-xs">
          Clear
        </Button>
      </div>
    </div>
  );
}

