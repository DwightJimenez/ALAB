import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react"; 
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const ChemicalGrid = () => {
  // All you do is write the names. The API fetches the data for all of them.
  const standardChemicals = [
    "Ethanol",
    "Hydrochloric Acid",
    "Sodium Hydroxide",
    "Silver Nitrate",
    "Aspirin",
    "Acetone"
  ];

  const [chemicalsData, setChemicalsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // NEW: State for the Sheet
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const fetchAllChemicals = async () => {
      setIsLoading(true);
      const results = [];

      for (const chemicalName of standardChemicals) {
        try {
          const formattedName = encodeURIComponent(chemicalName.trim());

          // ==========================================
          // STEP 1: Fetch CID, Molecular Weight, AND Formula
          // ==========================================
          const propertyUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${formattedName}/property/MolecularWeight,MolecularFormula/JSON`;
          const propertyResponse = await fetch(propertyUrl);

          if (!propertyResponse.ok) {
            console.warn(`Skipping ${chemicalName}: Not found in PubChem.`);
            continue; // Skip to the next chemical if this one fails
          }

          const propertyJson = await propertyResponse.json();
          const compound = propertyJson.PropertyTable.Properties[0];
          const cid = compound.CID;
          const weight = compound.MolecularWeight;
          const formula = compound.MolecularFormula;

          // ==========================================
          // STEP 2: Fetch GHS Safety Data
          // ==========================================
          const safetyUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=GHS+Classification`;
          const safetyResponse = await fetch(safetyUrl);
          
          let safetyWarnings = [];

          if (safetyResponse.ok) {
            const safetyJson = await safetyResponse.json();
            try {
              const hazardSection = safetyJson.Record.Section[0].Section[0].Section[0].Information;
              const hazardStatements = hazardSection.find(info => info.Name === "GHS Hazard Statements");
              if (hazardStatements && hazardStatements.Value.StringWithMarkup) {
                safetyWarnings = hazardStatements.Value.StringWithMarkup.map(statement => statement.String);
              }
            } catch (parseError) {
              // Safety data might not exist for some benign chemicals
            }
          }

          // Push the successfully fetched chemical into our results array
          results.push({
            name: chemicalName,
            cid: cid,
            molecularWeight: weight,
            formula: formula,
            hazards: safetyWarnings.length > 0 ? safetyWarnings : ["No specific GHS hazard warnings found."]
          });

        } catch (err) {
          console.error(`Error fetching data for ${chemicalName}:`, err);
        }
      }

      setChemicalsData(results);
      setIsLoading(false);
    };

    fetchAllChemicals();
  }, []); // Runs once when the component mounts

  // NEW: Handler to open the sheet
  const handleViewDetails = (chem) => {
    setSelectedItem(chem);
    setIsSheetOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>

      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Laboratory Chemical Database</h2>
        <p className="text-slate-500">Properties and safety data sourced automatically via PubChem API.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-500 font-medium">Fetching data from National Institutes of Health...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {chemicalsData.map((chem, index) => (
            <div key={index} className="flex flex-col sm:flex-row bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              
              {/* Left Side: 2D Structure Image */}
              <div className="w-full sm:w-40 bg-slate-50 border-r flex flex-col items-center justify-center p-4 shrink-0">
                <img 
                  src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${chem.cid}/PNG`} 
                  alt={`2D structure of ${chem.name}`} 
                  className="max-w-full h-auto object-contain drop-shadow-sm mix-blend-multiply mb-2"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">CID: {chem.cid}</span>
              </div>

              {/* Right Side: Chemical Data */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-slate-800">{chem.name}</h3>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 font-mono text-sm font-bold rounded">
                    {chem.formula}
                  </span>
                </div>

                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Molecular Weight</span>
                  <div className="text-sm font-medium text-slate-800">{chem.molecularWeight} g/mol</div>
                </div>

                {/* Hazards List (Scrollable if too long) */}
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase">GHS Hazards</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                    <ul className="list-disc pl-4 space-y-1">
                      {chem.hazards.map((hazard, hIndex) => (
                        <li key={hIndex} className="text-xs text-red-700 font-medium leading-snug">
                          {hazard}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* NEW: View Details Button */}
                <button 
                  onClick={() => handleViewDetails(chem)}
                  className="w-full mt-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 text-sm transition-colors"
                >
                  View Full Details
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* NEW: SHADCN SHEET - BOTTOM LARGE VARIANT */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="w-full h-auto max-h-[90vh] sm:max-w-full overflow-y-auto bg-white rounded-t-2xl p-6 md:p-10"
        >
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {selectedItem && (
              <>
                <SheetHeader className="mb-6 shrink-0 flex flex-row items-center justify-between">
                  <div>
                    <SheetTitle className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                      {selectedItem.name}
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 font-mono text-lg font-bold rounded-lg border">
                        {selectedItem.formula}
                      </span>
                    </SheetTitle>
                    <SheetDescription className="text-slate-500 text-base mt-2 flex items-center gap-2">
                      <span>PubChem CID: {selectedItem.cid}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      <span>Molecular Weight: {selectedItem.molecularWeight} g/mol</span>
                    </SheetDescription>
                  </div>
                </SheetHeader>
                
                <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0 pb-6">
                  
                  {/* Left Side: Large 2D Chemical Structure Image */}
                  <div className="w-full md:w-3/5 bg-slate-50 rounded-2xl overflow-hidden border flex items-center justify-center relative shadow-inner min-h-[400px] md:min-h-[500px] max-h-[60vh] md:max-h-[70vh]">
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
                      <span className="absolute top-4 left-4 bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                        2D Chemical Structure
                      </span>
                      <img 
                        src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${selectedItem.cid}/PNG?record_type=2d&image_size=large`} 
                        alt={`Structure of ${selectedItem.name}`}
                        className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Right Side: Hazards and Details */}
                  <div className="w-full md:w-2/5 flex flex-col">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex flex-col h-full max-h-[50vh] md:max-h-[70vh]">
                      <h4 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2 border-b border-red-200 pb-3 shrink-0">
                        <ShieldAlert size={20} />
                        GHS Safety Hazards
                      </h4>
                      
                      <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {selectedItem.hazards.length === 1 && selectedItem.hazards[0].includes("No specific") ? (
                          <p className="text-slate-600 italic text-sm">{selectedItem.hazards[0]}</p>
                        ) : (
                          <ul className="list-disc pl-5 space-y-2">
                            {selectedItem.hazards.map((hazard, hIndex) => (
                              <li key={hIndex} className="text-sm text-red-700 font-medium leading-relaxed">
                                {hazard}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
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

export default ChemicalGrid;