import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Droplets,
  Flame,
  Sparkles,
  Info,
  RefreshCcw,
  Search,
  Loader2,
  AlertTriangle
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
    if (isDisabled) return;
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
          ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed grayscale"
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

// Visualizer with AI Loading State
const ReactionVisualizer = ({ effect, contents, isAnalyzing }) => {
  const liquidHeight =
    contents.length === 0 ? "h-0" : contents.length === 1 ? "h-1/3" : "h-2/3";
  let liquidColor = "bg-blue-300/60";
  let animationClass = "transition-all duration-700 ease-in-out";
  let particles = [];

  if (isAnalyzing) {
    liquidColor = "bg-indigo-400/80";
    animationClass += " animate-pulse";
    particles = (
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='w-full h-1 bg-indigo-200/50 absolute animate-[scan_1.5s_ease-in-out_infinite]' />
      </div>
    );
  } else {
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [draggedChem, setDraggedChem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const API_URL = import.meta.env.VITE_API_URL;

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

  // Hybrid AI Fetch Logic
  const handleAddChemical = async (chemicalId) => {
    if (flaskContents.length >= 2 || isAnalyzing) return;

    const newContents = [...flaskContents, chemicalId];
    setFlaskContents(newContents);

    if (newContents.length === 2) {
      const chemA = newContents[0];
      const chemB = newContents[1];
      const lookupKey = [chemA, chemB].sort().join("+");

      // 1. Local Cache Check
      if (reactionsDb[lookupKey]) {
        setReactionResult(reactionsDb[lookupKey]);
        return;
      }

      // 2. Gemini API Check
      setIsAnalyzing(true);
      setReactionResult(null);

      try {
        // NOTE: Adjust localhost port to match your Express server port!
        const response = await fetch(`${API_URL}/api/ai/evaluate-reaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chemA, chemB }),
          credentials: "include",
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        reactionsDb[lookupKey] = data; // Cache locally for session
        setReactionResult(data);
      } catch (error) {
        console.error("Analysis Failed:", error);
        setReactionResult({
          productName: "Unknown Mixture",
          reactionType: "Analysis Failed",
          visualEffect: "inert",
          description:
            "Could not evaluate this combination due to a network error.",
          equation: `${chemA} + ${chemB} → ?`,
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleEmptyFlask = () => {
    setFlaskContents([]);
    setReactionResult(null);
    setIsAnalyzing(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedChemical = e.dataTransfer.getData("chemicalId");
    if (droppedChemical) handleAddChemical(droppedChemical);
    setDraggedChem(null);
  };

  const filteredChemicals = availableChemicals
    .filter(
      (chem) =>
        chem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chem.name &&
          chem.name.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => {
      const catA = (a.category || a.type || "Other").toLowerCase();
      const catB = (b.category || b.type || "Other").toLowerCase();
      if (catA < catB) return -1;
      if (catA > catB) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

  // Updated disabled check: Only disable if flask is full or AI is thinking.
  // We WANT users to be able to drag unknown combos so the AI can evaluate them!
  const checkIsDisabled = () => {
    if (flaskContents.length >= 2 || isAnalyzing) return true;
    return false;
  };

  return (
    // FIXED LAYOUT: h-[100dvh] and fixed inset-0 locks the parent from scrolling
    <div className='h-[100dvh] w-full fixed inset-0 bg-slate-50 text-slate-800 font-sans flex flex-col lg:flex-row-reverse overflow-hidden selection:bg-blue-200'>
      {/* Main Sandbox Area */}
      <div className='flex-1 relative flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto'>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className='relative flex flex-col items-center w-full max-w-3xl gap-8'
        >
          <ReactionVisualizer
            effect={reactionResult?.visualEffect}
            contents={flaskContents}
            isAnalyzing={isAnalyzing}
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
            className={`w-full mt-6 transition-all duration-300 ease-out transform ${reactionResult || isAnalyzing ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}`}
          >
            {isAnalyzing ? (
              <div className='bg-white rounded-3xl p-6 lg:p-8 border border-indigo-100 shadow-xl flex flex-col items-center text-center'>
                <Loader2 className='w-10 h-10 text-indigo-500 animate-spin mb-4' />
                <h3 className='text-xl font-bold text-slate-700'>
                  AI Engine Analyzing...
                </h3>
                <p className='text-slate-500'>
                  Evaluating molecular interaction at standard conditions
                </p>
              </div>
            ) : (
              reactionResult && (
                <div className='bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xl flex flex-col items-center text-center'>
                  <div className='flex items-center gap-3 mb-2'>
                    {reactionResult.visualEffect !== "inert" && (
                      <Sparkles className='w-8 h-8 text-blue-500' />
                    )}
                    <h3 className='font-bold text-3xl text-slate-800'>
                      {reactionResult.productName}
                    </h3>
                  </div>

                  <p className='text-slate-500 text-lg mb-4 font-medium bg-slate-100 px-4 py-1 rounded-full'>
                    {reactionResult.reactionType}
                  </p>

                  {/* NEW: Safety Warning Box */}
                  {reactionResult.warning &&
                    reactionResult.warning.toLowerCase() !== "none" && (
                      <div className='flex items-start gap-3 w-full bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-left animate-in fade-in slide-in-from-bottom-2'>
                        <AlertTriangle className='w-6 h-6 flex-shrink-0 mt-0.5 text-red-500' />
                        <p className='text-sm font-medium leading-relaxed'>
                          <strong className='block text-red-800 mb-0.5 uppercase tracking-wide text-xs'>
                            Safety Warning
                          </strong>
                          {reactionResult.warning}
                        </p>
                      </div>
                    )}

                  <div className='mt-5 pt-5 border-t border-slate-100 w-full text-left animate-in fade-in slide-in-from-top-2'>
                    <div className='font-mono text-base text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 overflow-x-auto whitespace-nowrap shadow-inner'>
                      {reactionResult.equation}
                    </div>
                    <p className='text-lg text-slate-600 leading-relaxed'>
                      {reactionResult.description}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* FIXED SIDEBAR/BOTTOM-BAR: Handles inner scrolling for grouped categories */}
      <div className='bg-white/80 backdrop-blur-lg w-full lg:w-[450px] h-2/5 lg:h-full border-t lg:border-t-0 lg:border-r border-slate-200 p-4 pb-safe shadow-xl z-10 flex flex-col shrink-0'>
        <div className='w-full px-2 mb-4 shrink-0'>
          <div className='relative group'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors' />
            <input
              type='text'
              placeholder='Search chemicals by name or symbol...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-blue-400 hover:border-blue-300 transition-colors text-slate-700 font-medium placeholder-slate-400'
            />
          </div>
        </div>

        <div className='w-full flex-1 overflow-y-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent'>
          {filteredChemicals.length > 0 ? (
            Object.entries(
              filteredChemicals.reduce((acc, chem) => {
                const cat = chem.category || chem.type || "Other";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(chem);
                return acc;
              }, {}),
            ).map(([category, chemicals]) => (
              <div key={category} className='mb-6'>
                <h4 className='text-slate-500 font-bold uppercase tracking-wider text-xs mb-3 ml-1 border-b border-slate-200 pb-1'>
                  {category}
                </h4>
                <div className='grid grid-cols-4 lg:grid-cols-3 gap-3'>
                  {chemicals.map((chem) => (
                    <DraggableChemical
                      key={chem.id}
                      chemical={chem}
                      isMobile={isMobile}
                      isDisabled={checkIsDisabled()}
                      onDragStartCb={setDraggedChem}
                      onDragEndCb={() => setDraggedChem(null)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className='text-slate-400 italic py-4'>No chemicals found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
