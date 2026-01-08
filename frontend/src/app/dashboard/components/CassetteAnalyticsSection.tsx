import dynamic from 'next/dynamic';
import { Disc } from 'lucide-react';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" /></div>,
});

interface CassetteAnalyticsSectionProps {
  cassetteAnalytics: any;
}

export function CassetteAnalyticsSection({ cassetteAnalytics }: CassetteAnalyticsSectionProps) {
  if (!cassetteAnalytics) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
        <Disc className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Tidak ada data analitik kaset</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 10 Problematic */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top 10 Kaset Bermasalah</h3>
        {cassetteAnalytics.top10Problematic.length > 0 ? (
          <div className="h-64">
            <Bar
              data={{
                labels: cassetteAnalytics.top10Problematic.map((c: any) => c.serialNumber),
                datasets: [{
                  label: 'Total Issues',
                  data: cassetteAnalytics.top10Problematic.map((c: any) => c.totalIssues),
                  backgroundColor: 'rgba(239, 68, 68, 0.6)',
                  borderColor: 'rgba(239, 68, 68, 1)',
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
                      afterLabel: (context: any) => {
                        const item = cassetteAnalytics.top10Problematic[context.dataIndex];
                        return `SO: ${item.problemCount}, Repair: ${item.repairCount}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { ticks: { maxRotation: 45, minRotation: 45 } },
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tidak ada data</p>
        )}
      </div>

      {/* Cycle Problem Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Distribusi Cycle Problem</h3>
        {cassetteAnalytics.cycleProblemDistribution && Object.keys(cassetteAnalytics.cycleProblemDistribution).length > 0 ? (
          <div className="h-64">
            <Bar
              data={{
                labels: Object.keys(cassetteAnalytics.cycleProblemDistribution),
                datasets: [{
                  label: 'Jumlah Kaset',
                  data: Object.values(cassetteAnalytics.cycleProblemDistribution),
                  backgroundColor: [
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(234, 179, 8, 0.6)',
                    'rgba(249, 115, 22, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(185, 28, 28, 0.6)',
                  ],
                  borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(249, 115, 22, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(185, 28, 28, 1)',
                  ],
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tidak ada data</p>
        )}
      </div>

      {/* Age Distribution & Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Distribusi Usia Kaset</h3>
          {cassetteAnalytics.ageDistribution && Object.keys(cassetteAnalytics.ageDistribution).length > 0 ? (
            <div className="h-64">
              <Bar
                data={{
                  labels: Object.keys(cassetteAnalytics.ageDistribution),
                  datasets: [{
                    label: 'Jumlah Kaset',
                    data: Object.values(cassetteAnalytics.ageDistribution),
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
                  },
                  scales: {
                    y: { beginAtZero: true },
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada data</p>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Utilization Rate</h3>
          {cassetteAnalytics.utilizationRate !== undefined ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {cassetteAnalytics.utilizationRate.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {cassetteAnalytics.activeCassettes} dari {cassetteAnalytics.totalCassettes} kaset aktif
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}

