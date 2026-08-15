import Navbar from "@/components/Navbar";
import React, { useState } from "react";
import ManageBKT from "@/components/faculty/ManageBKT";
import ManageInventory from "@/components/admin/ManageInventory";
import ManageRequests from "@/components/faculty/ManageRequest";
import FacultyOverview from "@/components/faculty/FacultyOverview";
import CreateExperiment from "@/components/faculty/CreateExperiment";
import ExperimentDirectory from "@/components/faculty/ExperimentDirectory";
import GateScanner from "@/components/faculty/GateScanner";
import PassedList from "@/components/faculty/PassedList";
import GroupGradingDashboard from "@/components/faculty/GroupGradingDashboard";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ClassRecord from "@/components/faculty/ClassRecord";
import ClassAttendance from "@/components/faculty/ClassAttendance";
import GradingCriteriaMaker from "@/components/faculty/CriteriaMaker";
import ManageLearningMaterials from "@/components/faculty/ManageLearningMaterials";
import FacultyOnboardingGuide from "@/components/faculty/FacultyOnboardingGuide";

const FacultyDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className='flex min-h-screen w-full bg-white'>
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      <header className='sticky top-0 z-50 flex h-16 items-center px-4'>
        <SidebarTrigger />
      </header>
      {(selectedPage === "dashboard" || selectedPage === "home") && (
        <FacultyOverview />
      )}
      {selectedPage === "onboarding" && (
        <FacultyOnboardingGuide setSelectedPage={setSelectedPage} />
      )}
      {selectedPage === "experiments" && <ExperimentDirectory />}
      {selectedPage === "grading" && <GroupGradingDashboard />}
      {selectedPage === "roster" && <ClassRecord />}
      {selectedPage === "attendance" && <ClassAttendance />}
      {selectedPage === "safegate" && <ManageBKT />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "requests" && <ManageRequests />}
      {selectedPage === "scanner" && <GateScanner />}
      {selectedPage === "list" && <PassedList />}
      {selectedPage === "criteria" && <GradingCriteriaMaker />}
      {selectedPage === "learning-materials" && <ManageLearningMaterials />}
    </div>
  );
};

export default FacultyDashboard;
