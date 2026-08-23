import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Navbar from "@/components/Navbar";
import SafetyGateBanner from "@/components/SafetyGateBanner";
import StudentAssignments from "@/components/student/StudentAssignments";
import Wiki from "@/components/student/Wiki";
import Home from "@/components/student/Home";
import StudentPerformanceChart from "@/components/student/StudentPerformanceChart";
import ChemistryLabSandbox from "@/components/student/ChemistryLabSandbox";
import Calculator from "@/components/Calculator";
import { Calculator as CalculatorIcon, X } from "lucide-react";
import LearningMaterials from "@/components/student/LearningMaterials";
import SpecialRequest from "@/components/student/SpecialRequest";
import PasswordModal from "@/components/PasswordModal";
import IntroductionModal from "@/components/student/IntroductionModal";
import Logbook from "@/components/student/Logbook";
import Help from "@/components/student/Help";
import PeriodicTable from "@/components/student/PeriodicTable";
import GuidedTour from "../components/GuidedTour";

const StudentDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  const [isLocked, setIsLocked] = useState(false);
  const user = useSelector((state) => state.auth.user);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

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
      <PasswordModal />
      <GuidedTour user={user} onNavigate={setSelectedPage} />
      {isLocked && <SafetyGateBanner />}

      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />

      <main
        className={`transition-all ml-16 xl:ml-0 duration-300 ${isLocked ? "pt-6" : "pt-4"}`}
      >
        {selectedPage === "home" && <Home setSelectedPage={setSelectedPage} />}
        {selectedPage === "help" && <Help />}
        {selectedPage === "learning" && (
          <LearningMaterials setSelectedPage={setSelectedPage} />
        )}
        {selectedPage === "logbook" && <Logbook />}
        {selectedPage === "assignments" && <StudentAssignments />}
        {selectedPage === "wiki" && <Wiki />}
        {selectedPage === "periodic-table" && <PeriodicTable />}
        {selectedPage === "stats" && <StudentPerformanceChart />}
        {selectedPage === "sandbox" && <ChemistryLabSandbox />}
        {selectedPage === "special-requests" && <SpecialRequest />}
      </main>

      {/* NEW: Floating Calculator Popup & Button */}
      <div className='fixed bottom-6 right-6 z-50 flex flex-col items-end'>
        {/* The Calculator Popup */}
        {isCalculatorOpen && (
          <div className='mb-4 bg-background rounded-xl shadow-2xl border animate-in slide-in-from-bottom-5 fade-in duration-200'>
            <Calculator />
          </div>
        )}

        {/* The Toggle Button */}
        <button
          onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
          className='p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center'
          aria-label='Toggle Calculator'
        >
          {isCalculatorOpen ? (
            <X className='w-6 h-6' />
          ) : (
            <CalculatorIcon className='w-6 h-6' />
          )}
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;
