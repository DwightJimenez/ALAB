import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const ManageSkills = () => {
  const [skills, setSkills] = useState([]);
  const [editSkill, setEditSkill] = useState(null);
  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    pL0: 0.1,
    pT: 0.2,
    pG: 0.25,
    pS: 0.1,
    masteryThreshold: 0.95,
  });

  const API_URL = import.meta.env.VITE_API_URL;
  
  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    const res = await fetch(`${API_URL}/api/skills`, {
      credentials: "include",
    });
    const data = await res.json();
    setSkills(data);
  };
  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/api/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newSkill),
    });
    setNewSkill({
      name: "",
      description: "",
      pL0: 0.1,
      pT: 0.2,
      pG: 0.25,
      pS: 0.1,
      masteryThreshold: 0.95,
    });
    fetchSkills();
  };
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await fetch(`${API_URL}/api/skills/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchSkills();
    }
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/api/skills/${editSkill.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editSkill),
    });
    setEditSkill(null);
    fetchSkills();
  };

  return (
    <div className="flex gap-6 p-6 max-w-7xl mx-auto text-slate-800">
      {/* LEFT PANEL: Add New Skill */}
      <div className="w-1/3">
        <Card className="bg-slate-50 border-none shadow-sm p-6 rounded-3xl">
          <form onSubmit={handleAdd} className="space-y-6">
            <h2 className="text-xl font-bold">Add New Skill</h2>
            <div>
              <Label>SKILL NAME</Label>
              <Input
                className="bg-slate-100 border-none mt-1"
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
                className="w-full bg-slate-100 mt-1 p-3 rounded-xl text-sm"
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
                    className="bg-slate-100 border-none mt-1"
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
              {Math.round(newSkill.masteryThreshold * 100)}%
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
                <span>100%</span>{" "}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-900 hover:bg-indigo-800 h-12 rounded-xl"
            >
              Add New Skill
            </Button>
          </form>
        </Card>
      </div>
      {/* RIGHT PANEL: Inventory */}
      <div className="w-2/3 text-navy">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Active Skill</h2>
          <div className="flex gap-2 text-sm text-slate-500">
            <span>Filter</span>
            <span>Export</span>
          </div>
        </div>

        <div className="bg-sky rounded-3xl border border-slate-100 p-6 shadow-sm">
          {skills.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-6 border-b border-slate-100 last:border-none"
            >
              <div className="w-1/3">
                <h3 className="font-bold text-lg">{s.name}</h3>
                <p className="text-xs text-slate-500">{s.description}</p>
              </div>

              <div className="w-1/3 space-y-2">
                <div className="w-full font-mono text-sm bg-cold px-4 py-2 rounded-full text-center">
                  {s.pL0} / {s.pT} / {s.pG} / {s.pS}
                </div>
                <div className="h-2 bg-cold rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue"
                    style={{ width: `${s.masteryThreshold * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-blue mt-1">
                  {s.masteryThreshold * 100}% Threshold
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-black"
                    onClick={() => setEditSkill(s)}
                  >
                    Edit Parameters
                  </Button>
                </DialogTrigger>
                {/* The Edit Form with text-black */}
                <DialogContent className="bg-white text-black border-none">
                  <DialogHeader>
                    <DialogTitle>Edit BKT Parameters</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdate} className="space-y-3">
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
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Prior (pL0)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editSkill?.pL0 || ""}
                          onChange={(e) =>
                            setEditSkill({
                              ...editSkill,
                              pL0: e.target.value,
                            })
                          }
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
                              pT: e.target.value,
                            })
                          }
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
                              pG: e.target.value,
                            })
                          }
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
                              pS: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Save Calibration
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="destructive"
                onClick={() => handleDelete(s.id, s.name)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageSkills;
