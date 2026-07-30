import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus } from "lucide-react";

const ManageSkills = () => {
  const [skills, setSkills] = useState([]);
  const [editSkill, setEditSkill] = useState(null);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false); // Controls the drawer

  const initialSkillState = {
    name: "",
    description: "",
    pL0: 0.1,
    pT: 0.2,
    pG: 0.25,
    pS: 0.1,
    masteryThreshold: 0.95,
  };
  const [newSkill, setNewSkill] = useState(initialSkillState);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_URL}/api/skills`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSkills(data);
    } catch (err) {
      toast.error("Failed to load skills from the server.");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSkill),
      });

      if (!res.ok) throw new Error("Failed to add skill");

      toast.success("Skill added successfully!");
      setNewSkill(initialSkillState);
      fetchSkills();
      setIsAddSheetOpen(false); // Close drawer on success
    } catch (err) {
      toast.error("Failed to add new skill.");
    }
  };

  const confirmDelete = async () => {
    if (!skillToDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/skills/${skillToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete skill");

      toast.success("Skill deleted successfully!");
      fetchSkills();
    } catch (err) {
      toast.error("Failed to delete skill.");
    } finally {
      setSkillToDelete(null);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/skills/${editSkill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editSkill),
      });

      if (!res.ok) throw new Error("Failed to update skill");

      toast.success("Skill parameters updated successfully!");
      setEditSkill(null);
      fetchSkills();
    } catch (err) {
      toast.error("Failed to update skill.");
    }
  };

  return (
    <div className="w-full p-4 text-slate-800 relative">
      {/* Header Area */}
      <div className="flex  justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Active Skills</h2>

        {/* Right Drawer (Sheet) Trigger */}
        <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
          <SheetTrigger asChild>
            <Button className="bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl h-11 px-4">
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-[400px] sm:w-[500px] overflow-y-auto bg-slate-50"
          >
            <SheetHeader className="mb-6 mt-4">
              <SheetTitle className="text-2xl font-bold">
                Add New Skill
              </SheetTitle>
            </SheetHeader>

            <form onSubmit={handleAdd} className="space-y-6 m-6">
              <div>
                <Label>SKILL NAME</Label>
                <Input
                  className="bg-white border-slate-200 mt-1 shadow-sm"
                  value={newSkill.name}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>DESCRIPTION</Label>
                <textarea
                  className="w-full bg-white border border-slate-200 shadow-sm mt-1 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  rows={3}
                  value={newSkill.description}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {["pL0", "pT", "pG", "pS"].map((key) => (
                  <div key={key}>
                    <Label className="text-xs text-slate-500">
                      {key.toUpperCase()}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="bg-white border-slate-200 mt-1 shadow-sm"
                      value={newSkill[key]}
                      onChange={(e) =>
                        setNewSkill({
                          ...newSkill,
                          [key]: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Label>MASTERY THRESHOLD</Label>
                <span className="ml-2 font-medium">
                  {Math.round(newSkill.masteryThreshold * 100)}%
                </span>
                <Slider
                  value={[newSkill.masteryThreshold * 100]}
                  onValueChange={(val) =>
                    setNewSkill({ ...newSkill, masteryThreshold: val[0] / 100 })
                  }
                  max={100}
                  className="mt-4"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-900 hover:bg-indigo-800 h-12 rounded-xl text-white mt-4"
              >
                Add Skill
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Area: Skills List */}
      <div className="w-full text-navy">
        <div className="bg-sky rounded-3xl border border-slate-100 p-6 shadow-sm bg-white">
          {skills.length === 0 ? (
            <p className="text-center text-slate-500 py-10">
              No skills configured yet.
            </p>
          ) : (
            skills.map((s) => (
              <div
                key={s.id}
                className="flex flex-col md:flex-row items-center justify-between py-6 border-b border-slate-100 last:border-none"
              >
                <div className="md:w-1/3 md:pr-4">
                  <h3 className="font-bold text-lg">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {s.description}
                  </p>
                </div>

                <div className="md:w-1/3 space-y-2 md:pr-4">
                  <div className="w-full font-mono text-sm bg-slate-100 px-4 py-2 rounded-full text-center">
                    {s.pL0} / {s.pT} / {s.pG} / {s.pS}
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${s.masteryThreshold * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-indigo-600 mt-1 font-medium">
                    {s.masteryThreshold * 100}% Threshold
                  </p>
                </div>

                <div className="flex gap-2">
                  <Dialog
                    open={editSkill?.id === s.id}
                    onOpenChange={(open) => !open && setEditSkill(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-black rounded-xl"
                        onClick={() => setEditSkill(s)}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-black border-none sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit BKT Parameters</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                          <Label>Skill Name</Label>
                          <Input
                            value={editSkill?.name || ""}
                            onChange={(e) =>
                              setEditSkill({
                                ...editSkill,
                                name: e.target.value,
                              })
                            }
                            required
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Prior (pL0)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editSkill?.pL0 || ""}
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  pL0: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Learn (pT)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editSkill?.pT || ""}
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  pT: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Guess (pG)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editSkill?.pG || ""}
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  pG: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Slip (pS)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editSkill?.pS || ""}
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  pS: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          className="w-full mt-4 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl h-11"
                        >
                          Save Calibration
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    className="rounded-xl"
                    onClick={() => setSkillToDelete(s)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog
        open={!!skillToDelete}
        onOpenChange={(open) => !open && setSkillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete Skill
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700">
              Are you sure you want to delete the skill{" "}
              <strong>{skillToDelete?.name}</strong>? This will remove it
              permanently and may affect associated quizzes and mastery
              tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageSkills;
