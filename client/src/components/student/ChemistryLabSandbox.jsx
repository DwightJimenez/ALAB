import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Droplets,
  Flame,
  Sparkles,
  Info,
  RefreshCcw,
  Search,
} from "lucide-react";

import reactionsDb from "../../reactionDb.json";
import availableChemicals from "../../availableChemicals.json";

// Light, clean chemical tile with CUSTOM HOVER REVEAL & DISABLED STATE
const DraggableChemical = ({
  chemical,
  isMobile,
  isDisabled,
  onDragStartCb,
  onDragEndCb,
}) => {
  const handleDragStart = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("chemicalId", chemical.id);
    e.dataTransfer.effectAllowed = "copy";
    if (onDragStartCb) onDragStartCb(chemical.id);
  };

  const handleDragEnd = () => {
    if (onDragEndCb) onDragEndCb();
  };

  const handleClick = () => {
    if (isDisabled) return; // Prevent clicking if disabled

    if (isMobile) {
      window.dispatchEvent(
        new CustomEvent("chemical-selected", { detail: chemical.id }),
      );
    }
  };

  return (
    <div
      draggable={!isMobile && !isDisabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`group relative flex-shrink-0 w-28 h-20 rounded-2xl flex items-center justify-center shadow-md border-2 transition-all 
      ${
        isDisabled
          ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed grayscale" // Disabled styling
          : `border-slate-200 bg-white hover:-translate-y-2 hover:shadow-xl hover:border-blue-400 hover:bg-blue-50 ${
              isMobile ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
            }`
      }`}
    >
      <div className='absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 group-hover:opacity-0'>
        <div
          className={`absolute top-2 right-2 w-3 h-3 rounded-full shadow-sm ${chemical.color}`}
        />
        <span className='text-center text-[11px] text-slate-700 leading-tight'>
          {chemical.name}
        </span>
      </div>

      <div className='absolute inset-0 flex flex-col items-center justify-center p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
        <span className='w-full text-[12px] text-blue-700 text-center leading-tight'>
          {chemical.id}
        </span>
      </div>
    </div>
  );
};

// ... (ReactionVisualizer remains the same)
const ReactionVisualizer = ({ effect, contents }) => {
  const liquidHeight =
    contents.length === 0 ? "h-0" : contents.length === 1 ? "h-1/3" : "h-2/3";
  let liquidColor = "bg-blue-300/60";
  let animationClass = "transition-all duration-700 ease-in-out";
  let particles = [];

  if (contents.length === 1) {
    const chem = availableChemicals.find((c) => c.id === contents[0]);
    if (chem && chem.type !== "solid" && chem.type !== "gas") {
      liquidColor = chem.color
        .replace("bg-", "bg-")
        .replace("-100", "-300/60")
        .replace("-200", "-400/60");
    }
  }

  if (effect === "neutralization") {
    liquidColor = "bg-teal-300/70";
    animationClass += " animate-pulse";
  } else if (effect === "explosion") {
    liquidColor = "bg-orange-500/80";
    particles = Array(10)
      .fill()
      .map((_, i) => (
        <Flame
          key={i}
          className='absolute text-orange-600 w-8 h-8 animate-ping'
          style={{
            left: `${Math.random() * 80}%`,
            top: `${Math.random() * 80}%`,
          }}
        />
      ));
  } else if (effect === "bubbling") {
    liquidColor = "bg-amber-200/70";
    particles = Array(15)
      .fill()
      .map((_, i) => (
        <Droplets
          key={i}
          className='absolute text-white w-5 h-5 animate-bounce'
          style={{
            left: `${Math.random() * 80}%`,
            top: `${Math.random() * 80}%`,
            animationDuration: `${0.4 + Math.random()}s`,
          }}
        />
      ));
  } else if (effect === "precipitate") {
    liquidColor = "bg-slate-300/70";
    particles = [
      <div
        key='solid'
        className='absolute bottom-0 w-full h-1/4 bg-slate-100/90 rounded-b-[2.5rem] border-t-2 border-slate-300'
      ></div>,
    ];
  } else if (effect === "flash") {
    liquidColor = "bg-yellow-300/90";
  } else if (effect === "inert" && contents.length === 2) {
    liquidColor = "bg-slate-300/50";
  }

  return (
    <div className='relative w-65 h-75 border-[6px] border-slate-300 rounded-b-[3rem] rounded-t-xl mx-auto flex items-end justify-center overflow-hidden bg-white/50 backdrop-blur-sm shadow-inner'>
      <div
        className={`absolute bottom-0 w-full ${liquidHeight} ${liquidColor} ${animationClass} rounded-b-[2.5rem]`}
      >
        {particles}
      </div>
      <div className='absolute top-3 left-3 w-8 h-[85%] bg-white/40 rounded-full blur-[2px] transform -rotate-6 pointer-events-none'></div>
    </div>
  );
};

export default function ChemistryLabSandbox() {
  const [flaskContents, setFlaskContents] = useState([]);
  const [reactionResult, setReactionResult] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Track chemical being actively dragged to disable others immediately
  const [draggedChem, setDraggedChem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleCustomDrop = (e) => handleAddChemical(e.detail);
    window.addEventListener("chemical-selected", handleCustomDrop);
    return () =>
      window.removeEventListener("chemical-selected", handleCustomDrop);
  }, [flaskContents]);

  const combineChemicals = (chemA, chemB) => {
    const reactants = [chemA, chemB].sort();
    const lookupKey = reactants.join("+");

    if (reactionsDb[lookupKey]) {
      return reactionsDb[lookupKey];
    }

    return {
      productName: "Inert Mixture",
      reactionType: "Physical Mixture",
      visualEffect: "inert",
      description:
        "These chemicals do not react with each other under standard conditions.",
      equation: `${chemA} + ${chemB} → No Reaction`,
    };
  };

  const handleAddChemical = (chemicalId) => {
    if (flaskContents.length >= 2) return;
    const newContents = [...flaskContents, chemicalId];
    setFlaskContents(newContents);
    setShowDetails(false);

    if (newContents.length === 2) {
      setReactionResult(combineChemicals(newContents[0], newContents[1]));
    }
  };

  const handleEmptyFlask = () => {
    setFlaskContents([]);
    setReactionResult(null);
    setShowDetails(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedChemical = e.dataTransfer.getData("chemicalId");
    if (droppedChemical) handleAddChemical(droppedChemical);
    setDraggedChem(null); // Reset drag state on drop
  };

  const filteredChemicals = availableChemicals.filter(
    (chem) =>
      chem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (chem.name && chem.name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // NEW: Helper function to determine if a tile should be disabled
  const checkIsDisabled = (chemId) => {
    // 1. If flask is full, everything is disabled
    if (flaskContents.length >= 2) return true;

    // 2. Identify the "active" chemical to check against
    // (either already sitting in the flask, or currently being dragged)
    const activeChem =
      flaskContents.length === 1 ? flaskContents[0] : draggedChem;

    // 3. If there is no active chemical, nothing is disabled
    if (!activeChem) return false;

    // 4. Check if the combination exists in reactionsDb
    const lookupKey = [activeChem, chemId].sort().join("+");
    return !reactionsDb[lookupKey];
  };

  return (
    <div className='h-screen w-full bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden selection:bg-blue-200'>
      <main className='flex-1 relative flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto'>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className='relative flex items-center w-full max-w-3xl gap-8'
        >
          <ReactionVisualizer
            effect={reactionResult?.visualEffect}
            contents={flaskContents}
          />

          <div className='h-16 mt-8 flex items-center justify-center font-mono text-4xl font-bold tracking-widest text-slate-700'>
            {flaskContents.length === 0 ? (
              <span className='text-slate-400 text-lg font-sans tracking-normal font-medium'>
                {isMobile ? "Tap chemicals below" : "Drop chemicals here"}
              </span>
            ) : (
              <div className='gap-2 flex flex-col'>
                <span className='w-full text-center'>
                  {flaskContents[0]}{" "}
                  {flaskContents.length > 1 && (
                    <span className='text-slate-400 mx-auto'>+</span>
                  )}{" "}
                  {flaskContents[1]}
                </span>
                <button
                  onClick={handleEmptyFlask}
                  className='p-4 w-fit mx-auto bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors shadow-md'
                >
                  <RefreshCcw className='w-5 h-5' />
                </button>
              </div>
            )}
          </div>

          <div
            className={`w-full mt-6 transition-all duration-300 ease-out transform ${reactionResult ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}`}
          >
            {/* ... (Reaction result card remains the same) */}
            {reactionResult && (
              <div className='bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xl flex flex-col items-center text-center'>
                <div className='flex items-center gap-3 mb-2'>
                  {reactionResult.visualEffect !== "inert" && (
                    <Sparkles className='w-8 h-8 text-blue-500' />
                  )}
                  <h3 className='font-bold text-3xl text-slate-800'>
                    {reactionResult.productName}
                  </h3>
                </div>

                <p className='text-slate-500 text-lg mb-6 font-medium bg-slate-100 px-4 py-1 rounded-full'>
                  {reactionResult.reactionType}
                </p>

                <div className='mt-6 pt-6 border-t border-slate-100 w-full text-left animate-in fade-in slide-in-from-top-2'>
                  <div className='font-mono text-base text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 overflow-x-auto whitespace-nowrap shadow-inner'>
                    {reactionResult.equation}
                  </div>
                  <p className='text-lg text-slate-600 leading-relaxed'>
                    {reactionResult.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className='bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex flex-col items-center'>
        {/* Search Bar */}
        <div className='w-full max-w-5xl px-2 mb-4'>
          <div className='relative group'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors' />
            <input
              type='text'
              placeholder='Search chemicals by name or symbol...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full md:w-80 pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-blue-400 hover:border-blue-300 transition-colors text-slate-700 font-medium placeholder-slate-400'
            />
          </div>
        </div>

        {/* 3-Layer Display Grid */}
        <div className='w-full max-w-5xl grid grid-rows-3 grid-flow-col gap-3 overflow-x-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent'>
          {filteredChemicals.length > 0 ? (
            filteredChemicals.map((chem) => (
              <DraggableChemical
                key={chem.id}
                chemical={chem}
                isMobile={isMobile}
                isDisabled={checkIsDisabled(chem.id)} // Pass down the disabled state
                onDragStartCb={setDraggedChem} // Track actively dragged item
                onDragEndCb={() => setDraggedChem(null)}
              />
            ))
          ) : (
            <p className='text-slate-400 italic py-4 col-span-full'>
              No chemicals found.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
