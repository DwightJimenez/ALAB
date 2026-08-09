import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
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
import { SlidersHorizontal, Plus, Trash2, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

const CriteriaMaker = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useSelector((state) => state.auth);

  const [criteriaList, setCriteriaList] = useState([]);
  const [activeCriteriaId, setActiveCriteriaId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form builder state for a new rubric criteria profile
  const [newCriteriaName, setNewCriteriaName] = useState("");
  const [newComponents, setNewComponents] = useState([
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
  ]);

  const [newCompName, setNewCompName] = useState("");

  // --- FETCH CRITERIA PROFILES FROM BACKEND ---
  useEffect(() => {
    const fetchCriteria = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${API_URL}/api/criteria/${user.id}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCriteriaList(data);
          if (data.length > 0) {
            setActiveCriteriaId(data[0].id);
          }
        }
      } catch (error) {
        toast.error("Failed to load rubric profiles.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [user?.id, API_URL]);

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

  // Update specific rating cell text for new profile builder
  const handleRatingTextChange = (compIndex, scoreKey, text) => {
    const updated = [...newComponents];
    updated[compIndex].ratings[scoreKey] = text;
    setNewComponents(updated);
  };

  // --- SAVE NEW RUBRIC PROFILE TO DATABASE ---
  const handleSaveNewCriteria = async (e) => {
    e.preventDefault();
    if (!newCriteriaName.trim()) return toast.error("Enter a criteria rubric title");
    if (newComponents.length === 0) return toast.error("Add at least one criterion.");

    try {
      const res = await fetch(`${API_URL}/api/criteria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          facultyId: user.id,
          name: newCriteriaName,
          components: newComponents,
        }),
      });

      if (res.ok) {
        const savedProfile = await res.json();
        setCriteriaList([savedProfile, ...criteriaList]);
        setActiveCriteriaId(savedProfile.id);
        setNewCriteriaName("");
        toast.success("New 1-5 rubric criteria successfully created!");
      } else {
        toast.error("Failed to save rubric profile.");
      }
    } catch (error) {
      toast.error("Network error while saving.");
      console.error(error);
    }
  };

  // --- DELETE RUBRIC PROFILE FROM DATABASE ---
  const handleDeleteCriteria = async (id, e) => {
    e.stopPropagation();
    if (criteriaList.length <= 1) return toast.error("You must keep at least one criteria profile.");
    
    try {
      const res = await fetch(`${API_URL}/api/criteria/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const updated = criteriaList.filter(c => c.id !== id);
        setCriteriaList(updated);
        if (activeCriteriaId === id) {
          setActiveCriteriaId(updated[0]?.id || null);
        }
        toast.success("Criteria profile deleted.");
      } else {
        toast.error("Failed to delete profile.");
      }
    } catch (error) {
      toast.error("Network error while deleting.");
      console.error(error);
    }
  };

  const activeCriteria = criteriaList.find(c => c.id === activeCriteriaId);

  return (
    <div className='p-6 max-w-[1500px] mx-auto space-y-6 animate-in fade-in duration-500'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2'>
            <SlidersHorizontal className="w-8 h-8 text-indigo-600" /> Rubric Criteria Maker (1 to 5 Scale)
          </h1>
          <p className='text-muted-foreground'>
            Design detailed grading rubrics with descriptive performance level indicators scored from 1 (Poor) to 5 (Excellent).
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        
        {/* LEFT COLUMN: EXISTING PROFILES LIST */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Saved Rubric Criteria Profiles
          </h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-muted-foreground p-4">Loading profiles...</p>
            ) : criteriaList.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 border rounded bg-white">No saved rubric profiles yet.</p>
            ) : (
              criteriaList.map((crit) => (
                <Card 
                  key={crit.id}
                  onClick={() => {
                    setActiveCriteriaId(crit.id);
                    toast.success(`Active rubric switched to: ${crit.name}`);
                  }}
                  className={`cursor-pointer transition-all border shadow-sm relative overflow-hidden ${
                    activeCriteriaId === crit.id 
                      ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600" 
                      : "hover:border-slate-300 bg-white"
                  }`}
                >
                  {activeCriteriaId === crit.id && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                      ACTIVE
                    </div>
                  )}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5 truncate pr-6">
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" /> {crit.name}
                      </CardTitle>
                      {criteriaList.length > 1 && (
                        <button 
                          onClick={(e) => handleDeleteCriteria(crit.id, e)}
                          className="text-slate-400 hover:text-red-600 p-1 -mr-2 -mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className='space-y-1 mt-2'>
                      {crit.components?.map((comp, idx) => (
                        <div key={idx} className="bg-white border text-slate-700 p-2 rounded text-xs shadow-sm">
                          <span className="font-medium line-clamp-2">{comp.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BUILD NEW PROFILE & RUBRIC TABLE PREVIEW (1-5) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/55 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Create 1-5 Scale Rubric Template
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Rubric Title</label>
                <Input
                  placeholder='e.g., Performance Task Evaluation Rubric'
                  value={newCriteriaName}
                  onChange={(e) => setNewCriteriaName(e.target.value)}
                />
              </div>

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
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 1 to 5 Scale Descriptors Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                        {[5, 4, 3, 2, 1].map((score) => (
                          <div key={score} className="space-y-1 bg-white p-2 border rounded">
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

                {/* Quick Add Criterion Row */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Input
                    placeholder="Add new criterion name/description..."
                    className="h-9 text-xs flex-1 bg-white"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleAddComponent} className="h-9 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white">
                    <Plus className="w-4 h-4" /> Add Criterion Row
                  </Button>
                </div>
              </div>

            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t px-6 py-4 flex justify-end">
              <Button
                onClick={handleSaveNewCriteria}
                disabled={!newCriteriaName.trim() || newComponents.length === 0}
                className='bg-indigo-600 hover:bg-indigo-700 text-white gap-2'
              >
                <CheckCircle2 className="w-4 h-4" /> Save Rubric Profile
              </Button>
            </CardFooter>
          </Card>

          {/* ACTIVE RUBRIC TABLE VIEW (1 to 5 Scale) */}
          {activeCriteria && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b pb-3">
                <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-700">
                  Active Rubric Table View (1 to 5 Scale): {activeCriteria.name}
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
                    {activeCriteria.components.map((comp, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium border-r text-xs text-slate-900 bg-slate-50/50 align-top">
                          <p className="font-bold">{comp.name}</p>
                        </TableCell>
                        <TableCell className="border-r text-xs text-slate-700 align-top bg-emerald-50/20">
                          {comp.ratings?.[5] || "N/A"}
                        </TableCell>
                        <TableCell className="border-r text-xs text-slate-700 align-top bg-blue-50/20">
                          {comp.ratings?.[4] || "N/A"}
                        </TableCell>
                        <TableCell className="border-r text-xs text-slate-700 align-top bg-amber-50/20">
                          {comp.ratings?.[3] || "N/A"}
                        </TableCell>
                        <TableCell className="border-r text-xs text-slate-700 align-top bg-orange-50/20">
                          {comp.ratings?.[2] || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 align-top bg-red-50/20">
                          {comp.ratings?.[1] || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
};

export default CriteriaMaker;