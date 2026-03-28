import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import {
  useAnalyticsSummary,
  useUptimeStats,
  useContentUsage,
  useActivity,
  usePlayHistory,
} from '../hooks/useAnalytics';
import { Card } from '../components/ui/Card';
import './AnalyticsPage.css';

const CHART_COLORS = ['#00d4aa', '#3b8df6', '#a97cf8', '#ffb020', '#ff4d6a', '#6dd5ed', '#ee9ca7'];

export default function AnalyticsPage() {
  const { data: summary } = useAnalyticsSummary();
  const { data: uptime } = useUptimeStats();
  const { data: contentUsage } = useContentUsage();
  const { data: activity } = useActivity();
  const { data: history } = usePlayHistory();

  const summaryCards = [
    { label: 'מסכים פעילים', value: summary?.totalActiveDisplays ?? 0, accent: true },
    { label: 'זמן פעילות ממוצע', value: `${(summary?.averageUptimeHours ?? 0).toFixed(1)}ש`, accent: false },
    { label: 'הודעות היום', value: summary?.messagesToday ?? 0, accent: false },
    { label: 'שינויי תוכן היום', value: summary?.contentChangesToday ?? 0, accent: false },
  ];

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('he-IL');

  return (
    <div className="analytics-page">
      <h1 className="text-h1" style={{ marginBottom: 24 }}>אנליטיקס</h1>

      {/* Summary cards */}
      <div className="analytics-summary">
        {summaryCards.map((c) => (
          <Card key={c.label} className="analytics-summary-card">
            <div className="analytics-summary-label">{c.label}</div>
            <div className={`analytics-summary-value ${c.accent ? 'text-number' : ''}`}>
              {c.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="analytics-charts">
        {/* Uptime bar chart */}
        <Card className="analytics-chart-card">
          <h3 className="text-h3" style={{ marginBottom: 16 }}>זמן פעילות לפי מסך</h3>
          {uptime && uptime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={uptime} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  stroke="var(--text-muted)"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} שעות`, 'זמן פעילות']}
                />
                <Bar dataKey="uptimeHours" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-caption">אין נתונים</p>
          )}
        </Card>

        {/* Content usage donut */}
        <Card className="analytics-chart-card">
          <h3 className="text-h3" style={{ marginBottom: 16 }}>התפלגות סוגי תוכן</h3>
          {contentUsage && contentUsage.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={contentUsage}
                    dataKey="count"
                    nameKey="contentType"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {contentUsage.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contentUsage.map((item, i) => (
                  <div key={item.contentType} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: CHART_COLORS[i % CHART_COLORS.length],
                      flexShrink: 0,
                    }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.contentType} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-caption">אין נתונים</p>
          )}
        </Card>
      </div>

      {/* Activity line chart */}
      <Card className="analytics-chart-card">
        <h3 className="text-h3" style={{ marginBottom: 16 }}>פעילות ב-24 שעות אחרונות</h3>
        {activity && activity.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                }}
                formatter={(value: number) => [value, 'שינויים']}
              />
              <Line
                type="monotone"
                dataKey="changes"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent)', r: 3 }}
                activeDot={{ r: 5, fill: 'var(--accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-caption">אין נתונים</p>
        )}
      </Card>

      {/* Play history table */}
      <Card className="analytics-chart-card">
        <h3 className="text-h3" style={{ marginBottom: 16 }}>היסטוריית הפעלה</h3>
        {history && history.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>מסך</th>
                  <th>סוג</th>
                  <th>URL</th>
                  <th>התחלה</th>
                  <th>משך</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.displayId}</td>
                    <td>{h.contentType}</td>
                    <td className="text-mono" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'left' }}>
                      {h.contentUrl}
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.75rem' }}>{formatDate(h.startedAt)}</td>
                    <td className="text-mono">
                      {h.durationSec != null ? `${Math.round(h.durationSec / 60)} דק` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-caption">אין נתונים</p>
        )}
      </Card>
    </div>
  );
}
