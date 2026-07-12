import React, { useState, useEffect } from "react";
import "@google/model-viewer";
// Import your Shadcn components (adjust the path if yours is different)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const EquipmentGrid = () => {
  // 1. We upgrade the array to objects so we can link your 3D models!
  const standardEquipment = [
    { searchName: "Microscope", modelSrc: "/models/compound_microscope.glb" },
    { searchName: "Beaker (laboratory equipment)", modelSrc: null }, // No 3D model yet
    { searchName: "Erlenmeyer flask", modelSrc: null },
    { searchName: "Volumetric flask", modelSrc: null },
    { searchName: "Graduated cylinder", modelSrc: null },
    { searchName: "Bunsen burner", modelSrc: null },
    { searchName: "Petri dish", modelSrc: null }
  ];

  const [equipmentData, setEquipmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State to control the Shadcn Dialog
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAllDescriptions = async () => {
      setIsLoading(true);
      const results = [];

      for (const item of standardEquipment) {
        try {
          const formattedTerm = item.searchName.replace(/\s+/g, '_');
          const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTerm}`);
          
          if (response.ok) {
            const data = await response.json();
            results.push({
              name: item.searchName.replace(" (laboratory equipment)", ""), // Clean up the title
              description: data.extract || "No description available.",
              imageUrl: data.thumbnail?.source || "https://via.placeholder.com/150?text=No+Image",
              modelSrc: item.modelSrc // Passes the 3D model path if it exists
            });
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${item.searchName}`, error);
        }
      }

      setEquipmentData(results);
      setIsLoading(false);
    };

    fetchAllDescriptions();
  }, []);

  // Handler for opening the dialog
  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Standard Lab Equipment</h2>
        <p className="text-slate-500">Descriptions and images sourced automatically via Wikipedia REST API.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipmentData.map((item, index) => (
            <div key={index} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              
              <div className="h-48 bg-slate-50 p-4 flex items-center justify-center border-b relative">
                {/* Small badge to show if a 3D model is available */}
                {item.modelSrc && (
                  <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                    3D VIEW
                  </span>
                )}
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.name}</h3>
                <p className="text-sm text-slate-600 line-clamp-3 mb-4 flex-1">
                  {item.description}
                </p>
                
                <button 
                  onClick={() => handleViewDetails(item)}
                  className="w-full py-2 bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 text-sm transition-colors"
                >
                  View Full Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHADCN DIALOG / MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-800">
                  {selectedItem.name}
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Sourced securely from Wikipedia.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col md:flex-row gap-6 mt-4">
                
                {/* Left Side: 3D Model OR 2D Image */}
                <div className="w-full md:w-1/2 bg-slate-100 rounded-xl overflow-hidden border flex items-center justify-center min-h-[300px]">
                  {selectedItem.modelSrc ? (
                    <model-viewer
                      src={selectedItem.modelSrc}
                      alt={`3D model of ${selectedItem.name}`}
                      auto-rotate
                      camera-controls
                      style={{ width: "100%", height: "300px" }}
                    ></model-viewer>
                  ) : (
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name}
                      className="max-h-64 object-contain mix-blend-multiply p-4"
                    />
                  )}
                </div>

                {/* Right Side: Full Text */}
                <div className="w-full md:w-1/2 flex flex-col">
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Overview</h4>
                  <p className="text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-[300px] pr-2">
                    {selectedItem.description}
                  </p>
                </div>

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentGrid;