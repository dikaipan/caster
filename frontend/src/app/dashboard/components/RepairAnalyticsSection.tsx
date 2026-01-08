import dynamic from 'next/dynamic';
import { Wrench } from 'lucide-react';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" /></div>,
});

interface RepairAnalyticsSectionProps {
  repairAnalytics: any;
}

export function RepairAnalyticsSection({ repairAnalytics }: RepairAnalyticsSectionProps) {
  if (!repairAnalytics) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
        <Wrench className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Tidak ada data analitik perbaikan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {repairAnalytics.successRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            {repairAnalytics.qcPassed || 0} lulus QC dari {repairAnalytics.completedRepairs || 0} perbaikan selesai
          </p>
          {repairAnalytics.qcFailed > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {repairAnalytics.qcFailed} gagal QC
            </p>
          )}
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Perbaikan</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {repairAnalytics.totalRepairs || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            {repairAnalytics.completedRepairs || 0} selesai
            {repairAnalytics.statusBreakdown?.ON_PROGRESS > 0 && (
              <span className="ml-2">• {repairAnalytics.statusBreakdown.ON_PROGRESS} dalam proses</span>
            )}
          </p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Parts Replaced</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {repairAnalytics.totalPartsReplaced || repairAnalytics.partsReplacedCount || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            {repairAnalytics.partsReplacedCount || 0} jenis komponen berbeda
            {repairAnalytics.avgPartsPerRepair > 0 && (
              <span className="block mt-1">
                Rata-rata {repairAnalytics.avgPartsPerRepair.toFixed(1)} parts per perbaikan
              </span>
            )}
          </p>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Repair Status</p>
          <div className="space-y-1 mt-2">
            {repairAnalytics.statusBreakdown?.COMPLETED > 0 && (
              <p className="text-xs">
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {repairAnalytics.statusBreakdown.COMPLETED}
                </span>
                <span className="text-gray-600 dark:text-slate-400 ml-1">Selesai</span>
              </p>
            )}
            {repairAnalytics.statusBreakdown?.ON_PROGRESS > 0 && (
              <p className="text-xs">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {repairAnalytics.statusBreakdown.ON_PROGRESS}
                </span>
                <span className="text-gray-600 dark:text-slate-400 ml-1">Dalam Proses</span>
              </p>
            )}
            {repairAnalytics.statusBreakdown?.DIAGNOSING > 0 && (
              <p className="text-xs">
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {repairAnalytics.statusBreakdown.DIAGNOSING}
                </span>
                <span className="text-gray-600 dark:text-slate-400 ml-1">Diagnosis</span>
              </p>
            )}
            {repairAnalytics.statusBreakdown?.RECEIVED > 0 && (
              <p className="text-xs">
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  {repairAnalytics.statusBreakdown.RECEIVED}
                </span>
                <span className="text-gray-600 dark:text-slate-400 ml-1">Diterima</span>
              </p>
            )}
            {repairAnalytics.statusBreakdown?.SCRAPPED > 0 && (
              <p className="text-xs">
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {repairAnalytics.statusBreakdown.SCRAPPED}
                </span>
                <span className="text-gray-600 dark:text-slate-400 ml-1">Scrapped</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Issues */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top 10 Issues</h3>
        {repairAnalytics.topIssues && repairAnalytics.topIssues.length > 0 ? (
          <div className="h-64">
            <Bar
              data={{
                labels: repairAnalytics.topIssues.map((item: any) =>
                  item.issue.length > 40 ? item.issue.substring(0, 40) + '...' : item.issue
                ),
                datasets: [{
                  label: 'Frekuensi',
                  data: repairAnalytics.topIssues.map((item: any) => item.count),
                  backgroundColor: 'rgba(249, 115, 22, 0.6)',
                  borderColor: 'rgba(249, 115, 22, 1)',
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context: any) => {
                        const item = repairAnalytics.topIssues[context[0].dataIndex];
                        return item.issue;
                      },
                      afterLabel: (context: any) => {
                        const item = repairAnalytics.topIssues[context[0].dataIndex];
                        return `Frekuensi: ${item.count}${item.percentage ? ` (${item.percentage}%)` : ''}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { 
                    ticks: { 
                      maxRotation: 45, 
                      minRotation: 45,
                      autoSkip: false,
                    } 
                  },
                  y: { 
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tidak ada data issues</p>
        )}
      </div>

      {/* Top Parts */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top 10 Parts Replacement</h3>
        {repairAnalytics.topParts && repairAnalytics.topParts.length > 0 ? (
          <div className="h-64">
            <Bar
              data={{
                labels: repairAnalytics.topParts.map((item: any) => 
                  item.part.length > 30 ? item.part.substring(0, 30) + '...' : item.part
                ),
                datasets: [{
                  label: 'Frekuensi',
                  data: repairAnalytics.topParts.map((item: any) => item.count),
                  backgroundColor: 'rgba(99, 102, 241, 0.6)',
                  borderColor: 'rgba(99, 102, 241, 1)',
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context: any) => {
                        const item = repairAnalytics.topParts[context[0].dataIndex];
                        return item.part;
                      },
                      afterLabel: (context: any) => {
                        const item = repairAnalytics.topParts[context[0].dataIndex];
                        return `Diganti: ${item.count}x${item.percentage ? ` (${item.percentage}% dari total)` : ''}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { 
                    ticks: { 
                      maxRotation: 45, 
                      minRotation: 45,
                      autoSkip: false,
                    } 
                  },
                  y: { 
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tidak ada data parts replacement</p>
        )}
      </div>
    </div>
  );
}

