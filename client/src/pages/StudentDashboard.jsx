import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StudentCatalog from "@/components/student/StudentCatalog";
import SafetyGateBanner from "@/components/SafetyGateBanner";
import StudentAssignments from "@/components/student/StudentAssignments";
import Wiki from "@/components/student/Wiki";
import Home from "@/components/student/Home";
import StudentPerformanceChart from "@/components/student/StudentPerformanceChart";
import ChemistryLabSandbox from "@/components/student/ChemistryLabSandbox";

const StudentDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  const [isLocked, setIsLocked] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/quiz/progress`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Backend error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const progressData = data?.progressData || [];
        const requiresSafetyGate = data?.requiresSafetyGate || false;

        const allMastered =
          progressData.length > 0 && progressData.every((s) => s.isMastered);

        setIsLocked(requiresSafetyGate && !allMastered);
      })
      .catch((error) => {
        console.error("Failed to fetch student progress:", error);
        setIsLocked(false);
      });
  }, [API_URL]);

  return (
    <div className='relative min-h-screen pt-16'>
      {isLocked && <SafetyGateBanner />}

      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />

      <main
        className={`transition-all duration-300 ${isLocked ? "pt-6" : "pt-4"}`}
      >
        {selectedPage === "home" && <Home setSelectedPage={setSelectedPage} />}

        {selectedPage === "assignments" && <StudentAssignments />}
        {selectedPage === "wiki" && <Wiki />}
        {selectedPage === "stats" && <StudentPerformanceChart />}
        {selectedPage === "sandbox" && <ChemistryLabSandbox />}
      </main>
    </div>
  );
};

export default StudentDashboard;
