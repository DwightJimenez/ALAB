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

  // DepEd Grading Weights State (Default standard: 40% WW, 40% PT, 20% QA)
  const [wwWeight, setWwWeight] = useState(40);
  const [ptWeight, setPtWeight] = useState(40);
  const [qaWeight, setQaWeight] = useState(20);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  // Column Modal State
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnMaxScore, setNewColumnMaxScore] = useState(100);
  const [newColumnCategory, setNewColumnCategory] = useState("Written Work"); // DepEd Category

  // Add Subject Modal State
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // --- 1. FETCH SECTIONS & SUBJECTS ON MOUNT ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;
      try {
        // Fetch Sections First
        const sectionRes = await fetch(
          `${API_URL}/api/class-management/available-sections/${user.id}`,
          { credentials: "include" },
        );
        if (sectionRes.ok) {
          const sectionData = await sectionRes.json();
          setAvailableSections(sectionData);
          if (sectionData.length > 0) setSelectedSection(sectionData[0]);
        }

        // Fetch Subjects
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

  // Auto-select the first available subject when the section changes
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.find((s) => s.name === selectedSubject)) {
        setSelectedSubject(filteredSubjects[0].name);
      }
    } else {
      setSelectedSubject("");
    }
  }, [filteredSubjects, selectedSection]);

  // --- SYNC WEIGHTS WHEN SUBJECT CHANGES ---
  useEffect(() => {
    if (!selectedSubject || filteredSubjects.length === 0) return;
    const currentSub = filteredSubjects.find((s) => s.name === selectedSubject);
    if (currentSub) {
      setWwWeight(currentSub.wwWeight ?? 40);
      setPtWeight(currentSub.ptWeight ?? 40);
      setQaWeight(currentSub.qaWeight ?? 20);
    }
  }, [selectedSubject, filteredSubjects]);

  // --- 2. FETCH CLASS RECORD (Attendance, Lab, Custom Scores) ---
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
      } else {
        toast.error("Failed to load class record data.");
      }
    } catch (error) {
      toast.error("Network error while loading class records.");
      console.error(error);
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
    if (!selectedSection)
      return toast.error(
        "Please select a section first to assign this subject to.",
      );

    try {
      const res = await fetch(`${API_URL}/api/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSubjectName.trim(),
          facultyId: user.id,
          fullSectionName: selectedSection, // Ensure this matches backend requirement
        }),
      });

      if (res.ok) {
        const newSubject = await res.json();
        setAvailableSubjects((prev) => [...prev, newSubject]);
        setSelectedSubject(newSubject.name);
        setIsAddSubjectModalOpen(false);
        setNewSubjectName("");
        toast.success("Subject added successfully!");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to add subject.");
      }
    } catch (error) {
      toast.error("Network error adding subject.");
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
    if (
      !window.confirm(
        "Are you sure you want to delete this column and all its scores?",
      )
    )
      return;
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
      toast.error(
        `Score cannot exceed the maximum possible score of ${maxScore}`,
      );
      return;
    }

    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              customScores: {
                ...student.customScores,
                [assessmentId]: value,
              },
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
    if (Math.round(total) !== 100) {
      toast.error(`Weights must add up to 100% (Current total: ${total}%)`);
      return;
    }

    const currentSub = availableSubjects.find(
      (s) => s.name === selectedSubject,
    );
    if (!currentSub) {
      toast.error("Please select a valid subject.");
      return;
    }

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
        // Update local availableSubjects list with the new weights
        setAvailableSubjects((prev) =>
          prev.map((sub) =>
            sub.id === currentSub.id
              ? { ...sub, wwWeight, ptWeight, qaWeight }
              : sub,
          ),
        );
        toast.success("Grading weights saved successfully!");
        setIsWeightModalOpen(false);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to save weights.");
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
        if (rawScore !== "" && rawScore !== null && rawScore !== undefined) {
          scoresMap[student.id] = parseFloat(rawScore);
        }
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
        toast.success("Grades saved successfully!");
        setIsEditing(false);
        loadClassRecord();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to save grades.");
      }
    } catch (error) {
      toast.error("Network error saving grades.");
    }
  };

  // --- DEPED COMPUTATION HELPER ---
  const calculateDepEdGrades = (studentCustomScores, labAvg) => {
    let wwTotalScore = 0;
    let wwMaxScore = 0;

    let ptTotalScore = 0;
    let ptMaxScore = 0;

    let qaTotalScore = 0;
    let qaMaxScore = 0;

    // Include Lab Avg as a Performance Task (out of 100) if present
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

    const wwWS = wwPS * (wwWeight / 100);
    const ptWS = ptPS * (ptWeight / 100);
    const qaWS = qaPS * (qaWeight / 100);

    const initialGrade = wwWS + ptWS + qaWS;

    return {
      initialGrade: initialGrade > 0 ? initialGrade.toFixed(2) : "—",
    };
  };

  // --- EXPORT TO EXCEL (CSV FORMAT) ---
  const handleExportExcel = () => {
    if (students.length === 0) {
      toast.error("No student data available to export.");
      return;
    }

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
        student.labAvg !== undefined && student.labAvg !== null
          ? Number(student.labAvg).toFixed(2)
          : "—",
        ...customAssessments.map(
          (col) => student.customScores?.[col.id] ?? "—",
        ),
        deped.initialGrade,
      ];

      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Class_Record_${selectedSubject || "Subject"}_${selectedSection || "Section"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Class record exported successfully!");
  };

  return (
    <div className='p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Class Record Overview
          </h1>
          <p className='text-muted-foreground'>
            Overview of student attendance summaries, lab averages, and
            DepEd-compliant custom assessments.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          {/* 1. SECTION DROPDOWN (Moved to first position) */}
          <div className='flex items-center gap-2 bg-white border border-input rounded-md px-3 py-1.5 shadow-sm'>
            <Users className='w-4 h-4 text-slate-400' />
            <select
              className='h-8 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer'
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
          </div>

          {/* 2. SUBJECT DROPDOWN + ADD SUBJECT BUTTON */}
          <div className='flex items-center gap-2 bg-white border border-input rounded-md px-3 py-1.5 shadow-sm'>
            <BookOpen className='w-4 h-4 text-slate-400' />
            <select
              className='h-8 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer'
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={filteredSubjects.length === 0 || !selectedSection}
            >
              {filteredSubjects.length === 0 ? (
                <option value=''>
                  {selectedSection
                    ? "No subjects found"
                    : "Select section first"}
                </option>
              ) : (
                filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name}
                  </option>
                ))
              )}
            </select>
            <div className='w-px h-5 bg-slate-200 mx-1'></div>
            <button
              onClick={() => setIsAddSubjectModalOpen(true)}
              className='text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
              title='Add New Subject'
              disabled={!selectedSection}
            >
              <Plus className='w-4 h-4' />
            </button>
          </div>

          <Button
            variant='outline'
            onClick={() => setIsWeightModalOpen(true)}
            className='gap-2 text-slate-700 border-slate-200 bg-white'
          >
            <SlidersHorizontal className='w-4 h-4' /> Weights
          </Button>

          <Button
            variant='outline'
            onClick={() => setIsAddColumnModalOpen(true)}
            className='gap-2 text-indigo-600 border-indigo-200 bg-white'
          >
            <PlusCircle className='w-4 h-4' /> Add Column
          </Button>
          <Button
            variant='outline'
            onClick={handleExportExcel}
            className='gap-2 bg-white'
          >
            <Download className='w-4 h-4' /> Export Report
          </Button>
        </div>
      </div>

      <Card className='shadow-sm'>
        <CardHeader className='bg-muted/30 border-b flex flex-row items-center justify-between py-4'>
          <div className='flex items-center gap-2'>
            <CalendarCheck className='w-5 h-5 text-indigo-600' />
            <CardTitle className='text-lg'>
              Performance Summary: {selectedSubject || "Subject"} —{" "}
              {selectedSection || "Section"}
            </CardTitle>
          </div>
          <div className='flex items-center gap-4'>
            <Badge variant='outline' className='bg-white font-medium'>
              Total Recorded Sessions: {totalSessions}
            </Badge>
            <div className='flex gap-2 border-l pl-4'>
              {isEditing ? (
                <>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setIsEditing(false);
                      loadClassRecord();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveGrades}
                    className='gap-2 bg-indigo-600 hover:bg-indigo-700 text-white'
                  >
                    <Save className='w-4 h-4' /> Save Grid
                  </Button>
                </>
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
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead className='w-[250px] font-semibold sticky left-0 bg-slate-50 z-10'>
                    Student Name
                  </TableHead>

                  <TableHead className='w-[60px] h-[140px] align-bottom pb-4 border-l'>
                    <div className='-rotate-45 whitespace-nowrap font-semibold text-emerald-700 origin-bottom-left translate-x-[24px]'>
                      Present (P)
                    </div>
                  </TableHead>

                  <TableHead className='w-[60px] h-[140px] align-bottom pb-4'>
                    <div className='-rotate-45 whitespace-nowrap font-semibold text-amber-700 origin-bottom-left translate-x-[24px]'>
                      Late (L)
                    </div>
                  </TableHead>

                  <TableHead className='w-[60px] h-[140px] align-bottom pb-4 border-r'>
                    <div className='-rotate-45 whitespace-nowrap font-semibold text-red-700 origin-bottom-left translate-x-[24px]'>
                      Absent (A)
                    </div>
                  </TableHead>

                  <TableHead className='text-center font-semibold'>
                    Attendance Rate
                  </TableHead>
                  <TableHead className='text-right font-semibold pr-6 text-indigo-700 border-r'>
                    Lab Avg
                  </TableHead>

                  {/* DYNAMIC CUSTOM COLUMNS */}
                  {customAssessments.map((col) => (
                    <TableHead
                      key={col.id}
                      className='text-center font-semibold bg-indigo-50/30 border-r min-w-[130px]'
                    >
                      <div className='flex flex-col items-center justify-center gap-1'>
                        <div className='flex items-center gap-2'>
                          <span>{col.name}</span>
                          {isEditing && (
                            <button
                              onClick={() => handleDeleteColumn(col.id)}
                              className='text-red-400 hover:text-red-600'
                            >
                              <Trash2 className='w-3 h-3' />
                            </button>
                          )}
                        </div>
                        <div className='flex flex-col items-center gap-1 text-[10px] text-muted-foreground font-normal'>
                          <span className='bg-slate-200 px-1 rounded'>
                            {col.category || "Written Work"}
                          </span>
                          <span>Max: {col.maxScore}</span>
                        </div>
                      </div>
                    </TableHead>
                  ))}

                  {/* DEPED INITIAL GRADE SUMMARY COLUMN */}
                  <TableHead className='text-center font-semibold bg-emerald-50 text-emerald-800 border-l min-w-[120px]'>
                    Grade
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className='text-center text-muted-foreground py-12'
                    >
                      <div className='flex justify-center'>
                        <LogoLoader size='sm' />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className='text-center text-muted-foreground py-12'
                    >
                      No students found for this subject and section.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const deped = calculateDepEdGrades(
                      student.customScores || {},
                      student.labAvg,
                    );
                    return (
                      <TableRow
                        key={student.id}
                        className='hover:bg-slate-50/50'
                      >
                        <TableCell className='font-medium text-slate-800 sticky left-0 bg-white z-10'>
                          {student.name}
                        </TableCell>

                        <TableCell className='text-center font-medium text-emerald-600 border-l'>
                          {student.presentCount}
                        </TableCell>

                        <TableCell className='text-center font-medium text-amber-600'>
                          {student.lateCount}
                        </TableCell>

                        <TableCell className='text-center font-medium text-red-600 border-r'>
                          {student.absentCount}
                        </TableCell>

                        <TableCell className='text-center'>
                          <span
                            className={`font-bold text-base ${
                              student.attendancePercentage < 75
                                ? "text-red-600"
                                : "text-slate-900"
                            }`}
                          >
                            {Number(student.attendancePercentage).toFixed(2)}%
                          </span>
                        </TableCell>

                        {/* LAB AVG COLUMN */}
                        <TableCell className='text-right pr-6 border-r'>
                          <span className='font-bold text-base text-indigo-600'>
                            {student.labAvg !== undefined &&
                            student.labAvg !== null
                              ? `${Number(student.labAvg).toFixed(2)}%`
                              : "—"}
                          </span>
                        </TableCell>

                        {/* DYNAMIC CUSTOM CELLS */}
                        {customAssessments.map((col) => (
                          <TableCell
                            key={col.id}
                            className='text-center bg-indigo-50/10 border-r'
                          >
                            {isEditing ? (
                              <Input
                                type='number'
                                max={col.maxScore}
                                className='w-16 h-8 mx-auto text-center font-medium'
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
                              <span className='font-medium text-slate-700'>
                                {student.customScores[col.id] !== undefined
                                  ? student.customScores[col.id]
                                  : "—"}
                              </span>
                            )}
                          </TableCell>
                        ))}

                        {/* DEPED GRADE CELL */}
                        <TableCell className='text-center bg-emerald-50/30 border-l font-bold text-emerald-700'>
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

      {/* --- CONFIGURE WEIGHTS MODAL --- */}
      <Dialog open={isWeightModalOpen} onOpenChange={setIsWeightModalOpen}>
        <DialogContent className='bg-white sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Configure DepEd Grading Weights</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <p className='text-xs text-muted-foreground'>
              Set the percentage weights for each assessment category. The total
              sum should equal 100%.
            </p>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase text-slate-600'>
                Written Work Weight (%)
              </label>
              <Input
                type='number'
                value={wwWeight}
                onChange={(e) => setWwWeight(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase text-slate-600'>
                Performance Tasks Weight (%)
              </label>
              <Input
                type='number'
                value={ptWeight}
                onChange={(e) => setPtWeight(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase text-slate-600'>
                Quarterly Assessment Weight (%)
              </label>
              <Input
                type='number'
                value={qaWeight}
                onChange={(e) => setQaWeight(e.target.value)}
              />
            </div>
            <div className='text-sm font-medium text-slate-700 pt-2 border-t flex justify-between items-center'>
              <span>Total Weight:</span>
              <span
                className={`font-bold ${(parseFloat(wwWeight) || 0) + (parseFloat(ptWeight) || 0) + (parseFloat(qaWeight) || 0) === 100 ? "text-emerald-600" : "text-red-600"}`}
              >
                {(parseFloat(wwWeight) || 0) +
                  (parseFloat(ptWeight) || 0) +
                  (parseFloat(qaWeight) || 0)}
                %
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsWeightModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWeights}
              className='bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              Save Weights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD SUBJECT MODAL --- */}
      <Dialog
        open={isAddSubjectModalOpen}
        onOpenChange={setIsAddSubjectModalOpen}
      >
        <DialogContent className='bg-white sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <label className='text-xs font-semibold text-slate-700'>
              Subject Name for Section:{" "}
              <span className='text-indigo-600 font-bold'>
                {selectedSection}
              </span>
            </label>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase text-slate-600'>
                Subject Title / Code
              </label>
              <Input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder='e.g., Advanced Biology'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsAddSubjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubject}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              Save Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD CUSTOM COLUMN MODAL --- */}
      <Dialog
        open={isAddColumnModalOpen}
        onOpenChange={setIsAddColumnModalOpen}
      >
        <DialogContent className='bg-white'>
          <DialogHeader>
            <DialogTitle>Add DepEd Assessment Column</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase'>
                Title (e.g. Quiz 1, Project A, Exam)
              </label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder='Enter title...'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase'>
                DepEd Assessment Category
              </label>
              <select
                className='w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
                value={newColumnCategory}
                onChange={(e) => setNewColumnCategory(e.target.value)}
              >
                <option value='Written Work'>
                  Written Work (Quizzes, Select, Seatworks)
                </option>
                <option value='Performance Tasks'>
                  Performance Tasks (Projects, Labs)
                </option>
                <option value='Quarterly Assessment'>
                  Quarterly Assessment (Exam)
                </option>
              </select>
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold uppercase'>
                Max Possible Score
              </label>
              <Input
                type='number'
                value={newColumnMaxScore}
                onChange={(e) => setNewColumnMaxScore(e.target.value)}
              />
            </div>
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
              className='bg-indigo-600 text-white'
            >
              Create Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassRecord;
