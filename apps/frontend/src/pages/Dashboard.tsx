import { useQuery } from '@tanstack/react-query';
import { getDefects } from '../api/defects';
import { useAuth } from '../context/AuthContext';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { defaultStyles, useTooltip, TooltipWithBounds } from '@visx/tooltip';
import type { Defect, DefectSeverity, DefectStatus } from '../types';

const SEVERITY_ORDER: DefectSeverity[] = ['critical', 'high', 'medium', 'low'];
const STATUS_ORDER: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const SEVERITY_FILL: Record<DefectSeverity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const STATUS_FILL: Record<DefectStatus, string> = {
  open: '#60a5fa',
  in_progress: '#facc15',
  resolved: '#4ade80',
  closed: '#6b7280',
};

function countBy<T extends string>(defects: Defect[], key: keyof Defect, order: T[]) {
  return order.map((val) => ({
    label: val,
    count: defects.filter((d) => d[key] === val).length,
  }));
}

const margin = { top: 16, right: 16, bottom: 40, left: 36 };

function BarChart({
  data,
  fills,
  width,
  height,
}: {
  data: { label: string; count: number }[];
  fills: Record<string, string>;
  width: number;
  height: number;
}) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } =
    useTooltip<{ label: string; count: number }>();

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = scaleBand({
    domain: data.map((d) => d.label),
    range: [0, innerW],
    padding: 0.3,
  });

  const yScale = scaleLinear({
    domain: [0, Math.max(...data.map((d) => d.count), 1)],
    range: [innerH, 0],
    nice: true,
  });

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {data.map((d) => {
            const x = xScale(d.label) ?? 0;
            const y = yScale(d.count);
            const barH = innerH - y;
            return (
              <Bar
                key={d.label}
                x={x}
                y={y}
                width={xScale.bandwidth()}
                height={barH}
                fill={fills[d.label]}
                rx={4}
                opacity={0.85}
                onMouseMove={(e) => {
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: e.clientX,
                    tooltipTop: e.clientY,
                  });
                }}
                onMouseLeave={hideTooltip}
              />
            );
          })}
          <AxisBottom
            scale={xScale}
            top={innerH}
            stroke="#374151"
            tickStroke="transparent"
            tickLabelProps={{ fill: '#9ca3af', fontSize: 11, textAnchor: 'middle', dy: 4 }}
          />
          <AxisLeft
            scale={yScale}
            stroke="#374151"
            tickStroke="transparent"
            tickLabelProps={{ fill: '#9ca3af', fontSize: 11, textAnchor: 'end', dx: -4 }}
            numTicks={4}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, background: '#1f2937', border: '1px solid #374151', color: '#f9fafb', fontSize: 12 }}
        >
          <strong className="capitalize">{tooltipData.label.replace('_', ' ')}</strong>: {tooltipData.count}
        </TooltipWithBounds>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['defects'],
    queryFn: getDefects,
  });

  const severityData = countBy<DefectSeverity>(defects, 'severity', SEVERITY_ORDER);
  const statusData = countBy<DefectStatus>(defects, 'status', STATUS_ORDER);

  const openCount = defects.filter((d) => d.status === 'open').length;
  const criticalCount = defects.filter((d) => d.severity === 'critical').length;
  const resolvedCount = defects.filter((d) => d.status === 'resolved' || d.status === 'closed').length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.email}</p>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Defects" value={defects.length} color="text-gray-100" />
            <StatCard label="Open" value={openCount} color="text-blue-400" />
            <StatCard label="Critical" value={criticalCount} color="text-red-400" />
            <StatCard label="Resolved / Closed" value={resolvedCount} color="text-green-400" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Defects by Severity</h2>
              <ParentSize>
                {({ width }) => (
                  <BarChart data={severityData} fills={SEVERITY_FILL} width={width} height={220} />
                )}
              </ParentSize>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Defects by Status</h2>
              <ParentSize>
                {({ width }) => (
                  <BarChart data={statusData} fills={STATUS_FILL} width={width} height={220} />
                )}
              </ParentSize>
            </div>
          </div>

          {/* Recent defects */}
          {defects.length > 0 && (
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Defects</h2>
              <div className="space-y-2">
                {defects.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: SEVERITY_FILL[d.severity] }}
                      />
                      <span className="text-sm text-gray-300 truncate max-w-xs">{d.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
