import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Download,
  BookOpen,
  CalendarCheck,
  PlusCircle,
  Trash2,
  Save,
  Plus,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import LogoLoader from "../LogoLoader";

const ClassRecord = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // --- STATE ---
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  const [students, setStudents] = useState([]);
  const [customAssessments, setCustomAssessments] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // DepEd Grading Weights State
  const [wwWeight, setWwWeight] = useState(40);
  const [ptWeight, setPtWeight] = useState(40);
  const [qaWeight, setQaWeight] = useState(20);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  // Column Modal State
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnMaxScore, setNewColumnMaxScore] = useState(100);
  const [newColumnCategory, setNewColumnCategory] = useState("Written Work");

  // Add Subject Modal State
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // --- 1. FETCH SECTIONS & SUBJECTS ON MOUNT ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;
      try {
        const sectionRes = await fetch(
          `${API_URL}/api/class-management/available-sections/${user.id}`,
          { credentials: "include" },
        );
        if (sectionRes.ok) {
          const sectionData = await sectionRes.json();
          setAvailableSections(sectionData);
          if (sectionData.length > 0) setSelectedSection(sectionData[0]);
        }

        const subjectRes = await fetch(`${API_URL}/api/subjects`, {
          credentials: "include",
        });
        if (subjectRes.ok) {
          const subjectData = await subjectRes.json();
          setAvailableSubjects(subjectData);
        }
      } catch (error) {
        toast.error("Failed to load initial dropdown data.");
      }
    };
    fetchInitialData();
  }, [user?.id, API_URL]);

  // --- FILTER SUBJECTS BASED ON SELECTED SECTION ---
  const filteredSubjects = useMemo(() => {
    if (!selectedSection) return [];

    return availableSubjects.filter((sub) => {
      if (sub.section) {
        const combined = `${sub.section.year} - ${sub.section.section}`;
        return combined === selectedSection;
      }
      return false;
    });
  }, [availableSubjects, selectedSection]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.find((s) => s.name === selectedSubject)) {
        setSelectedSubject(filteredSubjects[0].name);
      }
    } else {
      setSelectedSubject("");
    }
  }, [filteredSubjects, selectedSection]);

  useEffect(() => {
    if (!selectedSubject || filteredSubjects.length === 0) return;
    const currentSub = filteredSubjects.find((s) => s.name === selectedSubject);
    if (currentSub) {
      setWwWeight(currentSub.wwWeight ?? 40);
      setPtWeight(currentSub.ptWeight ?? 40);
      setQaWeight(currentSub.qaWeight ?? 20);
    }
  }, [selectedSubject, filteredSubjects]);

  const loadClassRecord = async () => {
    if (!selectedSection || !selectedSubject || !user?.id) {
      setStudents([]);
      setCustomAssessments([]);
      setTotalSessions(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/class-records/${user.id}/${encodeURIComponent(
          selectedSubject,
        )}/${encodeURIComponent(selectedSection)}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setCustomAssessments(data.customAssessments || []);
        setTotalSessions(data.totalSessions || 0);
      }
    } catch (error) {
      toast.error("Network error while loading class records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassRecord();
  }, [selectedSection, selectedSubject, user?.id, API_URL]);

  // --- ACTIONS ---

  const handleAddSubject = async () => {
    if (!newSubjectName.trim())
      return toast.error("Please enter a subject name");
    if (!selectedSection) return toast.error("Please select a section first.");

    try {
      const res = await fetch(`${API_URL}/api/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSubjectName.trim(),
          facultyId: user.id,
          fullSectionName: selectedSection,
        }),
      });

      if (res.ok) {
        const newSubject = await res.json();
        setAvailableSubjects((prev) => [...prev, newSubject]);
        setSelectedSubject(newSubject.name);
        setIsAddSubjectModalOpen(false);
        setNewSubjectName("");
        toast.success("Subject added successfully!");
      }
    } catch (error) {
      toast.error("Network error adding subject.");
    }
  };

  const handleDeleteSubject = async () => {
    const subjectToDelete = filteredSubjects.find(
      (s) => s.name === selectedSubject,
    );
    if (!subjectToDelete) return;

    if (
      !window.confirm(
        `Are you sure you want to delete "${subjectToDelete.name}"?`,
      )
    )
      return;

    try {
      const res = await fetch(`${API_URL}/api/subjects/${subjectToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Subject deleted successfully.");
        setAvailableSubjects((prev) =>
          prev.filter((s) => s.id !== subjectToDelete.id),
        );
        setSelectedSubject("");
      } else {
        toast.error("Failed to delete subject.");
      }
    } catch (error) {
      toast.error("Network error while deleting.");
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return toast.error("Enter a valid name");
    try {
      const res = await fetch(
        `${API_URL}/api/class-records/custom-assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            facultyId: user.id,
            subject: selectedSubject,
            section: selectedSection,
            name: newColumnName,
            maxScore: parseFloat(newColumnMaxScore) || 100,
            category: newColumnCategory,
          }),
        },
      );

      if (res.ok) {
        toast.success(`Added ${newColumnName}`);
        setIsAddColumnModalOpen(false);
        setNewColumnName("");
        setNewColumnMaxScore(100);
        setNewColumnCategory("Written Work");
        loadClassRecord();
      }
    } catch (error) {
      toast.error("Failed to add column.");
    }
  };

  const handleDeleteColumn = async (id) => {
    if (!window.confirm("Delete this column and all its scores?")) return;
    try {
      const res = await fetch(
        `${API_URL}/api/class-records/custom-assessment/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (res.ok) {
        toast.success("Column deleted.");
        loadClassRecord();
      }
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  const handleScoreChange = (studentId, assessmentId, value, maxScore) => {
    if (value !== "" && parseFloat(value) > maxScore) {
      toast.error(`Score cannot exceed ${maxScore}`);
      return;
    }
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              customScores: { ...student.customScores, [assessmentId]: value },
            }
          : student,
      ),
    );
  };

  const handleSaveWeights = async () => {
    const total =
      (parseFloat(wwWeight) || 0) +
      (parseFloat(ptWeight) || 0) +
      (parseFloat(qaWeight) || 0);
    if (Math.round(total) !== 100)
      return toast.error("Weights must add up to 100%");

    const currentSub = availableSubjects.find(
      (s) => s.name === selectedSubject,
    );
    try {
      const res = await fetch(
        `${API_URL}/api/subjects/${currentSub.id}/weights`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            wwWeight: parseFloat(wwWeight),
            ptWeight: parseFloat(ptWeight),
            qaWeight: parseFloat(qaWeight),
          }),
        },
      );

      if (res.ok) {
        setAvailableSubjects((prev) =>
          prev.map((sub) =>
            sub.id === currentSub.id
              ? { ...sub, wwWeight, ptWeight, qaWeight }
              : sub,
          ),
        );
        toast.success("Grading weights saved!");
        setIsWeightModalOpen(false);
      }
    } catch (error) {
      toast.error("Network error saving weights.");
    }
  };

  const handleSaveGrades = async () => {
    const updates = customAssessments.map((col) => {
      const scoresMap = {};
      students.forEach((student) => {
        const rawScore = student.customScores?.[col.id];
        if (rawScore !== "" && rawScore !== null && rawScore !== undefined)
          scoresMap[student.id] = parseFloat(rawScore);
      });
      return {
        assessmentId: col.id,
        category: col.category || "Written Work",
        scores: scoresMap,
      };
    });

    try {
      const res = await fetch(`${API_URL}/api/class-records/save-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        toast.success("Grades saved!");
        setIsEditing(false);
        loadClassRecord();
      }
    } catch (error) {
      toast.error("Failed to save.");
    }
  };

  const calculateDepEdGrades = (studentCustomScores, labAvg) => {
    let wwTotalScore = 0,
      wwMaxScore = 0;
    let ptTotalScore = 0,
      ptMaxScore = 0;
    let qaTotalScore = 0,
      qaMaxScore = 0;

    if (labAvg !== undefined && labAvg !== null && !isNaN(parseFloat(labAvg))) {
      ptTotalScore += parseFloat(labAvg);
      ptMaxScore += 100;
    }

    customAssessments.forEach((col) => {
      const score = parseFloat(studentCustomScores[col.id]);
      const hasScore = !isNaN(score);
      if (col.category === "Written Work") {
        wwMaxScore += col.maxScore;
        if (hasScore) wwTotalScore += score;
      } else if (col.category === "Performance Tasks") {
        ptMaxScore += col.maxScore;
        if (hasScore) ptTotalScore += score;
      } else if (col.category === "Quarterly Assessment") {
        qaMaxScore += col.maxScore;
        if (hasScore) qaTotalScore += score;
      }
    });

    const wwPS = wwMaxScore > 0 ? (wwTotalScore / wwMaxScore) * 100 : 0;
    const ptPS = ptMaxScore > 0 ? (ptTotalScore / ptMaxScore) * 100 : 0;
    const qaPS = qaMaxScore > 0 ? (qaTotalScore / qaMaxScore) * 100 : 0;
    const initialGrade =
      wwPS * (wwWeight / 100) +
      ptPS * (ptWeight / 100) +
      qaPS * (qaWeight / 100);

    return { initialGrade: initialGrade > 0 ? initialGrade.toFixed(2) : "—" };
  };

  const handleExportExcel = () => {
    if (students.length === 0) return toast.error("No data.");
    const headers = [
      "Student Name",
      "Present (P)",
      "Late (L)",
      "Absent (A)",
      "Attendance Rate (%)",
      "Lab Avg (%)",
      ...customAssessments.map((col) => `${col.name} (${col.category})`),
      "Initial Grade",
    ];
    const csvRows = [headers.join(",")];
    students.forEach((student) => {
      const deped = calculateDepEdGrades(
        student.customScores || {},
        student.labAvg,
      );
      const row = [
        `"${student.name.replace(/"/g, '""')}"`,
        student.presentCount,
        student.lateCount,
        student.absentCount,
        Number(student.attendancePercentage || 0).toFixed(2),
        student.labAvg ?? "—",
        ...customAssessments.map(
          (col) => student.customScores?.[col.id] ?? "—",
        ),
        deped.initialGrade,
      ];
      csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Class_Record_${selectedSubject}_${selectedSection}.csv`;
    link.click();
    toast.success("Exported!");
  };

  return (
    <div className='p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Class Record Overview
          </h1>
          <p className='text-muted-foreground'>
            Overview of student attendance summaries and DepEd-compliant
            assessments.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex items-center gap-2 bg-white border border-input rounded-md px-2 py-0.5 shadow-sm'>
            <Users className='w-4 h-4 text-slate-400 shrink-0 ml-1' />
            <Select
              value={selectedSection}
              onValueChange={setSelectedSection}
              disabled={availableSections.length === 0}
            >
              <SelectTrigger className='h-8 border-0 shadow-none focus:ring-0 bg-transparent px-1 min-w-[140px]'>
                <SelectValue placeholder='Select Section' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sections</SelectLabel>
                  {availableSections.length === 0 ? (
                    <SelectItem value='none' disabled>
                      No sections
                    </SelectItem>
                  ) : (
                    availableSections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col relative'>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className='flex items-center gap-2 bg-white border border-input rounded-md px-2 py-0.5 shadow-sm transition-colors hover:border-slate-300 select-none'>
                  <BookOpen className='w-4 h-4 text-slate-400 shrink-0 ml-1' />
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                    disabled={filteredSubjects.length === 0 || !selectedSection}
                  >
                    <SelectTrigger className='h-8 border-0 shadow-none focus:ring-0 bg-transparent px-1 min-w-[140px]'>
                      <SelectValue
                        placeholder={
                          selectedSection
                            ? "Select Subject"
                            : "Select section first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Subjects</SelectLabel>
                        {filteredSubjects.length === 0 && selectedSection ? (
                          <SelectItem value='none' disabled>
                            No subjects
                          </SelectItem>
                        ) : (
                          filteredSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <div className='w-px h-5 bg-slate-200 mx-1'></div>
                  <button
                    onClick={() => setIsAddSubjectModalOpen(true)}
                    className='text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 disabled:opacity-50'
                    disabled={!selectedSection}
                  >
                    <Plus className='w-4 h-4' />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className='w-48'>
                <ContextMenuItem
                  onClick={handleDeleteSubject}
                  disabled={!selectedSubject}
                  className='text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer'
                >
                  <Trash2 className='w-4 h-4 mr-2' /> Delete Subject
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <span className='absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground ml-1'>
              * Right Click Selected Subject to Delete
            </span>
          </div>

          <Button variant='outline' onClick={() => setIsWeightModalOpen(true)}>
            <SlidersHorizontal className='w-4 h-4 mr-2' /> Weights
          </Button>
          <Button
            variant='outline'
            onClick={() => setIsAddColumnModalOpen(true)}
          >
            <PlusCircle className='w-4 h-4 mr-2' /> Add Column
          </Button>
          <Button variant='outline' onClick={handleExportExcel}>
            <Download className='w-4 h-4 mr-2' /> Export
          </Button>
        </div>
      </div>

      <Card className='shadow-sm'>
        <CardHeader className='bg-muted/30 border-b flex flex-row items-center justify-between py-4'>
          <div className='flex items-center gap-2'>
            <CalendarCheck className='w-5 h-5 text-indigo-600' />
            <CardTitle className='text-lg'>Performance Summary</CardTitle>
          </div>
          <div className='flex items-center gap-4'>
            <Badge variant='outline' className='bg-white'>
              Sessions: {totalSessions}
            </Badge>
            {isEditing ? (
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setIsEditing(false);
                    loadClassRecord();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveGrades} className='bg-indigo-600'>
                  <Save className='w-4 h-4 mr-2' /> Save Grid
                </Button>
              </div>
            ) : (
              <Button
                variant='outline'
                onClick={() => setIsEditing(true)}
                disabled={students.length === 0}
              >
                Edit Manually
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead className='w-[250px] sticky left-0 bg-slate-50 z-10'>
                    Student Name
                  </TableHead>
                  <TableHead className='text-center border-l'>P</TableHead>
                  <TableHead className='text-center'>L</TableHead>
                  <TableHead className='text-center border-r'>A</TableHead>
                  <TableHead className='text-center'>Rate</TableHead>
                  <TableHead className='text-center border-r'>
                    Lab Avg
                  </TableHead>
                  {customAssessments.map((col) => (
                    <TableHead
                      key={col.id}
                      className='text-center border-r min-w-[130px]'
                    >
                      {col.name}
                      <br />
                      <span className='text-[10px] text-slate-500 font-normal'>
                        {col.category}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className='text-center border-l'>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className='text-center py-12'>
                      <LogoLoader size='sm' />
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const deped = calculateDepEdGrades(
                      student.customScores || {},
                      student.labAvg,
                    );
                    return (
                      <TableRow key={student.id}>
                        <TableCell className='font-medium sticky left-0 bg-white z-10'>
                          {student.name}
                        </TableCell>
                        <TableCell className='text-center text-emerald-600'>
                          {student.presentCount}
                        </TableCell>
                        <TableCell className='text-center text-amber-600'>
                          {student.lateCount}
                        </TableCell>
                        <TableCell className='text-center text-red-600'>
                          {student.absentCount}
                        </TableCell>
                        <TableCell className='text-center font-bold'>
                          {Number(student.attendancePercentage).toFixed(2)}%
                        </TableCell>
                        <TableCell className='text-center font-bold text-indigo-600'>
                          {student.labAvg !== null
                            ? `${Number(student.labAvg).toFixed(2)}%`
                            : "—"}
                        </TableCell>
                        {customAssessments.map((col) => (
                          <TableCell key={col.id} className='text-center'>
                            {isEditing ? (
                              <Input
                                type='number'
                                className='w-16 h-8 mx-auto'
                                value={student.customScores[col.id] ?? ""}
                                onChange={(e) =>
                                  handleScoreChange(
                                    student.id,
                                    col.id,
                                    e.target.value,
                                    col.maxScore,
                                  )
                                }
                              />
                            ) : (
                              <span>{student.customScores[col.id] ?? "—"}</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className='text-center font-bold text-emerald-700 bg-emerald-50/50'>
                          {deped.initialGrade}
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
      {/* Modals remain the same ... */}
    </div>
  );
};

export default ClassRecord;
