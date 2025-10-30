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
  ChartData,
  ChartOptions,
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
  TimeSeriesScale,
);

type Dataset = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor?: string;
};

export default function LineChart({ labels, datasets }: { labels: string[]; datasets: Dataset[] }) {
  const data: ChartData<"line"> = {
    labels,
    datasets,
  };

  const options: ChartOptions<"line"> = {
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
  };

  return <Line data={data} options={options} height={120} />;
}
