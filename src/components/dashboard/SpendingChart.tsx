import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/lib/format";

interface Slice { name: string; value: number; color: string; }
interface Props { data: Slice[]; }

export const SpendingChart = ({ data }: Props) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="glass border border-border/60 rounded-3xl p-6 text-center">
        <p className="font-display font-semibold">Sem despesas ainda</p>
        <p className="text-sm text-muted-foreground mt-1">Adicione um lançamento para ver o gráfico.</p>
      </div>
    );
  }
  return (
    <div className="glass border border-border/60 rounded-3xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Gastos por categoria</h3>
        <span className="text-xs text-muted-foreground">{data.length} categorias</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-32 h-32 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatBRL(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground uppercase">Total</span>
            <span className="font-display font-bold text-sm tabular-nums">{formatBRL(total)}</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
          {data.slice(0, 5).map(d => (
            <li key={d.name} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round((d.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
