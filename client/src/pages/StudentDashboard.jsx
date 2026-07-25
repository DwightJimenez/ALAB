import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StudentCatalog from "@/components/StudentCatalog";
import SafetyGateBanner from "@/components/SafetyGateBanner";
import StudentAssignments from "@/components/StudentAssignments";
import Wiki from "@/components/Wiki";
import Home from "@/components/Home"

const StudentDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  const [isLocked, setIsLocked] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/quiz/progress`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const { progressData, requiresSafetyGate } = data;

        const allMastered =
          progressData.length > 0 && progressData.every((s) => s.isMastered);

        setIsLocked(requiresSafetyGate && !allMastered);
      });
  }, []);

  return (
    <div className="relative min-h-screen pt-16">
      {isLocked && <SafetyGateBanner />}

      <Navbar
        setSelectedPage={setSelectedPage}
        selectedPage={selectedPage}
        isLocked={isLocked}
      />

      <main
        className={`transition-all duration-300 ${isLocked ? "pt-6" : "pt-4"}`}
      >
        {selectedPage === "home" && <Home/>}

        {selectedPage === "assignments" && <StudentAssignments />}
        {selectedPage === "wiki" && <Wiki />}
      </main>
    </div>
  );
};

export default StudentDashboard;
