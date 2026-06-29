import { memo, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { TokenPoint } from "../types";

const fmtTs = (ts: string) => (ts.length >= 16 ? ts.slice(5, 16) : ts);

function TokensChartImpl({ data }: { data: TokenPoint[] }) {
  const option = useMemo(() => {
    const labels = data.map((d) => fmtTs(d.ts));
    return {
    backgroundColor: "transparent",
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "#0f1535", borderColor: "#2dd4bf" },
    legend: {
      data: ["Input", "Output"],
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
        name: "Input",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: data.map((d) => d.input),
        lineStyle: { color: "#38bdf8", width: 2 },
        areaStyle: { color: "rgba(56,189,248,0.12)" },
      },
      {
        name: "Output",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: data.map((d) => d.output),
        lineStyle: { color: "#2dd4bf", width: 2 },
        areaStyle: { color: "rgba(45,212,191,0.12)" },
      },
    ],
    };
  }, [data]);
  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}

export const TokensChart = memo(TokensChartImpl);
