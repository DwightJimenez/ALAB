import React, { useState, useEffect, useRef } from "react";
import "@google/model-viewer";
import { Maximize, Minimize } from "lucide-react"; // Import icons for the fullscreen button
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// 1. DYNAMIC HOTSPOT CONFIGURATION
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
};

const EquipmentGrid = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Fullscreen State and Refs
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modelContainerRef = useRef(null);

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

  // Listen for the escape key exiting fullscreen native browser behavior
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (modelContainerRef.current) {
        modelContainerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      document.exitFullscreen();
    }
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

      {/* SHADCN SHEET - BOTTOM LARGE VARIANT */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="w-full  sm:max-w-full overflow-y-auto bg-white rounded-t-2xl p-6 md:p-10"
        >
          <div className="max-w-7xl mx-auto h-[80vh] flex flex-col">
            {selectedItem && (
              <>
                <SheetHeader className="mb-6 shrink-0">
                  <SheetTitle className="text-3xl font-bold text-slate-800">
                    {selectedItem.name}
                  </SheetTitle>
                  <SheetDescription className="text-slate-500 text-base mt-1">
                    Interactive 3D model and detailed overview.
                  </SheetDescription>
                </SheetHeader>
                
                <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
                  
                  {/* Left Side: 3D Model OR 2D Image (Wrapped in ref for fullscreen) */}
                  <div 
                    ref={modelContainerRef}
                    className="w-full md:w-3/5 bg-slate-100 rounded-2xl overflow-hidden border flex items-center justify-center relative shadow-inner min-h-[400px] md:min-h-full"
                  >
                    {selectedItem.modelSrc ? (
                      <>
                        <model-viewer
                          src={selectedItem.modelSrc}
                          alt={`3D model of ${selectedItem.name}`}
                          auto-rotate
                          camera-controls
                          style={{ 
                            width: "100%", 
                            height: "100%", // changed from 400px to 100% to fill the container properly
                            backgroundColor: "oklch(0.96 0.01 270)", 
                          }}
                        >
                          {/* DYNAMIC HOTSPOT RENDERING */}
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

                        {/* Fullscreen Toggle Button */}
                        <button 
                          onClick={toggleFullscreen}
                          className="absolute bottom-4 right-4 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all shadow-lg backdrop-blur-sm z-50 flex items-center justify-center"
                          title="Toggle Fullscreen"
                        >
                          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                      </>
                    ) : (
                      <img 
                        src={selectedItem.imageUrl} 
                        alt={selectedItem.name}
                        className="max-h-96 object-contain mix-blend-multiply p-4"
                      />
                    )}
                  </div>

                  {/* Right Side: Full Text */}
                  <div className="w-full md:w-2/5 flex flex-col h-full">
                    <h4 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3">Wikipedia Overview</h4>
                    <div className="text-base text-slate-700 leading-relaxed overflow-y-auto pr-4 pl-1">
                      {selectedItem.description}
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EquipmentGrid;