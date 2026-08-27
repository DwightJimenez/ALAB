import React from "react";
import "@google/model-viewer";
import ChemicalGrid from "./ChemicalGrid";
import EquipmentGrid from "./EquipmentGrid";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Wiki = () => {
  return (
    <div className="w-full mx-auto p-6 space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-slate-900">Laboratory Wiki</h1>
        <p className="text-slate-500">Explore interactive equipment models and chemical data.</p>
      </div>

      <Tabs defaultValue="equipment" className="w-full">
        {/* The TabsList controls the layout of the toggle buttons */}
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6" variant="line">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="chemicals">Chemicals</TabsTrigger>
        </TabsList>

        {/* Equipment Tab Content */}
        <TabsContent value="equipment" className="mt-0">
          <div className="bg-white rounded-xl border shadow-sm p-4 md:p-6">
            <EquipmentGrid />
          </div>
        </TabsContent>

        {/* Chemicals Tab Content */}
        <TabsContent value="chemicals" className="mt-0">
          <div className="bg-white rounded-xl border shadow-sm p-4 md:p-6">
            <ChemicalGrid />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Wiki;