import ManageBKT from "@/components/ManageBKT";
import ManageSkills from "@/components/ManageSkills";
import Navbar from "@/components/Navbar";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FacultyDashboard = () => {
  return (
    <div className="h-screen w-full bg-white bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px]">
      <Navbar />

      {/* Container with top padding to account for fixed Navbar */}
      <div className="p-4">
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-cold backdrop-blur border border-slate-200">
            <TabsTrigger value="skills">Manage Skills</TabsTrigger>
            <TabsTrigger value="questions">Manage Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            <ManageSkills />
          </TabsContent>

          <TabsContent value="questions">
            <ManageBKT />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FacultyDashboard;
