import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import LogoLoader from "../LogoLoader";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const StudentRadarChart = () => {
  const { user } = useSelector((state) => state.auth);
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchRadarData = async () => {
      // FIX 2: Ensure we stop loading if there's no user id
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/stats/student-radar-stats`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (response.ok) {
          const result = await response.json();
          setRadarData(result.chartData);
        }
      } catch (error) {
        console.error("Failed to fetch radar data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRadarData();
  }, [user?.id, API_URL]);

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        angleLines: { color: "rgba(0, 0, 0, 0.3)" },
        grid: { color: "rgba(0, 0, 0, 0.3)" },
        pointLabels: {
          font: { size: 9 },
          color: "hsl(var(--foreground))",
        },
        ticks: {
          stepSize: 25,
          display: true,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Score: ${context.raw}%`,
        },
      },
    },
  };

  if (loading)
    return (
      <div className='h-64 flex items-center justify-center'>
        <LogoLoader size='sm' />
      </div>
    );

  if (!radarData) return null;

  return (
    <>
      <Radar data={radarData} options={radarOptions} />
    </>
  );
};

export default StudentRadarChart;
