import React, { useState, useEffect, useRef } from 'react';
import { Beaker, FlaskConical, AlertCircle, Droplets, Flame, XCircle } from 'lucide-react';

import reactionsDb from '../reactionDb.json';

import availableChemicals from '../availableChemicals.json'

const DraggableChemical = ({ chemical, isMobile }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("chemicalId", chemical.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleClick = () => {
    if (isMobile) {
      const event = new CustomEvent('chemical-selected', { detail: chemical.id });
      window.dispatchEvent(event);
    }
  };

  return (
    <div
      draggable={!isMobile}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`p-3 m-2 ${chemical.color} border-2 border-slate-400 rounded-lg shadow-sm flex flex-col items-center justify-center w-24 h-24 transition-transform hover:scale-105 ${isMobile ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      title={chemical.name}
    >
      <Beaker className="w-8 h-8 text-slate-700 mb-1" />
      <span className="font-bold text-sm text-slate-800">{chemical.id}</span>
      <span className="text-[10px] text-slate-600 text-center leading-tight mt-1 hidden sm:block">{chemical.name}</span>
    </div>
  );
};

const ReactionVisualizer = ({ effect, contents }) => {
  if (contents.length === 0) return null;


  const liquidHeight = contents.length === 1 ? "h-1/3" : "h-2/3";
  let liquidColor = "bg-blue-100/50"; 
  let animationClass = "";
  let particles = [];


  if (contents.length === 1) {
    const chem = availableChemicals.find(c => c.id === contents[0]);
    if (chem && chem.type !== 'solid' && chem.type !== 'gas') {
      liquidColor = chem.color.replace('bg-', 'bg-').replace('-100', '-300/50').replace('-200', '-400/50').replace('-300', '-500/50');
    }
  }

 
  if (effect === "neutralization") {
    liquidColor = "bg-blue-200/50 transition-colors duration-1000";
    animationClass = "animate-pulse";
  } else if (effect === "explosion") {
    liquidColor = "bg-orange-500/80";
    animationClass = "animate-bounce";
    particles = Array(10).fill(<Flame className="absolute text-orange-600 w-6 h-6 animate-ping" style={{ left: `${Math.random() * 80}%`, top: `${Math.random() * 80}%` }} />);
  } else if (effect === "bubbling") {
    liquidColor = "bg-amber-200/60";
    particles = Array(15).fill(<Droplets className="absolute text-white w-4 h-4 animate-bounce" style={{ left: `${Math.random() * 80}%`, top: `${Math.random() * 80}%`, animationDuration: `${0.5 + Math.random()}s` }} />);
  } else if (effect === "precipitate") {
    liquidColor = "bg-slate-300/80";
    particles = [<div key="solid" className="absolute bottom-0 w-full h-1/4 bg-white/90 rounded-b-xl border-t-2 border-slate-400"></div>];
  } else if (effect === "flash") {
     liquidColor = "bg-yellow-300/90";
     animationClass = "animate-ping";
  } else if (effect === "inert" && contents.length === 2) {
      liquidColor = "bg-gray-300/50";
  }

  return (
    <div className="relative w-32 h-40 border-4 border-slate-300 rounded-b-3xl rounded-t-lg mx-auto flex items-end justify-center overflow-hidden bg-slate-50 shadow-inner">
      <div className={`absolute bottom-0 w-full ${liquidHeight} ${liquidColor} ${animationClass} transition-all duration-500 rounded-b-2xl`}>
         {particles.map((p, i) => React.cloneElement(p, { key: i }))}
      </div>
      
      <div className="absolute top-0 left-2 w-4 h-full bg-white/30 rounded-full blur-sm transform -rotate-12"></div>
    </div>
  );
};

export default function ChemistryLabSandbox() {
  const [flaskContents, setFlaskContents] = useState([]);
  const [reactionResult, setReactionResult] = useState(null);
  const [isMobile, setIsMobile] = useState(false);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  useEffect(() => {
    const handleCustomDrop = (e) => {
      handleAddChemical(e.detail);
    };
    window.addEventListener('chemical-selected', handleCustomDrop);
    return () => window.removeEventListener('chemical-selected', handleCustomDrop);
  }, [flaskContents]); 

 
  const combineChemicals = (chemA, chemB) => {
    const reactants = [chemA, chemB];
    reactants.sort();
    const lookupKey = reactants.join('+');

    if (reactionsDb[lookupKey]) {
      return reactionsDb[lookupKey];
    } else {
      return {
        equation: `${chemA} + ${chemB} → No Reaction`,
        productName: "Mixture",
        reactionType: "Physical Mixture",
        visualEffect: "inert",
        description: "These chemicals do not react with each other under standard conditions."
      };
    }
  };

  const handleAddChemical = (chemicalId) => {
    if (flaskContents.length >= 2) return; 

    const newContents = [...flaskContents, chemicalId];
    setFlaskContents(newContents);

    if (newContents.length === 2) {
      const result = combineChemicals(newContents[0], newContents[1]);
      setReactionResult(result);
    }
  };

  const handleEmptyFlask = () => {
    setFlaskContents([]);
    setReactionResult(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedChemical = e.dataTransfer.getData("chemicalId");
    if (droppedChemical) {
      handleAddChemical(droppedChemical);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-3 text-slate-800">
          <FlaskConical className="w-8 h-8 text-blue-600" />
          Virtual Chemistry Lab
        </h1>
        <p className="text-slate-600 mt-2">
          {isMobile ? "Tap chemicals to add them to the flask." : "Drag and drop chemicals into the flask to observe reactions."}
        </p>
      </header>

      <div className="flex flex-col lg:flex-row w-full max-w-6xl gap-8">
        
        {/* Left Column: Inventory Shelf */}
        <section className="flex-1 bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-slate-700">Reagents Shelf</h2>
          <div className="flex flex-wrap justify-center sm:justify-start">
            {availableChemicals.map(chem => (
              <DraggableChemical key={chem.id} chemical={chem} isMobile={isMobile} />
            ))}
          </div>
        </section>

        {/* Right Column: Experiment Area */}
        <section className="flex-1 flex flex-col items-center bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 border-b w-full pb-2 text-slate-700 text-center">Reaction Flask</h2>
          
          {/* The Drop Zone (Flask) */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`w-full max-w-sm p-8 rounded-xl flex flex-col items-center justify-center transition-colors border-2 border-dashed ${flaskContents.length === 2 ? 'border-transparent bg-slate-50' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'}`}
          >
            <ReactionVisualizer 
              effect={reactionResult ? reactionResult.visualEffect : null} 
              contents={flaskContents} 
            />

            <div className="mt-6 flex flex-col items-center min-h-[4rem]">
               {flaskContents.length === 0 ? (
                 <p className="text-slate-400 font-medium">Drop chemical here</p>
               ) : (
                 <div className="flex items-center gap-2 font-bold text-xl text-slate-700 tracking-wider">
                   <span>{flaskContents[0]}</span>
                   {flaskContents.length > 1 && (
                     <>
                        <span className="text-blue-500">+</span>
                        <span>{flaskContents[1]}</span>
                     </>
                   )}
                 </div>
               )}
            </div>
            
            <button
              onClick={handleEmptyFlask}
              disabled={flaskContents.length === 0}
              className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Empty Flask
            </button>
          </div>

          {/* Reaction Results Panel */}
          <div className={`w-full mt-6 transition-all duration-500 transform ${reactionResult ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
             {reactionResult && (
               <div className={`p-5 rounded-xl border ${reactionResult.visualEffect === 'inert' ? 'bg-slate-50 border-slate-300' : 'bg-green-50 border-green-300'} shadow-sm`}>
                 <div className="flex items-start gap-3">
                   {reactionResult.visualEffect === 'inert' ? (
                     <AlertCircle className="w-6 h-6 text-slate-500 shrink-0 mt-1" />
                   ) : (
                     <AlertCircle className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                   )}
                   
                   <div className="w-full">
                     <h3 className={`font-bold text-lg ${reactionResult.visualEffect === 'inert' ? 'text-slate-700' : 'text-green-800'}`}>
                       {reactionResult.productName}
                     </h3>
                     
                     <div className="bg-white p-3 rounded mt-2 border border-slate-200 font-mono text-sm overflow-x-auto whitespace-nowrap text-slate-800">
                       {reactionResult.equation}
                     </div>
                     
                     <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="bg-white px-2 py-1 rounded shadow-sm border border-slate-200 text-slate-600">
                          Type: {reactionResult.reactionType}
                        </span>
                        {reactionResult.exothermic !== undefined && reactionResult.visualEffect !== 'inert' && (
                          <span className={`px-2 py-1 rounded shadow-sm border ${reactionResult.exothermic ? 'bg-orange-100 border-orange-200 text-orange-800' : 'bg-blue-100 border-blue-200 text-blue-800'}`}>
                            {reactionResult.exothermic ? 'Exothermic (Heat Released)' : 'Endothermic / No Heat'}
                          </span>
                        )}
                     </div>
                     
                     <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                       {reactionResult.description}
                     </p>
                   </div>
                 </div>
               </div>
             )}
          </div>

        </section>
      </div>
    </div>
  );
}