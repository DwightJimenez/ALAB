import React, { useState, useEffect } from "react";
import "@google/model-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// 1. DYNAMIC HOTSPOT CONFIGURATION
// Add new equipment and their hotspots here as your inventory grows!
const hotspotConfig = {
  "Microscope": [
    { slot: "hotspot-eyepiece", position: "0.26 2.39 1.48", normal: "0 1 0", label: "1", title: "Eyepiece (10x)", desc: "The lens you look through to see the specimen." },
    { slot: "hotspot-stage", position: "0 0.94 0.68", normal: "0 1 0", label: "2", title: "Mechanical Stage", desc: "The platform where the slide is placed for observation." },
    { slot: "hotspot-coarse", position: "0.67 0.59 -0.31", normal: "0 1 0", label: "3", title: "Coarse Focus", desc: "Large knob used for rapid vertical movement of the stage to find focus." },
    { slot: "hotspot-objective_lense", position: "0 1.18 0.5", normal: "0 1 0", label: "4", title: "Objective Lenses", desc: "Primary lenses that magnify the specimen (e.g., 4x, 10x, 40x)." },
    { slot: "hotspot-fine_focus", position: "0.45 1.65 0.43", normal: "0 1 0", label: "5", title: "Fine Focus", desc: "Smaller knob used for precise, detailed focusing of the image." },
    { slot: "hotspot-condenser", position: "0 1.74 0.62", normal: "0 1 0", label: "6", title: "Condenser", desc: "Focuses and directs the light from the illuminator onto the specimen." },
    { slot: "hotspot-illuminator", position: "0 0.5 0.58", normal: "0 1 0", label: "7", title: "Illuminator", desc: "The light source located at the base of the microscope." },
    { slot: "hotspot-rack_stop", position: "0 0.94 -0.05", normal: "0 0 1", label: "8", title: "Rack Stop", desc: "Prevents the stage from moving too high and crushing the slide." },
  ],
  "Bunsen Burner": [
    // Example of how you would add a second piece of equipment later
    // { slot: "hotspot-barrel", position: "0 1.5 0", normal: "0 1 0", label: "1", title: "Barrel", desc: "Where gas and air mix." }
  ]
};

const EquipmentGrid = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchInventoryAndDescriptions = async () => {
      setIsLoading(true);

      const modelMapping = {
        "Microscope": "/models/compound_microscope.glb",
      };

      const wikiSearchMapping = {
        "Beaker": "Beaker_(laboratory_equipment)",
        "Dropper/Pasteur Pippette": "eye dropper",
      };

      try {
        const dbResponse = await fetch('http://localhost:5000/api/wiki/equipment'); 
        
        if (!dbResponse.ok) {
          throw new Error(`HTTP error! status: ${dbResponse.status}`);
        }
        
        const inventoryItems = await dbResponse.json();

        const fetchPromises = inventoryItems.map(async (item) => {
          const equipmentName = item.name; 
          const modelSrc = modelMapping[equipmentName] || null;
          const searchTerm = wikiSearchMapping[equipmentName] || equipmentName.replace(/\s+/g, '_');

          try {
            const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${searchTerm}`);
            
            if (wikiResponse.ok) {
              const wikiData = await wikiResponse.json();
              return {
                name: equipmentName,
                description: wikiData.extract || "No description available.",
                imageUrl: wikiData.thumbnail?.source || "https://via.placeholder.com/150?text=No+Image",
                modelSrc: modelSrc
              };
            }
          } catch (wikiError) {
            console.error(`Failed to fetch Wikipedia data for ${equipmentName}`, wikiError);
          }

          return {
            name: equipmentName,
            description: "No Wikipedia description available.",
            imageUrl: "https://via.placeholder.com/150?text=No+Image",
            modelSrc: modelSrc
          };
        });

        const results = await Promise.all(fetchPromises);
        setEquipmentData(results);
      } catch (dbError) {
        console.error("Failed to fetch equipment from the database.", dbError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryAndDescriptions();
  }, []);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <style>{`
        .Hotspot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: background-color 0.2s;
        }
        .Hotspot:hover {
          background: #f0f9ff;
          border-color: #0284c7;
          color: #0284c7;
        }
        .HotspotAnnotation {
          position: absolute;
          top: 50%;
          left: calc(100% + 15px);
          transform: translateY(-50%);
          background: #ffffff;
          color: #333;
          padding: 12px;
          border-radius: 8px;
          width: 220px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          display: none;
          text-align: left;
          z-index: 100;
          border: 1px solid #e2e8f0;
        }
        .Hotspot:hover .HotspotAnnotation {
          display: block;
        }
        .HotspotTitle {
          font-weight: bold;
          margin-bottom: 4px;
          color: #0f172a;
        }
        .HotspotDesc {
          font-size: 12px;
          color: #475569;
          line-height: 1.4;
        }
      `}</style>

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
        <DialogContent className="max-w-4xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-800">
                  {selectedItem.name}
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Interactive 3D model and overview.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col md:flex-row gap-6 mt-4">
                
                {/* Left Side: 3D Model OR 2D Image */}
                <div className="w-full md:w-3/5 bg-slate-100 rounded-xl overflow-visible border flex items-center justify-center min-h-[400px]">
                  {selectedItem.modelSrc ? (
                    <model-viewer
                      src={selectedItem.modelSrc}
                      alt={`3D model of ${selectedItem.name}`}
                      auto-rotate
                      camera-controls
                      style={{ 
                        width: "100%", 
                        height: "400px",
                        backgroundColor: "oklch(0.96 0.01 270)", 
                        borderRadius: "12px",
                      }}
                    >
                      {/* 2. DYNAMIC HOTSPOT RENDERING */}
                      {hotspotConfig[selectedItem.name]?.map((hotspot, index) => (
                        <button 
                          key={index}
                          className="Hotspot" 
                          slot={hotspot.slot} 
                          data-position={hotspot.position} 
                          data-normal={hotspot.normal}
                        >
                          {hotspot.label}
                          <div className="HotspotAnnotation">
                            <div className="HotspotTitle">{hotspot.title}</div>
                            <div className="HotspotDesc">{hotspot.desc}</div>
                          </div>
                        </button>
                      ))}
                    </model-viewer>
                  ) : (
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name}
                      className="max-h-64 object-contain mix-blend-multiply p-4"
                    />
                  )}
                </div>

                {/* Right Side: Full Text */}
                <div className="w-full md:w-2/5 flex flex-col">
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Overview</h4>
                  <p className="text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-[400px] pr-4 pl-1">
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