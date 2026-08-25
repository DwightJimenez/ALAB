import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Activity,
  BookOpen,
  FlaskConical,
  AlertCircle,
  Users,
  GraduationCap,
  Microscope,
  PackageOpen,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LogoLoader from "../LogoLoader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const StudentPerformanceProfile = () => {
  const { user } = useSelector((state) => state.auth);

  const [skillsList, setSkillsList] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch available skills when the component mounts
  useEffect(() => {
    const fetchSkillsList = async () => {
      if (!user || !user.id) return;

      try {
        const response = await fetch(
          `${API_URL}/api/stats/student-skills?userId=${user.id}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (response.ok) {
          const result = await response.json();
          setSkillsList(result);
          // Auto-select the first skill if available
          if (result.length > 0) {
            setSelectedSkillId(result[0].id);
          } else {
            setLoading(false); // No skills found, stop loading
          }
        }
      } catch (error) {
        console.error("Fetch Skills Error:", error);
        toast.error("Could not load your skills list.");
      }
    };

    fetchSkillsList();
  }, [user?.id, API_URL]);

  // 2. Fetch the deep dive graph data whenever selectedSkillId changes
  useEffect(() => {
    const fetchDeepDiveData = async () => {
      if (!user || !user.id || !selectedSkillId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/stats/student-deep-dive?userId=${user.id}&skillId=${selectedSkillId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          const err = await response.json();
          toast.error(
            err.error || "Failed to load your performance analytics.",
          );
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Network error while fetching your data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDeepDiveData();
  }, [user?.id, selectedSkillId, API_URL]);

  // --- Optimized Chart.js Configuration ---
  const masteryData = useMemo(() => {
    if (!data?.bktData) return null;

    return {
      labels: data.bktData.map((d) => d.label),
      datasets: [
        {
          label: "Your Knowledge Probability",
          data: data.bktData.map((d) => d.probability),
          borderColor: "rgba(79, 70, 229, 1)",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          pointBackgroundColor: data.bktData.map((d) => {
            if (d.isCorrect === null) return "#94a3b8";
            return d.isCorrect ? "#10b981" : "#ef4444";
          }),
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [data]);

  const chartOptions = useMemo(() => {
    if (!data?.bktData) return null;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          padding: 12,
          titleFont: { size: 14 },
          bodyFont: { size: 13 },
          displayColors: false,
          callbacks: {
            title: (context) => {
              const pointData = data.bktData[context[0].dataIndex];
              return pointData.label;
            },
            label: (context) => `Mastery Probability: ${context.raw}%`,
            afterLabel: (context) => {
              const pointData = data.bktData[context.dataIndex];

              if (pointData.isCorrect === null)
                return "\nStatus: Initial State";

              return [
                `\nQuestion: ${pointData.questionText}`,
                `Correct Answer: ${pointData.correctAnswer}`,
                pointData.isCorrect
                  ? "Result: ✅ Correct"
                  : "Result: ❌ Incorrect",
              ];
            },
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: "rgba(0,0,0,0.05)" },
          title: { display: true, text: "Mastery Probability (%)" },
        },
        x: {
          grid: { display: false },
        },
      },
    };
  }, [data]);

  // --- Render States ---
  if (skillsList.length === 0 && !loading) {
    return (
      <div className='flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto mt-8 z-10 relative'>
        <h1 className='text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm'>
          Welcome to your Laboratory Manager,
          <span className='text-pink-600'> {user?.name || "Guest"}</span>
          <span className='text-slate-900'>🐧</span>
        </h1>
        <p className='text-lg text-slate-600 font-medium'>
          Explore learning materials, record your experiments, collaborate with
          your group, and manage your laboratory activities all in one place.
        </p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className='flex justify-center items-center h-[50vh] text-muted-foreground'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  if (!data) return null;

  const { student, skill, stats } = data;

  return (
    <div className='grid grid-cols-3 space-x-4'>
      <div className='flex flex-col justify-between z-10'>
        <h1 className='text-xl md:text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm'>
          Welcome to your Laboratory Manager,
          <span className='text-pink-600'> {user?.name || "Guest"}</span>
          <span className='text-slate-900'>🐧</span>
        </h1>
        <p className='text-lg text-slate-600 font-medium'>
          Explore learning materials, record your experiments, collaborate with
          your group, and manage your laboratory activities all in one place.
        </p>
        {/* Top KPI Cards Row */}
        <div className='grid grid-cols-2 gap-4'>
          {/* Grade */}
          <Card className='shadow-sm border-l-3 border-pink-500'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Average Grade
              </CardTitle>
              <GraduationCap className='h-4 w-4 text-primary opacity-80' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {stats.avgGrade}%
              </div>
            </CardContent>
          </Card>

          {/* Peer Eval */}
          <Card className='shadow-sm border-muted border-l-3 border-pink-500'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Peer Eval Rating
              </CardTitle>
              <Users className='h-4 w-4 text-primary opacity-80' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {stats.avgPeerRating !== "N/A" ? (
                  <span className='flex items-baseline gap-1'>
                    {stats.avgPeerRating}
                    <span className='text-muted-foreground text-sm font-medium'>
                      / 5
                    </span>
                  </span>
                ) : (
                  "N/A"
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card className='shadow-sm border-muted border-l-3 border-pink-500'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Assignment Submitted
              </CardTitle>
              <BookOpen className='h-4 w-4 text-primary opacity-80' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {stats.logbooksSubmitted}
              </div>
            </CardContent>
          </Card>

          {/* Lab Sessions */}
          <Card className='shadow-sm border-muted border-l-3 border-pink-500'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Lab Sessions
              </CardTitle>
              <Microscope className='h-4 w-4 text-primary opacity-80' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {stats.labSessionsParticipated}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className='col-span-2'>
        <div className='flex justify-between space-y-2'>
          <div className=''>
            <h1 className='text-3xl font-bold tracking-tight text-foreground'>
              My Performance Profile
            </h1>
          </div>

          <div className='flex flex-col gap-1.5 w-full md:w-auto'>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1'>
              Subject Area
            </label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className='flex h-10 w-full md:w-[280px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:bg-accent/50'
            >
              {skillsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className='grid grid-cols-3 gap-4 pt-2 items-start'>
          {/* Left: Chart */}
          <div className='xl:col-span-2 space-y-6'>
            <Card className='shadow-sm border-muted'>
              <CardHeader className='bg-muted/10 border-b pb-4 flex flex-row items-center justify-between'>
                <CardTitle className='text-lg flex items-center gap-2 m-0'>
                  <Activity className='w-5 h-5 text-primary' />
                  Path to Mastery: {skill.title}
                </CardTitle>
                {skill.isCleared ? (
                  <Badge
                    variant='outline'
                    className='bg-emerald-50 text-emerald-600 border-emerald-200 px-3 py-1 text-sm'
                  >
                    <CheckCircle2 className='w-4 h-4 mr-1.5' />
                    Cleared
                  </Badge>
                ) : (
                  <Badge
                    variant='secondary'
                    className='px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                  >
                    <Clock className='w-4 h-4 mr-1.5' />
                    In Progress
                  </Badge>
                )}
              </CardHeader>
              <CardContent className='p-6'>
                <div className='w-full h-[380px]'>
                  {masteryData && chartOptions && (
                    <Line data={masteryData} options={chartOptions} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Recent Material Requests */}
          <div className='xl:col-span-1 space-y-6'>
            <Card className='shadow-lg backdrop-blur-sm bg-white/40 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/60 h-full rounded-2xl overflow-hidden'>
              <CardHeader className='bg-white/40 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50 pb-4 flex flex-row items-center justify-between'>
                <CardTitle className='text-lg flex items-center gap-2 m-0 text-foreground'>
                  <FlaskConical className='w-5 h-5 text-primary' />
                  Recent Materials
                </CardTitle>
                <Badge
                  variant='outline'
                  className='text-xs font-normal bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60'
                >
                  {stats.totalMaterialRequests} Total
                </Badge>
              </CardHeader>
              <CardContent className='p-0'>
                {stats.recentMaterials.length > 0 ? (
                  <div className='divide-y divide-slate-200/40 dark:divide-slate-800/40'>
                    {stats.recentMaterials.map((material, idx) => (
                      <div
                        key={idx}
                        className='p-4 flex justify-between items-center hover:bg-white/40 dark:hover:bg-slate-800/30 transition-colors'
                      >
                        <div className='overflow-hidden pr-3'>
                          <p className='text-sm font-medium text-foreground truncate'>
                            {material.name}
                          </p>
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            {material.amount} {material.unit}
                          </p>
                        </div>
                        {material.status === "APPROVED" ? (
                          <Badge
                            variant='outline'
                            className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 uppercase text-[10px] tracking-wider backdrop-blur-sm'
                          >
                            Approved
                          </Badge>
                        ) : material.status === "REJECTED" ? (
                          <Badge
                            variant='destructive'
                            className='shrink-0 uppercase text-[10px] tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20 backdrop-blur-sm'
                          >
                            Rejected
                          </Badge>
                        ) : (
                          <Badge
                            variant='secondary'
                            className='shrink-0 uppercase text-[10px] tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 backdrop-blur-sm'
                          >
                            Pending
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[300px]'>
                    <PackageOpen className='w-12 h-12 mb-3 opacity-20' />
                    <p className='text-sm font-medium text-foreground/80'>
                      No materials requested.
                    </p>
                    <p className='text-xs mt-1'>
                      Items you request for lab sessions will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceProfile;
