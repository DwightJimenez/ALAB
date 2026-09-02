import Navbar from "@/components/Navbar";
import React, { useState } from "react";
import ManageInventory from "@/components/admin/ManageInventory";
import ManageRequests from "@/components/faculty/ManageRequest";
import FacultyOverview from "@/components/faculty/FacultyOverview";
import ExperimentDirectory from "@/components/faculty/ExperimentDirectory";
import PassedList from "@/components/faculty/PassedList";
import GroupGradingDashboard from "@/components/faculty/GroupGradingDashboard";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ClassRecord from "@/components/faculty/ClassRecord";
import ClassAttendance from "@/components/faculty/ClassAttendance";
import ManageLearningMaterials from "@/components/faculty/ManageLearningMaterials";
import GuidedTour from "@/components/GuidedTour";
import FacultyHelp from "@/components/faculty/FacultyHelp";
import { useSelector } from "react-redux";

const FacultyDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const user = useSelector((state) => state.auth.user);

  return (
    <div className='flex min-h-screen w-full bg-white'>
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      <GuidedTour user={user} onNavigate={setSelectedPage} />
      <header className='sticky top-0 z-50 flex h-16 items-center px-4'>
        <SidebarTrigger />
      </header>
      {(selectedPage === "dashboard" || selectedPage === "home") && (
        <FacultyOverview />
      )}
      {selectedPage === "help" && <FacultyHelp />}
      {selectedPage === "experiments" && <ExperimentDirectory />}
      {selectedPage === "grading" && <GroupGradingDashboard />}
      {selectedPage === "roster" && <ClassRecord />}
      {selectedPage === "attendance" && <ClassAttendance />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "requests" && <ManageRequests />}
      {selectedPage === "list" && <PassedList />}
      {selectedPage === "learning-materials" && <ManageLearningMaterials />}
    </div>
  );
};

export default FacultyDashboard;
