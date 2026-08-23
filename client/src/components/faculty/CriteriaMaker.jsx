import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const defaultComponents = [
  { 
    name: "Completion of session activities & documentation", 
    ratings: {
      5: "Excellent execution and thorough documentation.",
      4: "Good completion with minor gaps.",
      3: "Average work with moderate omissions.",
      2: "Below average completeness.",
      1: "Poor or missing requirements."
    }
  },
  { 
    name: "Reflective summary & understanding theory", 
    ratings: {
      5: "Deep critical reflection and clear theory grasp.",
      4: "Clear reflection with good understanding.",
      3: "Superficial reflection or partial understanding.",
      2: "Weak reflections.",
      1: "No clear reflection or understanding shown."
    }
  },
  { 
    name: "Application of new strategies in setting", 
    ratings: {
      5: "Seamless and innovative application.",
      4: "Effective practical integration.",
      3: "Basic or minimal application.",
      2: "Flawed or impractical integration.",
      1: "No application present."
    }
  },
];

const CriteriaMaker = ({ initialCriteria, onSave }) => {
  // Form builder state for the rubric components
  const [newComponents, setNewComponents] = useState([]);
  const [newCompName, setNewCompName] = useState("");

  // Initialize with passed data or defaults
  useEffect(() => {
    if (initialCriteria && initialCriteria.components) {
      setNewComponents(initialCriteria.components.length > 0 ? initialCriteria.components : defaultComponents);
    } else {
      setNewComponents(defaultComponents);
    }
  }, [initialCriteria]);

  const handleAddComponent = () => {
    if (!newCompName.trim()) return toast.error("Enter criteria description");

    setNewComponents([
      ...newComponents, 
      { 
        name: newCompName, 
        ratings: {
          5: "Outstanding performance for this criterion.",
          4: "Above average performance.",
          3: "Satisfactory standard performance.",
          2: "Needs improvement.",
          1: "Unsatisfactory performance."
        }
      }
    ]);
    setNewCompName("");
  };

  const handleRemoveComponent = (index) => {
    setNewComponents(newComponents.filter((_, i) => i !== index));
  };

  const handleRatingTextChange = (compIndex, scoreKey, text) => {
    const updated = [...newComponents];
    updated[compIndex].ratings[scoreKey] = text;
    setNewComponents(updated);
  };

  const handleSaveNewCriteria = (e) => {
    e.preventDefault();
    if (newComponents.length === 0) return toast.error("Add at least one criterion.");

    // Pass the built rubric directly back to the parent
    if (onSave) {
      onSave({
        components: newComponents,
      });
      toast.success("Rubric criteria successfully attached!");
    }
  };

  return (
    <div className='p-2 sm:p-4 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500'>
      
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/55 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" /> 1-5 Scale Rubric Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 uppercase">Criteria Dimensions & 1-5 Scale Indicators</label>
            
            <div className="space-y-4">
              {newComponents.map((comp, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-slate-50/50 space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Criterion description..."
                      className="text-xs font-medium bg-white flex-1"
                      value={comp.name}
                      onChange={(e) => {
                        const updated = [...newComponents];
                        updated[idx].name = e.target.value;
                        setNewComponents(updated);
                      }}
                    />
                    <button 
                      onClick={() => handleRemoveComponent(idx)}
                      className="text-red-400 hover:text-red-600 p-1.5"
                      title="Remove Criterion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                    {[5, 4, 3, 2, 1].map((score) => (
                      <div key={score} className="space-y-1 bg-white p-2 border rounded shadow-sm">
                        <span className="text-[10px] font-bold text-indigo-600 block text-center">Score {score}</span>
                        <textarea
                          className="w-full text-[11px] p-1 border rounded resize-none h-16 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={comp.ratings?.[score] || ""}
                          onChange={(e) => handleRatingTextChange(idx, score, e.target.value)}
                          placeholder={`Level ${score} indicator...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Input
                placeholder="Add new criterion description..."
                className="h-9 text-xs flex-1 bg-white"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComponent()}
              />
              <Button variant="outline" onClick={handleAddComponent} className="h-9 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white">
                <Plus className="w-4 h-4" /> Add Row
              </Button>
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t px-6 py-4 flex justify-end">
          <Button
            onClick={handleSaveNewCriteria}
            disabled={newComponents.length === 0}
            className='bg-indigo-600 hover:bg-indigo-700 text-white gap-2'
          >
            <CheckCircle2 className="w-4 h-4" /> Attach Rubric to Experiment
          </Button>
        </CardFooter>
      </Card>

      {/* LIVE PREVIEW TABLE */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-3">
          <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-700">
            Live Preview: Custom Rubric
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="font-bold border-r w-[28%]">Criteria</TableHead>
                <TableHead className="font-bold border-r text-center bg-emerald-50 text-emerald-800">5 - Excellent</TableHead>
                <TableHead className="font-bold border-r text-center bg-blue-50 text-blue-800">4 - Good</TableHead>
                <TableHead className="font-bold border-r text-center bg-amber-50 text-amber-800">3 - Average</TableHead>
                <TableHead className="font-bold border-r text-center bg-orange-50 text-orange-800">2 - Fair</TableHead>
                <TableHead className="font-bold text-center bg-red-50 text-red-800">1 - Poor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newComponents.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="text-center text-slate-400 py-6">
                     Add a criterion to see the preview.
                   </TableCell>
                 </TableRow>
              ) : (
                newComponents.map((comp, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium border-r text-xs text-slate-900 bg-slate-50/50 align-top">
                      <p className="font-bold">{comp.name || "Unnamed Criterion"}</p>
                    </TableCell>
                    <TableCell className="border-r text-xs text-slate-700 align-top bg-emerald-50/20">
                      {comp.ratings?.[5] || "-"}
                    </TableCell>
                    <TableCell className="border-r text-xs text-slate-700 align-top bg-blue-50/20">
                      {comp.ratings?.[4] || "-"}
                    </TableCell>
                    <TableCell className="border-r text-xs text-slate-700 align-top bg-amber-50/20">
                      {comp.ratings?.[3] || "-"}
                    </TableCell>
                    <TableCell className="border-r text-xs text-slate-700 align-top bg-orange-50/20">
                      {comp.ratings?.[2] || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 align-top bg-red-50/20">
                      {comp.ratings?.[1] || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
    </div>
  );
};

export default CriteriaMaker;