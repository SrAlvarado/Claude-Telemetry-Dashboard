import { memo, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { CommandPoint } from "../types";

const fmtTs = (ts: string) => (ts.length >= 16 ? ts.slice(5, 16) : ts);

function CommandsChartImpl({ data }: { data: CommandPoint[] }) {
  const option = useMemo(() => {
    const labels = data.map((d) => fmtTs(d.ts));
    return {
    backgroundColor: "transparent",
    grid: { left: 40, right: 20, top: 40, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "#0f1535", borderColor: "#2dd4bf" },
    legend: {
      data: ["Exitosos", "Fallidos"],
      textStyle: { color: "#94a3b8" },
      top: 8,
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: "#1e2a5a" } },
      axisLabel: { color: "#64748b", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#161d44" } },
      axisLabel: { color: "#64748b", fontSize: 10 },
    },
    series: [
      {
        name: "Exitosos",
        type: "bar",
        stack: "cmd",
        data: data.map((d) => d.success),
        itemStyle: { color: "#34d399" },
      },
      {
        name: "Fallidos",
        type: "bar",
        stack: "cmd",
        data: data.map((d) => d.failed),
        itemStyle: { color: "#f87171" },
      },
    ],
    };
  }, [data]);
  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}

export const CommandsChart = memo(CommandsChartImpl);
