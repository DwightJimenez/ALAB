import React, { useState } from "react";
import { useSelector } from "react-redux";
import Navbar from "@/components/Navbar";
import StudentAssignments from "@/components/student/StudentAssignments";
import Wiki from "@/components/student/Wiki";
import Home from "@/components/student/Home";
import ChemistryLabSandbox from "@/components/student/ChemistryLabSandbox";
import Calculator from "@/components/Calculator";
import { Calculator as CalculatorIcon, X, FlaskConical } from "lucide-react";
import LearningMaterials from "@/components/student/LearningMaterials";
import SpecialRequest from "@/components/student/SpecialRequest";
import PasswordModal from "@/components/PasswordModal";
import Logbook from "@/components/student/Logbook";
import Help from "@/components/student/Help";
import PeriodicTable from "@/components/student/PeriodicTable";
import GuidedTour from "../components/GuidedTour";

const StudentDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  const user = useSelector((state) => state.auth.user);

  // 'calculator' | 'periodic-table' | null
  const [activeTool, setActiveTool] = useState(null);

  const isFirstLogin = !!user && !user.avatar && user.role === "STUDENT";

  return (
    <div className='relative min-h-screen pt-16'>
      <PasswordModal />
      {!isFirstLogin && <GuidedTour user={user} onNavigate={setSelectedPage} />}

      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />

      <main className='transition-all ml-16 xl:ml-0 duration-300 pt-4'>
        {selectedPage === "home" && <Home setSelectedPage={setSelectedPage} />}
        {selectedPage === "help" && <Help />}
        {selectedPage === "learning" && (
          <LearningMaterials setSelectedPage={setSelectedPage} />
        )}
        {selectedPage === "logbook" && <Logbook />}
        {selectedPage === "assignments" && <StudentAssignments />}
        {selectedPage === "wiki" && <Wiki />}
        {selectedPage === "periodic-table" && <PeriodicTable />}
        {selectedPage === "sandbox" && <ChemistryLabSandbox />}
        {selectedPage === "special-requests" && <SpecialRequest />}
      </main>

      {/* Floating Action Dock */}
      <div className='fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4'>
        {/* Active Tool Popup */}
        {activeTool && (
          <div
            className={`bg-background/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden flex flex-col
            ${activeTool === "periodic-table" ? "w-[95vw] md:w-[85vw] lg:w-[75vw] max-h-[80vh] overflow-y-auto custom-scrollbar" : ""}
            `}
          >
            {activeTool === "calculator" && <Calculator />}
            {activeTool === "periodic-table" && (
              <div className='p-4 w-full h-full'>
                <PeriodicTable />
              </div>
            )}
          </div>
        )}

        <div
          className={`group flex items-center transition-all duration-500 ease-out bg-white/40 hover:bg-white/80 backdrop-blur-lg p-2 rounded-full border border-gray-200/50 shadow-lg hover:shadow-xl cursor-pointer ${
            activeTool ? "space-x-3 bg-white/80" : "-space-x-6 hover:space-x-3"
          }`}
        >
          {/* Periodic Table Button */}
          <button
            onClick={() =>
              setActiveTool(
                activeTool === "periodic-table" ? null : "periodic-table",
              )
            }
            className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-all duration-300 relative z-10 group/pt ${
              activeTool === "periodic-table"
                ? "bg-gray-800 text-white"
                : "bg-gradient-to-tr from-emerald-400 to-teal-500 text-white"
            }`}
            aria-label='Toggle Periodic Table'
          >
            {activeTool === "periodic-table" ? (
              <X className='w-5 h-5 transition-transform duration-300 rotate-90' />
            ) : (
              <FlaskConical className='w-5 h-5 transition-transform duration-300' />
            )}
            <span className='absolute -top-12 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover/pt:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none'>
              Periodic Table
            </span>
          </button>

          {/* Calculator Button */}
          <button
            onClick={() =>
              setActiveTool(activeTool === "calculator" ? null : "calculator")
            }
            className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-all duration-300 relative z-20 group/calc ${
              activeTool === "calculator"
                ? "bg-gray-800 text-white"
                : "bg-gradient-to-tr from-indigo-500 to-purple-500 text-white"
            }`}
            aria-label='Toggle Calculator'
          >
            {activeTool === "calculator" ? (
              <X className='w-5 h-5 transition-transform duration-300 rotate-90' />
            ) : (
              <CalculatorIcon className='w-5 h-5 transition-transform duration-300' />
            )}
            <span className='absolute -top-12 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover/calc:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none'>
              Calculator
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
