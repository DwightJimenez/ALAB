import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  Save,
  Calculator,
  Settings2,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// Mock Data updated without BKT metrics
const MOCK_STUDENTS = [
  {
    id: 1,
    name: "Jimenez, Jude Dwight Oscar",
    attendance: 95,
    labAvg: 92,
    peerEval: 4.8,
    customScores: { "Quiz 1": 85, "Project A": 90 }, // Dynamic columns data
    finalGrade: "91",
  },
  {
    id: 2,
    name: "Doe, Jane",
    attendance: 88,
    labAvg: 96,
    peerEval: 4.9,
    customScores: { "Quiz 1": 95, "Project A": 92 },
    finalGrade: "94",
  },
  {
    id: 3,
    name: "Smith, John",
    attendance: 75,
    labAvg: 78,
    peerEval: 3.5,
    customScores: { "Quiz 1": 70, "Project A": 80 },
    finalGrade: "78",
  },
];

const ClassRecord = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // --- STATE ---
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [students, setStudents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // --- CUSTOM DYNAMIC COLUMNS (Quizzes, Exams, Projects) ---
  const [customColumns, setCustomColumns] = useState(["Quiz 1", "Project A"]);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // --- DEPEd GRADING SYSTEM WEIGHTS STATE (Removed BKT) ---
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [weights, setWeights] = useState({
    attendance: 10,
    labAvg: 40,
    peerEval: 20,
    custom: 30, // Total weight for all added custom columns combined
  });

  // --- FETCH AVAILABLE SECTIONS ---
  useEffect(() => {
    const fetchSections = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(
          `${API_URL}/api/class-management/available-sections/${user.id}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSections(data);
          if (data.length > 0) setSelectedSection(data[0]);
        }
      } catch (error) {
        toast.error("Failed to load your assigned sections.");
      }
    };
    fetchSections();
  }, [user?.id, API_URL]);

  // --- FETCH STUDENT GRADES DATA ---
  useEffect(() => {
    const loadClassRecord = async () => {
      if (!selectedSection || !user?.id) return;
      try {
        setStudents(MOCK_STUDENTS);
      } catch (error) {
        toast.error("Failed to load class record data.");
      }
    };
    loadClassRecord();
  }, [selectedSection, user?.id, API_URL]);

  // --- ADD OR REMOVE CUSTOM COLUMNS ---
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return toast.error("Enter a valid column title");
    if (customColumns.includes(newColumnName))
      return toast.error("Column already exists");

    setCustomColumns([...customColumns, newColumnName]);
    // Initialize default score (e.g., 75) for existing students on the new item
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        customScores: { ...student.customScores, [newColumnName]: 75 },
      })),
    );
    setNewColumnName("");
    setIsAddColumnModalOpen(false);
    toast.success(`Added column: ${newColumnName}`);
  };

  const handleRemoveColumn = (colName) => {
    setCustomColumns(customColumns.filter((c) => c !== colName));
    setStudents((prev) =>
      prev.map((student) => {
        const updatedScores = { ...student.customScores };
        delete updatedScores[colName];
        return { ...student, customScores: updatedScores };
      }),
    );
    toast.success(`Removed column: ${colName}`);
  };

  const handleCustomScoreChange = (studentId, colName, value) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              customScores: {
                ...student.customScores,
                [colName]: Number(value),
              },
            }
          : student,
      ),
    );
  };

  // --- DEPEd COMPUTATION LOGIC (No BKT) ---
  const getDepEdDescriptor = (grade) => {
    const g = parseFloat(grade);
    if (isNaN(g)) return { label: "N/A", color: "bg-gray-100 text-gray-800" };
    if (g >= 90)
      return {
        label: "Outstanding (O)",
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    if (g >= 85)
      return {
        label: "Very Satisfactory (VS)",
        color: "bg-blue-100 text-blue-800 border-blue-200",
      };
    if (g >= 80)
      return {
        label: "Satisfactory (S)",
        color: "bg-amber-100 text-amber-800 border-amber-200",
      };
    if (g >= 75)
      return {
        label: "Fairly Satisfactory (FS)",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      };
    return {
      label: "Did Not Meet Expectations (DNE)",
      color: "bg-red-100 text-red-800 border-red-200",
    };
  };

  const handleAutoCompute = () => {
    const totalWeight =
      Number(weights.attendance) +
      Number(weights.labAvg) +
      Number(weights.peerEval) +
      Number(weights.custom);
    if (totalWeight !== 100) {
      return toast.error(
        `Weights must add up to 100%. Current total: ${totalWeight}%`,
      );
    }

    setStudents((prev) =>
      prev.map((student) => {
        const attendanceScore = student.attendance;
        const labScore = student.labAvg;
        const peerScore = (student.peerEval / 5) * 100; // Convert 1-5 scale to percentage

        // Average out all custom dynamic columns if any exist
        let customAvg = 0;
        if (customColumns.length > 0) {
          const totalCustom = customColumns.reduce(
            (sum, col) => sum + (student.customScores[col] || 0),
            0,
          );
          customAvg = totalCustom / customColumns.length;
        }

        const rawPercentage =
          attendanceScore * (weights.attendance / 100) +
          labScore * (weights.labAvg / 100) +
          peerScore * (weights.peerEval / 100) +
          customAvg * (weights.custom / 100);

        const finalGrade = Math.round(rawPercentage).toString();

        return { ...student, finalGrade };
      }),
    );
    toast.success("DepEd grades automatically computed!");
  };

  const handleWeightChange = (e) => {
    setWeights({ ...weights, [e.target.name]: Number(e.target.value) });
  };

  // --- SAVE GRADES ---
  const handleGradeChange = (id, newGrade) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, finalGrade: newGrade } : student,
      ),
    );
  };

  const handleSaveChanges = async () => {
    try {
      setIsEditing(false);
      toast.success("DepEd final grades saved successfully!");
    } catch (error) {
      toast.error("Failed to save final grades.");
    }
  };

  return (
    <div className='p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Class Record (DepEd System)
          </h1>
          <p className='text-muted-foreground'>
            Manage metrics, add quizzes/projects, and compute final grades.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <select
            className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={availableSections.length === 0}
          >
            {availableSections.length === 0 ? (
              <option value=''>No sections assigned</option>
            ) : (
              availableSections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))
            )}
          </select>

          <Button
            variant='outline'
            onClick={() => setIsAddColumnModalOpen(true)}
            className='gap-2 text-indigo-600 border-indigo-200'
          >
            <PlusCircle className='w-4 h-4' /> Add Assessment
          </Button>
          <Button
            variant='outline'
            onClick={() => setIsWeightsModalOpen(true)}
            className='gap-2'
          >
            <Settings2 className='w-4 h-4' /> Weights
          </Button>
          <Button variant='outline' className='gap-2'>
            <Download className='w-4 h-4' /> Export SF9
          </Button>
        </div>
      </div>

      <Card className='shadow-sm'>
        <CardHeader className='bg-muted/30 border-b flex flex-row items-center justify-between py-4'>
          <CardTitle className='text-lg'>
            Student Roster: {selectedSection || "None Selected"}
          </CardTitle>
          <div className='flex gap-2'>
            {isEditing ? (
              <>
                <Button variant='outline' onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  className='gap-2 bg-indigo-600 hover:bg-indigo-700'
                >
                  <Save className='w-4 h-4' /> Save Grades
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleAutoCompute}
                  className='gap-2 bg-emerald-600 hover:bg-emerald-700'
                  disabled={!selectedSection}
                >
                  <Calculator className='w-4 h-4' /> Auto-Compute
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setIsEditing(true)}
                  disabled={!selectedSection}
                >
                  Edit Manually
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead className='w-[250px] font-semibold'>
                    Student Name
                  </TableHead>
                  <TableHead className='text-center font-semibold'>
                    Attendance
                  </TableHead>
                  <TableHead className='text-center font-semibold'>
                    Lab Avg
                  </TableHead>
                  <TableHead className='text-center font-semibold'>
                    Peer Eval (1-5)
                  </TableHead>

                  {/* DYNAMIC COLUMNS (Quizzes, Exams, etc.) */}
                  {customColumns.map((col) => (
                    <TableHead
                      key={col}
                      className='text-center font-semibold bg-indigo-50/40'
                    >
                      <div className='flex items-center justify-center gap-1'>
                        <span>{col}</span>
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveColumn(col)}
                            className='text-red-500 hover:text-red-700'
                          >
                            <Trash2 className='w-3 h-3' />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  ))}

                  <TableHead className='text-center font-semibold'>
                    DepEd Descriptor
                  </TableHead>
                  <TableHead className='text-right font-semibold pr-6'>
                    Final Grade
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6 + customColumns.length}
                      className='text-center text-muted-foreground py-8'
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const descriptor = getDepEdDescriptor(student.finalGrade);
                    return (
                      <TableRow
                        key={student.id}
                        className='hover:bg-slate-50/50'
                      >
                        <TableCell className='font-medium text-slate-800'>
                          {student.name}
                        </TableCell>

                        <TableCell className='text-center'>
                          <span
                            className={`font-medium ${student.attendance < 80 ? "text-red-600" : "text-slate-700"}`}
                          >
                            {student.attendance}%
                          </span>
                        </TableCell>

                        <TableCell className='text-center text-slate-700 font-medium'>
                          {student.labAvg}%
                        </TableCell>

                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-1'>
                            <span className='text-amber-500 text-xs'>★</span>
                            <span className='font-medium text-slate-700'>
                              {student.peerEval}
                            </span>
                          </div>
                        </TableCell>

                        {/* DYNAMIC COLUMNS CELLS */}
                        {customColumns.map((col) => (
                          <TableCell
                            key={col}
                            className='text-center bg-indigo-50/15'
                          >
                            {isEditing ? (
                              <Input
                                type='number'
                                className='w-16 mx-auto text-center h-7 text-xs font-medium border-indigo-200'
                                value={student.customScores[col] ?? ""}
                                onChange={(e) =>
                                  handleCustomScoreChange(
                                    student.id,
                                    col,
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className='font-medium text-slate-700 text-sm'>
                                {student.customScores[col] ?? "-"}
                              </span>
                            )}
                          </TableCell>
                        ))}

                        {/* DepEd Qualitative Status */}
                        <TableCell className='text-center'>
                          <Badge variant='outline' className={descriptor.color}>
                            {descriptor.label}
                          </Badge>
                        </TableCell>

                        {/* Final Numerical Grade */}
                        <TableCell className='text-right pr-6'>
                          {isEditing ? (
                            <Input
                              type='number'
                              className='w-20 ml-auto text-right h-8 font-medium border-indigo-200 focus-visible:ring-indigo-500'
                              value={student.finalGrade}
                              onChange={(e) =>
                                handleGradeChange(student.id, e.target.value)
                              }
                            />
                          ) : (
                            <span
                              className={`font-bold text-lg ${parseFloat(student.finalGrade) < 75 ? "text-red-600" : "text-slate-900"}`}
                            >
                              {student.finalGrade}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- ADD COLUMN MODAL --- */}
      <Dialog
        open={isAddColumnModalOpen}
        onOpenChange={setIsAddColumnModalOpen}
      >
        <DialogContent className='sm:max-w-[380px] bg-white'>
          <DialogHeader>
            <DialogTitle>Add Assessment Category</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-3'>
            <label className='text-xs font-semibold text-slate-700'>
              Assessment Name (e.g., Quiz 2, Midterm Exam)
            </label>
            <Input
              placeholder='Enter name...'
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsAddColumnModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddColumn}
              className='bg-indigo-600 hover:bg-indigo-700'
            >
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- GRADING SETTINGS MODAL --- */}
      <Dialog open={isWeightsModalOpen} onOpenChange={setIsWeightsModalOpen}>
        <DialogContent className='sm:max-w-[425px] bg-white'>
          <DialogHeader>
            <DialogTitle>DepEd Component Weights</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <p className='text-sm text-slate-500'>
              Set the distribution percentages. Total must equal 100%.
            </p>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-slate-700'>
                  Attendance (%)
                </label>
                <Input
                  type='number'
                  name='attendance'
                  value={weights.attendance}
                  onChange={handleWeightChange}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-slate-700'>
                  Lab Experiments (%)
                </label>
                <Input
                  type='number'
                  name='labAvg'
                  value={weights.labAvg}
                  onChange={handleWeightChange}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-slate-700'>
                  Peer Evaluation (%)
                </label>
                <Input
                  type='number'
                  name='peerEval'
                  value={weights.peerEval}
                  onChange={handleWeightChange}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-slate-700'>
                  Quizzes/Other (%)
                </label>
                <Input
                  type='number'
                  name='custom'
                  value={weights.custom}
                  onChange={handleWeightChange}
                />
              </div>
            </div>

            <div
              className={`text-sm font-semibold p-2 rounded border ${
                weights.attendance +
                  weights.labAvg +
                  weights.peerEval +
                  weights.custom ===
                100
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              Total Weight:{" "}
              {weights.attendance +
                weights.labAvg +
                weights.peerEval +
                weights.custom}
              %
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsWeightsModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassRecord;
