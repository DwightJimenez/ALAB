import React, { useState, useEffect, useRef } from "react";
import "@google/model-viewer";
import { Search, Folder, ChevronRight, Home, Focus, Maximize, Minimize } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import LogoLoader from "../LogoLoader";

const hotspotConfig = {
  Microscope: [
    {
      slot: "hotspot-eyepiece",
      position: "0.26 2.39 1.48",
      normal: "0 1 0",
      label: "1",
      title: "Eyepiece (Ocular)",
      desc: "The eyepiece, or ocular lens, is the lens closest to your eye when you look into the microscope. It further magnifies the image produced by the objective lens, allowing for a detailed examination of the specimen.",
    },
    {
      slot: "hotspot-stage",
      position: "0 0.94 0.68",
      normal: "0 1 0",
      label: "2",
      title: "Mechanical Stage",
      desc: "The stage is the flat platform where you place the specimen slide. It often includes slide clips or a mechanical stage to secure the slide in place and move it smoothly for examination.",
    },
    {
      slot: "hotspot-coarse",
      position: "0.67 0.59 -0.31",
      normal: "0 1 0",
      label: "3",
      title: "Coarse Focus",
      desc: "The coarse focus knob is used to make large adjustments to the focus of the microscope. It moves the stage up and down to bring the specimen into rough focus.",
    },
    {
      slot: "hotspot-objective_lense",
      position: "0 1.18 0.5",
      normal: "0 1 0",
      label: "4",
      title: "Objective Lenses",
      desc: "Objective lenses are located on the revolving nosepiece and are responsible for the initial magnification of the specimen. Different objective lenses provide varying levels of magnification, typically ranging from low to high power.",
    },
    {
      slot: "hotspot-fine_focus",
      position: "0.45 1.65 0.43",
      normal: "0 1 0",
      label: "5",
      title: "Fine Focus",
      desc: "The fine focus knob allows for precise adjustments to the focus of the microscope. It is used after coarse focusing to bring the image into sharp and clear detail.",
    },
    {
      slot: "hotspot-condenser",
      position: "0 0.72 0.62",
      normal: "0 1 0",
      label: "6",
      title: "Condenser",
      desc: "The condenser is positioned beneath the stage and is responsible for focusing and directing light onto the specimen. It helps improve the clarity and brightness of the image.",
    },
    {
      slot: "hotspot-illuminator",
      position: "0 0.5 0.58",
      normal: "0 1 0",
      label: "7",
      title: "Illuminator",
      desc: "Illuminator (Light Source): The illuminator is the light source of the microscope. It may be built-in or separate, providing the necessary illumination to illuminate the specimen for observation.",
    },
    {
      slot: "hotspot-rack_stop",
      position: "0 0.94 -0.05",
      normal: "0 0 1",
      label: "8",
      title: "Rack Stop",
      desc: "The rack stop is a mechanism that limits how far up the stage (where you place the slide) can go. It helps prevent the objective lens from touching the slide and potentially damaging it.",
    },
  ],
};

const alphabet = ["All", ..."ABCDEFGHIJKLMNOPRSTVW".split("")];
const BASE_CATEGORY = "Category:Laboratory_equipment";

const EquipmentGrid = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation states
  const [currentCategory, setCurrentCategory] = useState(BASE_CATEGORY);
  const [categoryHistory, setCategoryHistory] = useState([BASE_CATEGORY]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("All");

  // Sheet states
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // 3D & Fullscreen States
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modelContainerRef = useRef(null);

  // Reset hotspot when sheet closes
  useEffect(() => {
    if (!isSheetOpen) setActiveHotspot(null);
  }, [isSheetOpen]);

  // Listen for native browser fullscreen exit (ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  useEffect(() => {
    const fetchWikiCategory = async () => {
      setIsLoading(true);
      setEquipmentData([]); // Clear previous pages
      setSubcategories([]); // Clear previous subcategories

      try {
        const categoryUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
          currentCategory
        )}&cmnamespace=0|14&cmlimit=500&format=json&origin=*`;

        const categoryResponse = await fetch(categoryUrl);
        const categoryData = await categoryResponse.json();
        const allMembers = categoryData.query.categorymembers || [];

        const fetchedSubcategories = allMembers.filter((member) => member.ns === 14);
        const fetchedPages = allMembers.filter((member) => member.ns === 0);

        setSubcategories(fetchedSubcategories);

        const batchSize = 25;
        let allResults = [];

        for (let i = 0; i < fetchedPages.length; i += batchSize) {
          const batch = fetchedPages.slice(i, i + batchSize);

          const batchPromises = batch.map(async (page) => {
            try {
              const wikiResponse = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
                  page.title
                )}`
              );

              if (wikiResponse.ok) {
                const wikiData = await wikiResponse.json();
                return {
                  name: wikiData.title,
                  description: wikiData.extract || "No description available.",
                  imageUrl:
                    wikiData.thumbnail?.source ||
                    "https://via.placeholder.com/300x300?text=No+Image+Available",
                  wikiLink: wikiData.content_urls?.desktop?.page || "#",
                };
              }
            } catch (wikiError) {
              console.warn(`Failed to fetch Wikipedia data for ${page.title}`);
            }
            return null;
          });

          const batchResults = await Promise.all(batchPromises);
          allResults = [...allResults, ...batchResults.filter(Boolean)];

          setEquipmentData([...allResults]);
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWikiCategory();
  }, [currentCategory]);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleCategoryClick = (categoryTitle) => {
    setCurrentCategory(categoryTitle);
    setCategoryHistory([...categoryHistory, categoryTitle]);
    setSearchQuery(""); // Reset search when changing folders
    setActiveLetter("All");
  };

  const handleBreadcrumbClick = (index) => {
    const newHistory = categoryHistory.slice(0, index + 1);
    setCurrentCategory(newHistory[newHistory.length - 1]);
    setCategoryHistory(newHistory);
  };

  const formatCategoryName = (title) =>
    title.replace("Category:", "").replace(/_/g, " ");

  const filteredEquipment = equipmentData.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    let matchesLetter = true;
    if (activeLetter === "0-9") {
      matchesLetter = /^[0-9]/.test(item.name);
    } else if (activeLetter !== "All") {
      matchesLetter = item.name.toUpperCase().startsWith(activeLetter);
    }
    return matchesSearch && matchesLetter;
  });
  
  // Helper to check if the item is a microscope to trigger 3D view
  const isMicroscopeView = selectedItem?.name.toLowerCase().includes("microscope");

  return (
    <div className="w-full mx-auto p-6">
      {/* INJECTED CUSTOM HOTSPOT CSS */}
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
          transition: all 0.2s;
        }
        .Hotspot:hover {
          background: #f0f9ff;
          border-color: #0284c7;
          color: #0284c7;
        }
        .Hotspot.active {
          background: #0284c7;
          color: white;
          border-color: white;
          transform: scale(1.15);
          box-shadow: 0 4px 10px rgba(2, 132, 199, 0.4);
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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Lab Equipment Database
        </h2>

        {/* Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mb-6 bg-slate-100 px-4 py-2 rounded-lg inline-flex">
          <Home size={16} className="text-slate-400" />
          {categoryHistory.map((cat, index) => (
            <React.Fragment key={cat}>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-blue-600 transition-colors ${
                  index === categoryHistory.length - 1
                    ? "font-bold text-slate-800"
                    : ""
                }`}
              >
                {index === 0 ? "Main Directory" : formatCategoryName(cat)}
              </button>
              {index < categoryHistory.length - 1 && (
                <ChevronRight size={14} className="text-slate-400" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="bg-slate-50 border rounded-xl p-4 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search equipment in this category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-1 items-center text-sm">
            {alphabet.map((letter, index) => (
              <React.Fragment key={letter}>
                <button
                  onClick={() => setActiveLetter(letter)}
                  className={`px-2 py-1 rounded transition-colors ${
                    activeLetter === letter
                      ? "bg-purple-600 text-white font-bold"
                      : "text-purple-600 hover:bg-purple-100 hover:underline"
                  }`}
                >
                  {letter}
                </button>
                {index < alphabet.length - 1 && (
                  <span className="text-slate-300 font-bold px-1">·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {isLoading &&
      equipmentData.length === 0 &&
      subcategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <LogoLoader size="sm" />
          <p className="mt-4 animate-pulse">Loading Wikipedia data...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SUBCATEGORIES */}
          {subcategories.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                <Folder className="text-blue-500" size={20} />
                Subcategories
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subcategories.map((cat) => (
                  <button
                    key={cat.pageid}
                    onClick={() => handleCategoryClick(cat.title)}
                    className="flex items-center gap-3 p-3 text-left bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm group"
                  >
                    <Folder
                      size={18}
                      className="text-slate-400 group-hover:text-blue-500 transition-colors"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 line-clamp-2">
                      {formatCategoryName(cat.title)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* PAGES / EQUIPMENT */}
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">
              Pages ({filteredEquipment.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col relative"
                  >
                    {/* Visual indicator for 3D available items */}
                    {item.name.toLowerCase().includes("microscope") && (
                      <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
                        <Focus size={10} /> 3D View
                      </span>
                    )}
                    <div className="h-48 bg-slate-50 p-4 flex items-center justify-center border-b relative">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                        {item.name}
                      </h3>
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
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                  {equipmentData.length === 0
                    ? "No standard pages in this category."
                    : "No equipment found matching your criteria."}
                </div>
              )}
            </div>

            {isLoading && equipmentData.length > 0 && (
              <div className="flex justify-center mt-8 text-slate-400 animate-pulse text-sm">
                Fetching remaining items in background...
              </div>
            )}
          </section>
        </div>
      )}

      {/* SHADCN SHEET - BOTTOM LARGE VARIANT */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="bottom"
          className="w-full sm:max-w-full overflow-y-auto bg-white rounded-t-2xl p-6 md:p-10"
        >
          <div className="max-w-7xl mx-auto h-[80vh] flex flex-col">
            {selectedItem && (
              <>
                <SheetHeader className="mb-6 shrink-0">
                  <SheetTitle className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    {selectedItem.name}
                    {isMicroscopeView && (
                      <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                        <Focus size={14} /> Interactive 3D Model
                      </span>
                    )}
                  </SheetTitle>
                  <SheetDescription className="text-slate-500 text-base mt-1">
                    {isMicroscopeView 
                      ? "Click the numbers on the 3D model to explore its parts." 
                      : "Detailed overview sourced from Wikipedia."}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
                  
                  {/* LEFT PANEL: 3D MODEL OR IMAGE */}
                  <div 
                    ref={modelContainerRef}
                    className="w-full md:w-3/5 bg-slate-50 rounded-2xl overflow-hidden border flex items-center justify-center relative shadow-inner min-h-[400px] md:min-h-full"
                  >
                    {isMicroscopeView ? (
                      <>
                        <model-viewer
                          src="/models/compound_microscope.glb" 
                          camera-controls
                          auto-rotate
                          ar
                          shadow-intensity="1"
                          style={{ width: "100%", height: "100%", outline: "none", backgroundColor: "oklch(0.96 0.01 270)" }}
                        >
                          {/* CSS TOOLTIP HOTSPOTS */}
                          {hotspotConfig.Microscope.map((hotspot, idx) => (
                            <button
                              key={idx}
                              slot={hotspot.slot}
                              data-position={hotspot.position}
                              data-normal={hotspot.normal}
                              onClick={() => setActiveHotspot(hotspot)}
                              className={`Hotspot ${activeHotspot?.label === hotspot.label ? "active" : ""}`}
                            >
                              {hotspot.label}
                              <div className="HotspotAnnotation">
                                <div className="HotspotTitle">{hotspot.title}</div>
                                <div className="HotspotDesc">{hotspot.desc}</div>
                              </div>
                            </button>
                          ))}
                        </model-viewer>
                        
                        {/* FULLSCREEN BUTTON */}
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
                        className="max-h-[500px] object-contain mix-blend-multiply p-4"
                      />
                    )}
                  </div>

                  {/* RIGHT PANEL: INFO */}
                  <div className="w-full md:w-2/5 flex flex-col h-full overflow-y-auto pr-4 pl-1 pb-10">
                    <div>
                      {activeHotspot ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center gap-3 mb-4 border-b pb-3">
                            <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                              {activeHotspot.label}
                            </span>
                            <h4 className="text-xl font-bold text-slate-800">
                              {activeHotspot.title}
                            </h4>
                          </div>
                          <p className="text-base text-slate-700 leading-relaxed mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            {activeHotspot.desc}
                          </p>
                          <button 
                            onClick={() => setActiveHotspot(null)}
                            className="text-sm text-slate-500 hover:text-slate-800 underline"
                          >
                            ← Back to general overview
                          </button>
                        </div>
                      ) : (
                        <div className="animate-in fade-in duration-300">
                          <h4 className="text-lg font-bold text-slate-800 mb-2 border-b pb-2">
                            Wikipedia Overview
                          </h4>
                          <p className="text-base text-slate-700 leading-relaxed mb-6">
                            {selectedItem.description}
                          </p>

                          <a
                            href={selectedItem.wikiLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Read full article on Wikipedia →
                          </a>
                        </div>
                      )}
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