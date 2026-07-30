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
  AlertCircle
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import LogoLoader from "./LogoLoader"; 

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
          }
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
          }
        );

        if (response.ok) {
          const result = await response.json();
          setData(result);
          console.log(result)
        } else {
          const err = await response.json();
          toast.error(err.error || "Failed to load your performance analytics.");
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
            return d.isCorrect ? "#16a34a" : "#dc2626"; 
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
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleFont: { size: 14 },
          bodyFont: { size: 13 },
          callbacks: {
            title: (context) => {
              const pointData = data.bktData[context[0].dataIndex];
              return pointData.label; 
            },
            label: (context) => `Mastery Probability: ${context.raw}%`,
            afterLabel: (context) => {
              const pointData = data.bktData[context.dataIndex];
              
              if (pointData.isCorrect === null) return "\nStatus: Initial State";
              
              // Multi-line tooltip showing the question and the result
              return [
                `\nQuestion: ${pointData.questionText}`,
                `Correct Answer: ${pointData.correctAnswer}`,
                pointData.isCorrect ? "Result: ✅ Correct" : "Result: ❌ Incorrect"
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
      <div className="flex flex-col justify-center items-center h-64 max-w-7xl mx-auto text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mt-6">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <p>You have not started any safety gate skills yet.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <LogoLoader size="sm" />
      </div>
    );
  }

  if (!data) return null;

  const { student, skill, stats } = data;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            My Performance Profile
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{student.section}</Badge>
            <span className="text-muted-foreground text-sm">• {student.name}</span>
          </div>
        </div>
        
        {/* Dynamic Skill Selector */}
        <div className="flex flex-col items-end gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Subject Area
          </label>
          <select 
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            className="flex h-10 w-full md:w-64 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {skillsList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT SIDE: BKT Path to Mastery Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 m-0">
                <Activity className="w-5 h-5 text-primary" />
                Your Path to Mastery: {skill.title}
              </CardTitle>
              {skill.isCleared ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Cleared
                </Badge>
              ) : (
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  In Progress
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="w-full h-[350px]">
                {masteryData && chartOptions && (
                  <Line data={masteryData} options={chartOptions} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE: System Activity & History */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
          
          {/* Actionable Stats Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Your Lab Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Logbooks Submitted</span>
                <span className="font-bold text-foreground text-base">{stats.logbooksSubmitted}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">My Average Grade</span>
                <span className="font-bold text-foreground text-base">{stats.avgGrade}%</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Material Requests</span>
                <span className="font-bold text-foreground text-base">{stats.totalMaterialRequests}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Lab Sessions Participated</span>
                <span className="font-bold text-foreground text-base">{stats.labSessionsParticipated}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Material Requests Card */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                My Material Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {stats.recentMaterials.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentMaterials.map((material, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium truncate pr-4">
                          {material.name} <span className="text-muted-foreground text-xs">({material.amount}{material.unit})</span>
                        </span>
                        {material.status === 'APPROVED' ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                            Approved
                          </Badge>
                        ) : material.status === 'REJECTED' ? (
                          <Badge variant="destructive" className="shrink-0">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {idx < stats.recentMaterials.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-sm italic text-muted-foreground">You haven't requested any materials yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceProfile;