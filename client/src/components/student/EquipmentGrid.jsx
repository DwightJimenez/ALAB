import React, { useState, useEffect, useRef } from "react";
import "@google/model-viewer";
import { Maximize, Minimize } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import LogoLoader from "../LogoLoader";

// 1. DYNAMIC HOTSPOT CONFIGURATION
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


const STANDARD_LAB_EQUIPMENT = [
  {
    name: "Microscope",
    wikiTerm: "Optical_microscope",
    modelSrc: "/models/compound_microscope.glb",
    uses: "Used to observe microorganisms, cells, and structures that are too small to be seen with the naked eye.",
  },
  {
    name: "Beaker",
    wikiTerm: "Beaker_(laboratory_equipment)",
    modelSrc: null,
    uses: "Used for stirring, mixing, and heating liquids. Not meant for accurate volume measurements.",
  },
  {
    name: "Erlenmeyer Flask",
    wikiTerm: "Erlenmeyer_flask",
    modelSrc: null,
    uses: "Features a conical body and cylindrical neck; ideal for mixing by swirling without the risk of spilling.",
  },
  {
    name: "Graduated Cylinder",
    wikiTerm: "Graduated_cylinder",
    modelSrc: null,
    uses: "Used to measure the volume of a liquid accurately.",
  },
  {
    name: "Test Tube",
    wikiTerm: "Test_tube",
    modelSrc: null,
    uses: "Used to hold, mix, or heat small quantities of solid or liquid chemicals.",
  },
  {
    name: "Bunsen Burner",
    wikiTerm: "Bunsen_burner",
    modelSrc: null,
    uses: "Produces a single open gas flame, used for heating, sterilization, and combustion.",
  },
  {
    name: "Pipette",
    wikiTerm: "Pipette",
    modelSrc: null,
    uses: "Used to transport a measured volume of liquid safely and accurately.",
  },
  {
    name: "Petri Dish",
    wikiTerm: "Petri_dish",
    modelSrc: null,
    uses: "A shallow, circular, transparent dish used to culture microorganisms like bacteria.",
  },
  {
    name: "Laboratory Funnel",
    wikiTerm: "Laboratory_funnel",
    modelSrc: null,
    uses: "Used to channel liquid or fine-grained substances into containers with a small opening to prevent spilling.",
  },
  {
    name: "Wash Bottle",
    wikiTerm: "Wash_bottle",
    modelSrc: null,
    uses: "A squeeze bottle with a nozzle used to rinse various pieces of laboratory glassware, such as test tubes and flasks.",
  },
  {
    name: "Volumetric Flask",
    wikiTerm: "Volumetric_flask",
    modelSrc: null,
    uses: "Used to prepare standard solutions and measure highly accurate volumes of liquid.",
  },
  {
    name: "Crucible",
    wikiTerm: "Crucible",
    modelSrc: null,
    uses: "A ceramic or metal container in which metals or other substances may be melted or subjected to very high temperatures.",
  },
  {
    name: "Thermometer",
    wikiTerm: "Thermometer",
    modelSrc: null,
    uses: "Used to measure the temperature or temperature gradient of a solution or environment.",
  },
  {
    name: "Analytical Balance",
    wikiTerm: "Analytical_balance",
    modelSrc: null,
    uses: "A highly sensitive lab instrument designed to accurately measure mass in the sub-milligram range.",
  },
  {
    name: "Crucible Tongs",
    wikiTerm: "Crucible_tongs",
    modelSrc: null,
    uses: "Used to safely grasp and lift hot laboratory equipment like crucibles or evaporating dishes.",
  },
  {
    name: "Watch Glass",
    wikiTerm: "Watch_glass",
    modelSrc: null,
    uses: "A circular concave piece of glass used to evaporate liquids, hold solids while being weighed, or serve as a beaker cover.",
  },
  {
    name: "Evaporating Dish",
    wikiTerm: "Evaporating_dish",
    modelSrc: null,
    uses: "Used for the evaporation of solutions and supernatant liquids to produce a solid residue.",
  },
  {
    name: "Ring Stand",
    wikiTerm: "Retort_stand",
    modelSrc: null,
    uses: "A heavy metal base with a pole used to support other pieces of equipment and glassware during experiments.",
  },
  
  // --- NEW ADDITIONS BELOW ---

  {
    name: "Burette",
    wikiTerm: "Burette",
    modelSrc: null,
    uses: "A graduated glass tube with a tap at one end, used to deliver known volumes of a liquid, especially in titrations.",
  },
  {
    name: "Mortar and Pestle",
    wikiTerm: "Mortar_and_pestle",
    modelSrc: null,
    uses: "Used to crush, grind, and mix solid substances into a fine powder or paste.",
  },
  {
    name: "Glass Stirring Rod",
    wikiTerm: "Glass_rod",
    modelSrc: null,
    uses: "Used to mix chemicals and liquids for laboratory purposes without reacting with the substances.",
  },
  {
    name: "Spatula",
    wikiTerm: "Spatula",
    modelSrc: null,
    uses: "Used for scraping, transferring, or applying powders and paste-like chemicals from one container to another.",
  },
  {
    name: "Test Tube Rack",
    wikiTerm: "Test_tube_rack",
    modelSrc: null,
    uses: "Used to hold upright multiple test tubes at the same time, preventing spills and allowing easy observation.",
  },
  {
    name: "Dropper",
    wikiTerm: "Eye_dropper",
    modelSrc: null,
    uses: "Used to transfer small quantities of liquids, usually drop by drop.",
  },
  {
    name: "Hot Plate",
    wikiTerm: "Hot_plate",
    modelSrc: null,
    uses: "An adjustable heating source used to uniformly heat glassware or its contents without the open flame of a Bunsen burner.",
  },
  {
    name: "Magnetic Stirrer",
    wikiTerm: "Magnetic_stirrer",
    modelSrc: null,
    uses: "Employs a rotating magnetic field to cause a stir bar immersed in a liquid to spin very quickly, stirring it.",
  },
  {
    name: "Centrifuge",
    wikiTerm: "Centrifuge",
    modelSrc: null,
    uses: "Uses centrifugal force to separate fluids of different densities or liquids from solids.",
  },
  {
    name: "Desiccator",
    wikiTerm: "Desiccator",
    modelSrc: null,
    uses: "A sealable enclosure containing desiccants used for preserving moisture-sensitive items or cooling heated objects safely.",
  },
  {
    name: "Fume Hood",
    wikiTerm: "Fume_hood",
    modelSrc: null,
    uses: "A ventilated enclosure that limits exposure to hazardous or toxic fumes, vapors, or dusts.",
  },
  {
    name: "Utility Clamp",
    wikiTerm: "Retort_clamp",
    modelSrc: null,
    uses: "Attached to a ring stand to hold laboratory glassware, such as Erlenmeyer flasks, glass tubing, or burettes, securely in place.",
  },
  {
    name: "Wire Gauze",
    wikiTerm: "Wire_gauze",
    modelSrc: null,
    uses: "Placed on a support ring attached to a ring stand to support glassware during heating and distribute the heat evenly.",
  },
  {
    name: "Florence Flask",
    wikiTerm: "Florence_flask",
    modelSrc: null,
    uses: "Features a round body and a long neck; used to hold liquids and can be easily swirled and heated.",
  }
];

const EquipmentGrid = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fullscreen State and Refs
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modelContainerRef = useRef(null);

  useEffect(() => {
    const fetchWikiDescriptions = async () => {
      setIsLoading(true);

      try {
        const fetchPromises = STANDARD_LAB_EQUIPMENT.map(async (item) => {
          try {
            const wikiResponse = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${item.wikiTerm}`,
            );

            if (wikiResponse.ok) {
              const wikiData = await wikiResponse.json();
              return {
                ...item,
                description: wikiData.extract || "No description available.",
                imageUrl:
                  wikiData.thumbnail?.source ||
                  "https://via.placeholder.com/150?text=No+Image",
              };
            }
          } catch (wikiError) {
            console.warn(`Failed to fetch Wikipedia data for ${item.name}`);
          }

          // Fallback if Wiki fetch fails
          return {
            ...item,
            description: "No Wikipedia description available.",
            imageUrl: "https://via.placeholder.com/150?text=No+Image",
          };
        });

        const results = await Promise.all(fetchPromises);
        setEquipmentData(results);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWikiDescriptions();
  }, []);

  // Listen for the escape key exiting fullscreen native browser behavior
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

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

  return (
    <div className='w-full mx-auto p-6'>
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

      <div className='mb-8'>
        <h2 className='text-2xl font-bold text-slate-800'>
          Standard Lab Equipment
        </h2>
        <p className='text-slate-500'>
          Laboratory tools overview, functions, and descriptions sourced
          automatically via Wikipedia REST API.
        </p>
      </div>

      {isLoading ? (
        <div className='flex justify-center p-12 '>
          <LogoLoader size='sm' />
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700'>
          {equipmentData.map((item, index) => (
            <div
              key={index}
              className='bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col'
            >
              <div className='h-48 bg-slate-50 p-4 flex items-center justify-center border-b relative'>
                {item.modelSrc && (
                  <span className='absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10'>
                    3D VIEW
                  </span>
                )}
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className='max-h-full max-w-full object-contain mix-blend-multiply'
                />
              </div>

              <div className='p-4 flex-1 flex flex-col'>
                <h3 className='text-lg font-bold text-slate-800 mb-2'>
                  {item.name}
                </h3>
                {/* Replaced short description with the Uses field */}
                <p className='text-sm text-slate-600 line-clamp-3 mb-4 flex-1'>
                  <span className='font-semibold text-slate-700'>Uses: </span>
                  {item.uses}
                </p>

                <button
                  onClick={() => handleViewDetails(item)}
                  className='w-full py-2 bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 text-sm transition-colors'
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
          side='bottom'
          className='w-full sm:max-w-full overflow-y-auto bg-white rounded-t-2xl p-6 md:p-10'
        >
          <div className='max-w-7xl mx-auto h-[80vh] flex flex-col'>
            {selectedItem && (
              <>
                <SheetHeader className='mb-6 shrink-0'>
                  <SheetTitle className='text-3xl font-bold text-slate-800'>
                    {selectedItem.name}
                  </SheetTitle>
                  <SheetDescription className='text-slate-500 text-base mt-1'>
                    Interactive model, primary functions, and detailed overview.
                  </SheetDescription>
                </SheetHeader>

                <div className='flex flex-col md:flex-row gap-8 flex-1 min-h-0'>
                  {/* Left Side: 3D Model OR 2D Image */}
                  <div
                    ref={modelContainerRef}
                    className='w-full md:w-3/5 bg-slate-100 rounded-2xl overflow-hidden border flex items-center justify-center relative shadow-inner min-h-[400px] md:min-h-full'
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
                            height: "100%",
                            backgroundColor: "oklch(0.96 0.01 270)",
                          }}
                        >
                          <div
                            slot='poster'
                            className='absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm z-40'
                          >
                            <LogoLoader size='sm' />
                          </div>
                          {/* DYNAMIC HOTSPOT RENDERING */}
                          {hotspotConfig[selectedItem.name]?.map(
                            (hotspot, index) => (
                              <button
                                key={index}
                                className='Hotspot'
                                slot={hotspot.slot}
                                data-position={hotspot.position}
                                data-normal={hotspot.normal}
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
                            ),
                          )}
                        </model-viewer>

                        {/* Fullscreen Toggle Button */}
                        <button
                          onClick={toggleFullscreen}
                          className='absolute bottom-4 right-4 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all shadow-lg backdrop-blur-sm z-50 flex items-center justify-center'
                          title='Toggle Fullscreen'
                        >
                          {isFullscreen ? (
                            <Minimize size={20} />
                          ) : (
                            <Maximize size={20} />
                          )}
                        </button>
                      </>
                    ) : (
                      <img
                        src={selectedItem.imageUrl}
                        alt={selectedItem.name}
                        className='max-h-96 object-contain mix-blend-multiply p-4'
                      />
                    )}
                  </div>

                  {/* Right Side: Full Text */}
                  <div className='w-full md:w-2/5 flex flex-col h-full overflow-y-auto pr-4 pl-1 pb-10'>
                    <div className='mb-6'>
                      <h4 className='text-lg font-bold text-slate-800 mb-2 border-b pb-2'>
                        Primary Uses
                      </h4>
                      <p className='text-base text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100'>
                        {selectedItem.uses}
                      </p>
                    </div>

                    <div>
                      <h4 className='text-lg font-bold text-slate-800 mb-2 border-b pb-2'>
                        Wikipedia Overview
                      </h4>
                      <p className='text-base text-slate-700 leading-relaxed'>
                        {selectedItem.description}
                      </p>
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
