import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StudentCatalog from "@/components/StudentCatalog";
import SafetyGateBanner from "@/components/SafetyGateBanner"; // Import the banner

const StudentDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/quiz/progress", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        // Logic: If all skills are mastered, isLocked becomes false
        const allMastered = data.length > 0 && data.every((s) => s.isMastered);
        setIsLocked(!allMastered);
      });
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Show the sticky banner if locked */}
      {isLocked && <SafetyGateBanner />}

      <Navbar setSelectedPage={setSelectedPage} />
      
      <main className={`transition-all duration-300 ${isLocked ? "pt-6" : "pt-4"}`}>
        {selectedPage === "home" && <StudentCatalog />}
        {/* You can add logic here to disable clicks on StudentCatalog if isLocked is true */}
      </main>
    </div>
  );
};

export default StudentDashboard;