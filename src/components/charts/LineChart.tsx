"use client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeSeriesScale,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeSeriesScale
);

type Dataset = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor?: string;
};

export default function LineChart({
  labels,
  datasets,
}: {
  labels: string[];
  datasets: Dataset[];
}) {
  const data = { labels, datasets } as any;
  const options = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top" as const },
      tooltip: { intersect: false, mode: "index" as const },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
    elements: { point: { radius: 2 } },
  } as const;
  return <Line data={data} options={options} height={120} />;
}
