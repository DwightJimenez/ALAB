import React, { useState, useEffect, useRef } from "react";
import "@google/model-viewer";
import {
  Search,
  Folder,
  ChevronRight,
  Home,
  Focus,
  Maximize,
  Minimize,
  X,
  BookOpen,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
      desc: "Objective lenses are located on the revolving nosepiece and are responsible for the initial magnification of the specimen. Different objective lenses typically range from low to high power.",
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
      desc: "The illuminator is the light source of the microscope. It may be built-in or separate, providing the necessary illumination to illuminate the specimen for observation.",
    },
    {
      slot: "hotspot-rack_stop",
      position: "0 0.94 -0.05",
      normal: "0 0 1",
      label: "8",
      title: "Rack Stop",
      desc: "The rack stop limits how far up the stage can go. It helps prevent the objective lens from touching the slide and potentially damaging it.",
    },
  ],
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BASE_CATEGORY = "Category:Laboratory_equipment";

const EquipmentGrid = () => {
  // Directory States
  const [equipmentData, setEquipmentData] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global Search States
  const [globalSearchData, setGlobalSearchData] = useState([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  // Navigation & Filter States
  const [currentCategory, setCurrentCategory] = useState(BASE_CATEGORY);
  const [categoryHistory, setCategoryHistory] = useState([BASE_CATEGORY]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);

  // Sheet & UI States
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modelContainerRef = useRef(null);

  const isSearchMode = searchQuery.trim().length > 0;

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
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (modelContainerRef.current) {
        modelContainerRef.current.requestFullscreen().catch((err) => {
          console.error(
            `Error attempting to enable fullscreen: ${err.message}`,
          );
        });
      }
    } else {
      document.exitFullscreen();
    }
  };

  // --- 1. DIRECTORY FETCHER (Runs when navigating folders) ---
  useEffect(() => {
    const fetchWikiCategory = async () => {
      setIsLoading(true);
      setEquipmentData([]);
      setSubcategories([]);

      try {
        const categoryUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
          currentCategory,
        )}&cmnamespace=0|14&cmlimit=500&format=json&origin=*`;

        const categoryResponse = await fetch(categoryUrl);
        const categoryData = await categoryResponse.json();
        const allMembers = categoryData.query.categorymembers || [];

        const fetchedSubcategories = allMembers.filter(
          (member) => member.ns === 14,
        );
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
                  page.title,
                )}`,
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

  // --- 2. GLOBAL SEARCH FETCHER (Runs when typing in the search bar) ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalSearchData([]);
      setIsGlobalSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsGlobalSearching(true);
      try {
        // Append "laboratory" to the query so Wikipedia doesn't return unrelated movies/books
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          searchQuery + " laboratory",
        )}&gsrlimit=30&prop=pageimages|extracts&exchars=200&explaintext=1&pithumbsize=300&format=json&origin=*`;

        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.query && data.query.pages) {
          const pages = Object.values(data.query.pages);
          const results = pages.map((p) => ({
            name: p.title,
            description: p.extract || "No description available.",
            imageUrl:
              p.thumbnail?.source ||
              "https://via.placeholder.com/300x300?text=No+Image+Available",
            wikiLink: `https://en.wikipedia.org/?curid=${p.pageid}`,
          }));

          // Sort results to push exact title matches to the top
          results.sort((a, b) => {
            const aMatch = a.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            const bMatch = b.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
          });

          setGlobalSearchData(results);
        } else {
          setGlobalSearchData([]);
        }
      } catch (err) {
        console.error("Global search failed", err);
      } finally {
        setIsGlobalSearching(false);
      }
    }, 600); // 600ms debounce prevents spamming the API

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleCategoryClick = (categoryTitle) => {
    setCurrentCategory(categoryTitle);
    setCategoryHistory([...categoryHistory, categoryTitle]);
    setSearchQuery("");
    setActiveLetter(null);
  };

  const handleBreadcrumbClick = (index) => {
    const newHistory = categoryHistory.slice(0, index + 1);
    setCurrentCategory(newHistory[newHistory.length - 1]);
    setCategoryHistory(newHistory);
    setActiveLetter(null);
    setSearchQuery("");
  };

  const formatCategoryName = (title) =>
    title.replace("Category:", "").replace(/_/g, " ");

  // FILTER LOGIC FOR SUBCATEGORIES
  const filteredSubcategories = subcategories.filter((cat) => {
    const cleanName = formatCategoryName(cat.title);
    const matchesSearch = cleanName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesLetter = activeLetter
      ? cleanName.toUpperCase().startsWith(activeLetter)
      : true;
    return matchesSearch && matchesLetter;
  });

  // FILTER LOGIC FOR CURRENT DIRECTORY EQUIPMENT
  const filteredEquipment = equipmentData.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesLetter = activeLetter
      ? item.name.toUpperCase().startsWith(activeLetter)
      : true;
    return matchesSearch && matchesLetter;
  });

  // FILTER LOGIC FOR GLOBAL SEARCH EQUIPMENT
  const filteredGlobalEquipment = globalSearchData.filter((item) => {
    const matchesLetter = activeLetter
      ? item.name.toUpperCase().startsWith(activeLetter)
      : true;
    return matchesLetter;
  });

  const isMicroscopeView = selectedItem?.name
    .toLowerCase()
    .includes("microscope");

  const renderSkeletons = () => (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className='bg-white border rounded-xl h-[380px] overflow-hidden animate-pulse'
        >
          <div className='h-48 bg-slate-200'></div>
          <div className='p-4 space-y-3'>
            <div className='h-5 bg-slate-200 rounded w-3/4'></div>
            <div className='space-y-2'>
              <div className='h-3 bg-slate-100 rounded w-full'></div>
              <div className='h-3 bg-slate-100 rounded w-full'></div>
              <div className='h-3 bg-slate-100 rounded w-2/3'></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className='w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'>
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

      <div className='mb-8 space-y-6'>
        <div>
          <h2 className='text-3xl font-bold text-slate-900 tracking-tight'>
            Lab Equipment Database
          </h2>
          <p className='text-slate-500 mt-1'>
            Browse and search through Wikipedia's catalog of laboratory tools.
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        <div className='flex flex-wrap items-center gap-2 text-sm text-slate-600 bg-slate-100/80 px-4 py-2.5 rounded-lg border border-slate-200/60 w-fit'>
          <Home size={16} className='text-slate-400' />
          {categoryHistory.map((cat, index) => (
            <React.Fragment key={cat}>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-blue-600 transition-colors truncate max-w-[150px] sm:max-w-none ${
                  index === categoryHistory.length - 1
                    ? "font-bold text-slate-800"
                    : ""
                }`}
                title={formatCategoryName(cat)}
              >
                {index === 0 ? "Directory" : formatCategoryName(cat)}
              </button>
              {index < categoryHistory.length - 1 && (
                <ChevronRight size={14} className='text-slate-400 shrink-0' />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CONTROLS */}
        <div className='bg-white border shadow-sm rounded-xl p-5 flex flex-col gap-5'>
          <div className='relative max-w-xl w-full'>
            <Search
              className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
              size={18}
            />
            <input
              type='text'
              placeholder='Global Search: Find equipment anywhere...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-slate-50/50'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className='flex flex-wrap gap-2 items-center'>
            {alphabet.map((letter) => (
              <button
                key={letter}
                onClick={() =>
                  setActiveLetter(activeLetter === letter ? null : letter)
                }
                className={`w-8 h-8 rounded-md text-xs font-semibold transition-all duration-200 ${
                  activeLetter === letter
                    ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600/20 ring-offset-1 scale-110"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='space-y-10'>
        {/* SUBCATEGORIES (Always show if there's a match, even in Global Search) */}
        {filteredSubcategories.length > 0 && (
          <section>
            <h3 className='text-xl font-bold text-slate-800 mb-4 flex items-center gap-2'>
              <Folder className='text-blue-500' size={20} />
              {isSearchMode ? "Matching Folders" : "Subcategories"}
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
              {filteredSubcategories.map((cat) => (
                <button
                  key={cat.pageid}
                  onClick={() => handleCategoryClick(cat.title)}
                  className='flex items-center gap-3 p-3.5 text-left bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all group'
                >
                  <Folder
                    size={20}
                    className='text-slate-400 group-hover:text-blue-500 transition-colors shrink-0'
                  />
                  <span className='text-sm font-semibold text-slate-700 group-hover:text-blue-700 line-clamp-2 leading-tight'>
                    {formatCategoryName(cat.title)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PAGES / EQUIPMENT SECTION */}
        <section>
          <div className='flex items-center justify-between mb-4 border-b border-slate-200 pb-2'>
            <h3 className='text-xl font-bold text-slate-800'>
              {isSearchMode
                ? `Global Search Results for "${searchQuery}"`
                : "Equipment Pages"}
            </h3>
            <span className='text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full'>
              {isSearchMode
                ? filteredGlobalEquipment.length
                : filteredEquipment.length}{" "}
              found
            </span>
          </div>

          {/* DYNAMIC RENDERING BASED ON SEARCH MODE */}
          {isSearchMode ? (
            // --- SEARCH MODE UI ---
            isGlobalSearching ? (
              renderSkeletons()
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in duration-500'>
                {filteredGlobalEquipment.length > 0 ? (
                  filteredGlobalEquipment.map((item, index) => (
                    <div
                      key={index}
                      className='bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col relative group'
                    >
                      {item.name.toLowerCase().includes("microscope") && (
                        <span className='absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 shadow-sm'>
                          <Focus size={12} /> 3D View
                        </span>
                      )}

                      <div className='h-48 bg-white p-4 flex items-center justify-center border-b border-slate-100 relative group-hover:bg-slate-50 transition-colors'>
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className='max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105'
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/300x300?text=No+Image+Available";
                          }}
                        />
                      </div>

                      <div className='p-5 flex-1 flex flex-col'>
                        <h3 className='text-[1.05rem] font-bold text-slate-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors'>
                          {item.name}
                        </h3>
                        <p className='text-sm text-slate-600 line-clamp-3 mb-5 flex-1 leading-relaxed'>
                          {item.description}
                        </p>

                        <button
                          onClick={() => handleViewDetails(item)}
                          className='w-full py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-blue-600 hover:text-white text-sm transition-all'
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='col-span-full py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-3'>
                    <Search size={32} className='text-slate-300' />
                    <p className='font-medium text-slate-600'>
                      No global equipment found.
                    </p>
                  </div>
                )}
              </div>
            )
          ) : // --- DIRECTORY MODE UI ---
          isLoading && equipmentData.length === 0 ? (
            renderSkeletons()
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in duration-500'>
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((item, index) => (
                  <div
                    key={index}
                    className='bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col relative group'
                  >
                    {item.name.toLowerCase().includes("microscope") && (
                      <span className='absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 shadow-sm'>
                        <Focus size={12} /> 3D View
                      </span>
                    )}

                    <div className='h-48 bg-white p-4 flex items-center justify-center border-b border-slate-100 relative group-hover:bg-slate-50 transition-colors'>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className='max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105'
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/300x300?text=No+Image+Available";
                        }}
                      />
                    </div>

                    <div className='p-5 flex-1 flex flex-col'>
                      <h3 className='text-[1.05rem] font-bold text-slate-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors'>
                        {item.name}
                      </h3>
                      <p className='text-sm text-slate-600 line-clamp-3 mb-5 flex-1 leading-relaxed'>
                        {item.description}
                      </p>

                      <button
                        onClick={() => handleViewDetails(item)}
                        className='w-full py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-blue-600 hover:text-white text-sm transition-all'
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className='col-span-full py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-3'>
                  <Search size={32} className='text-slate-300' />
                  <p className='font-medium text-slate-600'>
                    No equipment found.
                  </p>
                </div>
              )}
            </div>
          )}

          {isLoading && equipmentData.length > 0 && !isSearchMode && (
            <div className='flex justify-center items-center gap-2 mt-8 text-slate-500 font-medium animate-pulse text-sm bg-slate-50 py-3 rounded-lg border border-slate-200'>
              <LogoLoader size='sm' />
              Fetching more items from directory...
            </div>
          )}
        </section>

        {/* Global Empty State if BOTH subcategories and pages return 0 matches */}
        {!isLoading &&
          !isGlobalSearching &&
          filteredSubcategories.length === 0 &&
          ((isSearchMode && filteredGlobalEquipment.length === 0) ||
            (!isSearchMode && filteredEquipment.length === 0)) && (
            <div className='py-20 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4'>
              <Search size={48} className='text-slate-200' />
              <div>
                <p className='text-lg font-bold text-slate-700'>
                  No results found
                </p>
                <p className='text-sm mt-1'>
                  We couldn't find any folders or equipment matching your
                  filters.
                </p>
              </div>
              <Button
                variant='outline'
                onClick={() => {
                  setSearchQuery("");
                  setActiveLetter(null);
                }}
                className='mt-2 border-slate-300'
              >
                Clear all filters
              </Button>
            </div>
          )}
      </div>

      {/* SHADCN SHEET - BOTTOM LARGE VARIANT */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side='bottom'
          className='w-full sm:max-w-full overflow-y-auto bg-white rounded-t-3xl p-6 md:p-10 shadow-2xl'
        >
          <div className='max-w-7xl mx-auto h-[85vh] flex flex-col'>
            {selectedItem && (
              <>
                <SheetHeader className='mb-6 shrink-0 text-left'>
                  <SheetTitle className='text-3xl md:text-4xl font-black text-slate-900 flex flex-wrap items-center gap-4'>
                    {selectedItem.name}
                    {isMicroscopeView && (
                      <span className='bg-blue-100 text-blue-700 text-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-bold tracking-wide border border-blue-200'>
                        <Focus size={16} /> Interactive 3D Model
                      </span>
                    )}
                  </SheetTitle>
                  <SheetDescription className='text-slate-500 text-base md:text-lg mt-2 max-w-3xl'>
                    {isMicroscopeView
                      ? "Click the numbers on the 3D model to explore its distinct parts and functions."
                      : "Detailed overview sourced from Wikipedia."}
                  </SheetDescription>
                </SheetHeader>

                <div className='flex flex-col md:flex-row gap-8 flex-1 min-h-0'>
                  {/* LEFT PANEL: 3D MODEL OR IMAGE */}
                  <div
                    ref={modelContainerRef}
                    className='w-full md:w-3/5 bg-slate-100/50 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative min-h-[400px] md:min-h-full'
                  >
                    {isMicroscopeView ? (
                      <>
                        <model-viewer
                          src='/models/compound_microscope.glb'
                          camera-controls
                          auto-rotate
                          ar
                          shadow-intensity='1'
                          style={{
                            width: "100%",
                            height: "100%",
                            outline: "none",
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          <div slot='poster' className='loading-poster'>
                            <LogoLoader size='sm' />
                          </div>
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
                              <div className='HotspotAnnotation'>
                                <div className='HotspotTitle'>
                                  {hotspot.title}
                                </div>
                                <div className='HotspotDesc'>
                                  {hotspot.desc}
                                </div>
                              </div>
                            </button>
                          ))}
                        </model-viewer>

                        <button
                          onClick={toggleFullscreen}
                          className='absolute bottom-4 right-4 p-3 bg-white/90 hover:bg-white text-slate-800 rounded-full transition-all shadow-md hover:shadow-lg border border-slate-200 z-50 flex items-center justify-center'
                          title={
                            isFullscreen
                              ? "Exit Fullscreen"
                              : "Enter Fullscreen"
                          }
                        >
                          {isFullscreen ? (
                            <Minimize size={20} />
                          ) : (
                            <Maximize size={20} />
                          )}
                        </button>
                      </>
                    ) : (
                      <div className='w-full h-full flex items-center justify-center p-8 bg-white'>
                        <img
                          src={selectedItem.imageUrl}
                          alt={selectedItem.name}
                          className='max-h-[600px] object-contain mix-blend-multiply hover:scale-105 transition-transform duration-700'
                        />
                      </div>
                    )}
                  </div>

                  {/* RIGHT PANEL: INFO */}
                  <div className='w-full md:w-2/5 flex flex-col h-full overflow-y-auto pr-4 pl-1 pb-10 custom-scrollbar'>
                    <div>
                      {activeHotspot ? (
                        <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
                          <div className='flex items-center gap-3 mb-5 border-b border-slate-200 pb-4'>
                            <span className='w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-lg shadow-md ring-4 ring-blue-50'>
                              {activeHotspot.label}
                            </span>
                            <h4 className='text-2xl font-bold text-slate-800'>
                              {activeHotspot.title}
                            </h4>
                          </div>
                          <p className='text-[1.05rem] text-slate-700 leading-relaxed mb-6 bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm'>
                            {activeHotspot.desc}
                          </p>
                          <button
                            onClick={() => setActiveHotspot(null)}
                            className='inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg'
                          >
                            ← Back to general overview
                          </button>
                        </div>
                      ) : (
                        <div className='animate-in fade-in duration-300'>
                          <h4 className='text-xl font-bold text-slate-900 mb-3 border-b border-slate-200 pb-3 flex items-center gap-2'>
                            <BookOpen size={20} className='text-blue-600' />
                            Wikipedia Overview
                          </h4>
                          <p className='text-[1.05rem] text-slate-700 leading-relaxed mb-8'>
                            {selectedItem.description}
                          </p>

                          <a
                            href={selectedItem.wikiLink}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm'
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
