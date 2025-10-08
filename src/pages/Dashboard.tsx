import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, ResponsiveContainer } from 'recharts';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { useProfile } from '@/contexts/ProfileContext';
import { useMetrics } from '@/hooks/useMetrics';

type TimePeriod = '1W' | '1M' | '1Y';

const metricDisplayNames: Record<string, string> = {
  weight: 'Weight',
  systolicPressure: 'Systolic Pressure',
  diastolicPressure: 'Diastolic Pressure',
  pulse: 'Pulse',
  temperature: 'Temperature',
};

export default function Dashboard() {
  const { selectedProfile } = useProfile();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');

  // Get ALL metrics for selected profile
  const { metrics, loading } = useMetrics({
    profileId: selectedProfile?.id || null,
  });

  // Group metrics by type
  const metricsByType = useMemo(() => {
    const grouped = new Map<string, typeof metrics>();

    metrics.forEach(metric => {
      if (!grouped.has(metric.type)) {
        grouped.set(metric.type, []);
      }
      grouped.get(metric.type)!.push(metric);
    });

    return grouped;
  }, [metrics]);

  // Filter by time period
  const getMetricsForPeriod = (metricsOfType: typeof metrics) => {
    const days = timePeriod === '1W' ? 7 : timePeriod === '1M' ? 30 : 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return metricsOfType
      .filter(m => new Date(m.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const renderMetricCard = (metricType: string, metricsOfType: typeof metrics) => {
    const filteredMetrics = getMetricsForPeriod(metricsOfType);

    if (filteredMetrics.length === 0) return null;

    // Transform data for chart
    const chartData = filteredMetrics.map((m) => ({
      day: new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(m.value.toString()),
      date: m.timestamp,
    }));

    // Calculate current value and change
    const current = parseFloat(filteredMetrics[filteredMetrics.length - 1].value.toString());
    const previous = filteredMetrics.length > 1
      ? parseFloat(filteredMetrics[0].value.toString())
      : current;
    const change = current - previous;
    const changePercent = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0';
    const unit = filteredMetrics[0].unit;
    const displayName = metricDisplayNames[metricType] || metricType.charAt(0).toUpperCase() + metricType.slice(1);

    return (
      <div key={metricType} className="bg-card-light dark:bg-card-dark p-4 rounded-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-subtle-light dark:text-subtle-dark">
              {displayName}
            </p>
            <p className="text-3xl font-bold text-foreground-light dark:text-foreground-dark mt-1">
              {current} {unit}
            </p>
            <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
              {change > 0 ? '+' : ''}{changePercent}% vs {timePeriod === '1W' ? 'last week' : timePeriod === '1M' ? 'last month' : 'last year'}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#30e8c9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#30e8c9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#30e8c9"
                strokeWidth={2}
                dot={false}
                fill={`url(#gradient-${metricType})`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <ProfileSwitcher />
      </header>

      <div className="p-4 space-y-4">
        {/* Time Period Selector */}
        <div className="flex justify-end">
          <div className="flex bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-1 rounded-full text-sm">
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

        {!selectedProfile ? (
          <div className="bg-card-light dark:bg-card-dark p-8 rounded-xl text-center text-subtle-light dark:text-subtle-dark">
            Please select or create a profile
          </div>
        ) : loading ? (
          <div className="bg-card-light dark:bg-card-dark p-8 rounded-xl text-center">
            <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : metricsByType.size === 0 ? (
          <div className="bg-card-light dark:bg-card-dark p-8 rounded-xl text-center text-subtle-light dark:text-subtle-dark">
            No metrics data yet
          </div>
        ) : (
          <>
            {/* Render all metric types */}
            {Array.from(metricsByType.entries()).map(([metricType, metricsOfType]) =>
              renderMetricCard(metricType, metricsOfType)
            )}
          </>
        )}
      </div>
    </>
  );
}
