import { useState } from 'react';
import { LineChart, Line, XAxis, ResponsiveContainer } from 'recharts';

type MetricType = 'weight' | 'bloodPressure' | 'pulse';
type TimePeriod = '1W' | '1M' | '1Y';

const metricData = {
  weight: {
    '1W': [
      { day: 'Mon', value: 152 },
      { day: 'Tue', value: 154 },
      { day: 'Wed', value: 151 },
      { day: 'Thu', value: 153 },
      { day: 'Fri', value: 150 },
      { day: 'Sat', value: 149 },
      { day: 'Sun', value: 150 },
    ],
    current: '150 lbs',
    change: '-2%',
    label: 'Weight'
  },
  bloodPressure: {
    '1W': [
      { day: 'Mon', value: 120 },
      { day: 'Tue', value: 118 },
      { day: 'Wed', value: 122 },
      { day: 'Thu', value: 119 },
      { day: 'Fri', value: 121 },
      { day: 'Sat', value: 120 },
      { day: 'Sun', value: 118 },
    ],
    current: '118/78 mmHg',
    change: '+1%',
    label: 'Blood Pressure'
  },
  pulse: {
    '1W': [
      { day: 'Mon', value: 72 },
      { day: 'Tue', value: 75 },
      { day: 'Wed', value: 70 },
      { day: 'Thu', value: 73 },
      { day: 'Fri', value: 71 },
      { day: 'Sat', value: 69 },
      { day: 'Sun', value: 70 },
    ],
    current: '70 bpm',
    change: '-3%',
    label: 'Pulse'
  }
};

export default function Dashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');

  const currentData = metricData[selectedMetric];

  return (
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <h1 className="text-xl font-bold text-center text-foreground-light dark:text-foreground-dark">
          Dashboard
        </h1>
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
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-subtle-light dark:text-subtle-dark">
                {currentData.label}
              </p>
              <p className="text-3xl font-bold text-foreground-light dark:text-foreground-dark mt-1">
                {currentData.current}
              </p>
              <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
                {currentData.change} vs last week
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
              <LineChart data={currentData['1W']}>
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
        </div>
      </div>
    </>
  );
}
