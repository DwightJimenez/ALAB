import React, { useState, useEffect } from "react";

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

  return (
    <div className="max-w-7xl mx-auto p-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <span className="text-xs font-bold text-slate-500 uppercase mb-1 block">GHS Hazards</span>
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
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChemicalGrid;