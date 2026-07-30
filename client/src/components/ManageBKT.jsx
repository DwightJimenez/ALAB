import ManageSkills from "@/components/ManageSkills";
import ManageQuestions from "@/components/ManageQuestions";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ManageBKT = () => {
  return (
    <div className="h-screen w-full bg-white">
      {/* Container with top padding to account for fixed Navbar */}
      <div className="p-4">
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 backdrop-blur border border-slate-200">
            <TabsTrigger value="skills">Manage Skills</TabsTrigger>
            <TabsTrigger value="questions">Manage Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            <ManageSkills />
          </TabsContent>

          <TabsContent value="questions">
            <ManageQuestions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManageBKT;
