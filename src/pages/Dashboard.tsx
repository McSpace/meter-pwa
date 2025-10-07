import { useState } from 'react';
import { LineChart, Line, XAxis, ResponsiveContainer } from 'recharts';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { useProfile } from '@/contexts/ProfileContext';
import { useMetrics } from '@/hooks/useMetrics';
import type { MetricType } from '@/types/database';

type TimePeriod = '1W' | '1M' | '1Y';

const metricLabels = {
  weight: 'Weight',
  bloodPressure: 'Blood Pressure',
  pulse: 'Pulse'
};

const metricUnits = {
  weight: 'lbs',
  bloodPressure: 'mmHg',
  pulse: 'bpm'
};

export default function Dashboard() {
  const { selectedProfile } = useProfile();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');

  // Get metrics for selected profile and metric type
  const { metrics, loading } = useMetrics({
    profileId: selectedProfile?.id || null,
    type: selectedMetric,
    limit: timePeriod === '1W' ? 7 : timePeriod === '1M' ? 30 : 365,
  });

  // Transform metrics data for chart
  const chartData = metrics.map((m) => ({
    day: new Date(m.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
    value: parseFloat(m.value.toString()),
    date: m.timestamp,
  })).reverse(); // Reverse to show oldest to newest

  // Calculate current value and change
  const current = metrics.length > 0 ? parseFloat(metrics[0].value.toString()) : 0;
  const previous = metrics.length > 1 ? parseFloat(metrics[metrics.length - 1].value.toString()) : current;
  const change = current - previous;
  const changePercent = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0';

  return (
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <ProfileSwitcher />
      </header>

      <div className="p-4 space-y-6">
        {/* Metric Selector */}
        <div className="relative">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            className="w-full appearance-none bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-foreground-light dark:text-foreground-dark rounded-lg h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="weight">Weight</option>
            <option value="bloodPressure">Blood Pressure</option>
            <option value="pulse">Pulse</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-subtle-light dark:text-subtle-dark">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path clipRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" fillRule="evenodd"/>
            </svg>
          </div>
        </div>

        {/* Metric Card */}
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl">
          {!selectedProfile ? (
            <div className="text-center py-8 text-subtle-light dark:text-subtle-dark">
              Please select or create a profile
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-subtle-light dark:text-subtle-dark">
              No {metricLabels[selectedMetric].toLowerCase()} data yet
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark">
                    {metricLabels[selectedMetric]}
                  </p>
                  <p className="text-3xl font-bold text-foreground-light dark:text-foreground-dark mt-1">
                    {current} {metricUnits[selectedMetric]}
                  </p>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
                    {changePercent > '0' ? '+' : ''}{changePercent}% vs {timePeriod === '1W' ? 'last week' : timePeriod === '1M' ? 'last month' : 'last year'}
                  </p>
                </div>
                <div className="flex bg-background-light dark:bg-background-dark p-1 rounded-full text-sm">
                  <button
                    onClick={() => setTimePeriod('1W')}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      timePeriod === '1W'
                        ? 'bg-primary text-black'
                        : 'text-subtle-light dark:text-subtle-dark'
                    }`}
                  >
                    1W
                  </button>
                  <button
                    onClick={() => setTimePeriod('1M')}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      timePeriod === '1M'
                        ? 'bg-primary text-black'
                        : 'text-subtle-light dark:text-subtle-dark'
                    }`}
                  >
                    1M
                  </button>
                  <button
                    onClick={() => setTimePeriod('1Y')}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      timePeriod === '1Y'
                        ? 'bg-primary text-black'
                        : 'text-subtle-light dark:text-subtle-dark'
                    }`}
                  >
                    1Y
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#30e8c9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#30e8c9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#30e8c9"
                      strokeWidth={3}
                      dot={false}
                      fill="url(#colorValue)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
