import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Trash2,
  Save,
  Plus,
  SlidersHorizontal,
  Users,
  UploadCloud,
  TestTube,
} from "lucide-react";
import { toast } from "sonner";
import LogoLoader from "../LogoLoader";
import { saveAs } from "file-saver";

const WW_KEYS = ["WW1", "WW2", "WW3", "WW4", "WW5"];
const PT_KEYS = ["PT1", "PT2", "PT3"];
const QA_KEYS = ["QA1", "QA2", "QA3"]; // QA1=SA1, QA2=SA2, QA3=TE

const ClassRecord = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);
  const fileInputRef = useRef(null);

  // --- STATE ---
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  const [students, setStudents] = useState([]);
  const [hps, setHps] = useState({}); // Highest Possible Scores
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // DepEd Grading Weights State
  const [wwWeight, setWwWeight] = useState(15);
  const [ptWeight, setPtWeight] = useState(65);
  const [qaWeight, setQaWeight] = useState(20);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  // Add Subject Modal State
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // Import Lab Grades State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetColumn, setImportTargetColumn] = useState("PT1");

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
      setHps({});
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
        setHps(data.hps || {});
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

  const handleHpsChange = (key, value) => {
    setHps((prev) => ({ ...prev, [key]: value }));
  };

  const handleScoreChange = (studentId, key, value) => {
    const max = parseFloat(hps[key]);
    if (value !== "" && !isNaN(max) && parseFloat(value) > max) {
      toast.error(`Score cannot exceed Highest Possible Score (${max})`);
      return;
    }

    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              scores: { ...(student.scores || {}), [key]: value },
            }
          : student,
      ),
    );
  };

  const handleImportLabGrades = () => {
    // Check if there are any lab averages to import
    const hasLabGrades = students.some(
      (student) => student.labAvg !== null && student.labAvg !== undefined,
    );

    if (!hasLabGrades) {
      return toast.error("No lab session grades found for this section.");
    }

    // Set the HPS for the selected column to 100 automatically
    setHps((prev) => ({ ...prev, [importTargetColumn]: 100 }));

    // Apply the labAvg to the selected column
    setStudents((prev) =>
      prev.map((student) => {
        if (student.labAvg !== null && student.labAvg !== undefined) {
          return {
            ...student,
            scores: {
              ...(student.scores || {}),
              [importTargetColumn]: student.labAvg,
            },
          };
        }
        return student;
      }),
    );

    setIsImportModalOpen(false);
    setIsEditing(true); // Turn on edit mode so the user sees the 'Save Grid' button
    toast.success(
      `Imported Lab Averages into ${importTargetColumn}! Click 'Save Grid' to confirm.`,
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
    try {
      const res = await fetch(`${API_URL}/api/class-records/save-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: selectedSubject,
          section: selectedSection,
          hps, // Send updated HPS map
          students: students.map((s) => ({ id: s.id, scores: s.scores || {} })),
        }),
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

  const handlePopulateECR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsm") && !file.name.endsWith(".xlsx")) {
      return toast.error(
        "Please Save As an .xlsm (Macro-Enabled) file before uploading.",
      );
    }

    if (students.length === 0) return toast.error("No student data to export.");

    const toastId = toast.loading("Injecting data into your ECR tabs...");

    try {
      let gradeLevel = "";
      let sectionName = selectedSection;

      if (selectedSection.includes(" - ")) {
        const parts = selectedSection.split(" - ");
        gradeLevel = parts[0];
        sectionName = parts[1];
      }

      const inputDataPayload = [
        { cell: "F22", value: user?.name || "Teacher" },
        { cell: "F24", value: gradeLevel },
        { cell: "F25", value: sectionName },
        { cell: "F28", value: selectedSubject },
      ];

      const term1Payload = [];

      // Inject HPS
      WW_KEYS.forEach((key, i) => {
        if (hps[key])
          term1Payload.push({
            cell: `${["F", "G", "H", "I", "J"][i]}11`,
            value: parseFloat(hps[key]),
          });
      });
      PT_KEYS.forEach((key, i) => {
        if (hps[key])
          term1Payload.push({
            cell: `${["N", "O", "P"][i]}11`,
            value: parseFloat(hps[key]),
          });
      });
      QA_KEYS.forEach((key, i) => {
        if (hps[key])
          term1Payload.push({
            cell: `${["T", "U", "V"][i]}11`,
            value: parseFloat(hps[key]),
          });
      });

      const maleStudents = students.filter(
        (s) => !s.sex || String(s.sex).trim().toLowerCase() !== "female",
      );
      const femaleStudents = students.filter(
        (s) => s.sex && String(s.sex).trim().toLowerCase() === "female",
      );

      const mapStudentsToExcel = (
        studentList,
        nameColumn,
        startInputRow,
        startTerm1Row,
      ) => {
        let inputRow = startInputRow;
        let term1Row = startTerm1Row;

        studentList.forEach((student) => {
          inputDataPayload.push({
            cell: `${nameColumn}${inputRow}`,
            value: student.name,
          });

          const wwCols = ["F", "G", "H", "I", "J"];
          WW_KEYS.forEach((key, index) => {
            const val = student.scores?.[key];
            if (val !== undefined && val !== "") {
              term1Payload.push({
                cell: `${wwCols[index]}${term1Row}`,
                value: parseFloat(val),
              });
            }
          });

          const ptCols = ["N", "O", "P"];
          PT_KEYS.forEach((key, index) => {
            const val = student.scores?.[key];
            if (val !== undefined && val !== "") {
              term1Payload.push({
                cell: `${ptCols[index]}${term1Row}`,
                value: parseFloat(val),
              });
            }
          });

          const qaCols = ["T", "U", "V"];
          QA_KEYS.forEach((key, index) => {
            const val = student.scores?.[key];
            if (val !== undefined && val !== "") {
              term1Payload.push({
                cell: `${qaCols[index]}${term1Row}`,
                value: parseFloat(val),
              });
            }
          });

          inputRow++;
          term1Row++;
        });
      };

      mapStudentsToExcel(maleStudents, "L", 11, 13);
      mapStudentsToExcel(femaleStudents, "O", 11, 64);

      const formData = new FormData();
      formData.append("ecrFile", file);
      formData.append("inputDataPayload", JSON.stringify(inputDataPayload));
      formData.append("term1Payload", JSON.stringify(term1Payload));

      const res = await fetch(`${API_URL}/api/class-records/populate-ecr`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to populate file on server");

      const blob = await res.blob();
      saveAs(blob, `Populated_ECR_${selectedSubject}_${selectedSection}.xlsm`);

      toast.success("ECR successfully populated and downloaded!", {
        id: toastId,
      });
    } catch (error) {
      console.error("ECR Population Error:", error);
      toast.error(error.message || "Failed to populate ECR.", { id: toastId });
    } finally {
      e.target.value = null;
    }
  };

  // --- TABLE DATA PREPARATION ---
  const calcCategory = (student, keys, weight) => {
    let total = 0;
    let maxTotal = 0;

    keys.forEach((key) => {
      const max = parseFloat(hps[key]);
      if (!isNaN(max)) maxTotal += max;

      const val = parseFloat(student.scores?.[key]);
      if (!isNaN(val)) total += val;
    });

    const ps = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    const ws = ps * (weight / 100);
    return { total, ps, ws, maxTotal };
  };

  const getHpsTotal = (keys) => {
    return keys.reduce((acc, key) => {
      const val = parseFloat(hps[key]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  };

  const wwMaxTotal = getHpsTotal(WW_KEYS);
  const ptMaxTotal = getHpsTotal(PT_KEYS);
  const qaMaxTotal = getHpsTotal(QA_KEYS);

  const maleStudents = students.filter(
    (s) => !s.sex || String(s.sex).trim().toLowerCase() !== "female",
  );
  const femaleStudents = students.filter(
    (s) => s.sex && String(s.sex).trim().toLowerCase() === "female",
  );

  const renderStudentRow = (student) => {
    const ww = calcCategory(student, WW_KEYS, wwWeight);
    const pt = calcCategory(student, PT_KEYS, ptWeight);
    const qa = calcCategory(student, QA_KEYS, qaWeight);
    const initialGrade = (ww.ws || 0) + (pt.ws || 0) + (qa.ws || 0);

    return (
      <TableRow key={student.id} className='hover:bg-slate-50/50'>
        <TableCell className='font-medium sticky left-0 bg-white z-20 border-r border-slate-200 shadow-[1px_0_0_#e2e8f0]'>
          {student.name}
        </TableCell>

        {/* WW Scores */}
        {WW_KEYS.map((key) => (
          <TableCell
            key={`ww-${student.id}-${key}`}
            className='text-center border-r border-slate-200 p-1'
          >
            {isEditing ? (
              <Input
                type='number'
                className='w-14 h-8 mx-auto text-center p-1 text-xs'
                value={student.scores?.[key] ?? ""}
                onChange={(e) =>
                  handleScoreChange(student.id, key, e.target.value)
                }
              />
            ) : (
              <span className='text-sm'>{student.scores?.[key] || ""}</span>
            )}
          </TableCell>
        ))}
        <TableCell className='text-center border-r font-semibold'>
          {ww.total > 0 ? ww.total : ""}
        </TableCell>
        <TableCell className='text-center border-r'>
          {ww.ps > 0 ? ww.ps.toFixed(2) : ""}
        </TableCell>
        <TableCell className='text-center border-r font-semibold text-indigo-600'>
          {ww.ws > 0 ? ww.ws.toFixed(2) : ""}
        </TableCell>

        {/* PT Scores */}
        {PT_KEYS.map((key) => (
          <TableCell
            key={`pt-${student.id}-${key}`}
            className='text-center border-r border-slate-200 p-1'
          >
            {isEditing ? (
              <Input
                type='number'
                className='w-14 h-8 mx-auto text-center p-1 text-xs'
                value={student.scores?.[key] ?? ""}
                onChange={(e) =>
                  handleScoreChange(student.id, key, e.target.value)
                }
              />
            ) : (
              <span className='text-sm'>{student.scores?.[key] || ""}</span>
            )}
          </TableCell>
        ))}
        <TableCell className='text-center border-r font-semibold'>
          {pt.total > 0 ? pt.total : ""}
        </TableCell>
        <TableCell className='text-center border-r'>
          {pt.ps > 0 ? pt.ps.toFixed(2) : ""}
        </TableCell>
        <TableCell className='text-center border-r font-semibold text-indigo-600'>
          {pt.ws > 0 ? pt.ws.toFixed(2) : ""}
        </TableCell>

        {/* QA Scores */}
        {QA_KEYS.map((key) => (
          <TableCell
            key={`qa-${student.id}-${key}`}
            className='text-center border-r border-slate-200 p-1'
          >
            {isEditing ? (
              <Input
                type='number'
                className='w-14 h-8 mx-auto text-center p-1 text-xs'
                value={student.scores?.[key] ?? ""}
                onChange={(e) =>
                  handleScoreChange(student.id, key, e.target.value)
                }
              />
            ) : (
              <span className='text-sm'>{student.scores?.[key] || ""}</span>
            )}
          </TableCell>
        ))}
        <TableCell className='text-center border-r font-semibold'>
          {qa.total > 0 ? qa.total : ""}
        </TableCell>
        <TableCell className='text-center border-r'>
          {qa.ps > 0 ? qa.ps.toFixed(2) : ""}
        </TableCell>
        <TableCell className='text-center border-r font-semibold text-indigo-600'>
          {qa.ws > 0 ? qa.ws.toFixed(2) : ""}
        </TableCell>

        {/* Initial Grade */}
        <TableCell className='text-center border-r font-bold text-emerald-700 bg-emerald-50/50'>
          {initialGrade > 0 ? initialGrade.toFixed(2) : ""}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className='p-6 w-full grid grid-cols-1 space-y-6 animate-in fade-in duration-500'>
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

          {/* New Import Lab Grades Button */}
          <Button
            variant='outline'
            onClick={() => setIsImportModalOpen(true)}
            disabled={students.length === 0}
          >
            <TestTube className='w-4 h-4 mr-2 text-indigo-600' /> Import Lab
            Grades
          </Button>

          <input
            type='file'
            accept='.xlsm, .xlsx'
            ref={fileInputRef}
            className='hidden'
            onChange={handlePopulateECR}
          />
          <Button
            variant='outline'
            onClick={() => fileInputRef.current.click()}
          >
            <UploadCloud className='w-4 h-4 mr-2' /> Populate ECR
          </Button>
        </div>
      </div>

      <Card className='shadow-sm border-slate-200 w-full overflow-hidden'>
        <CardHeader className='bg-muted/30 border-b flex flex-row items-center justify-between py-4'>
          <div className='flex items-center gap-2'>
            <CalendarCheck className='w-5 h-5 text-indigo-600' />
            <CardTitle className='text-lg'>Class ECR Mapping</CardTitle>
          </div>
          <div className='flex items-center gap-4'>
            {isEditing ? (
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setIsEditing(false);
                    loadClassRecord(); // Reset unsaved changes
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
        <CardContent className='p-0 overflow-x-auto'>
          <Table className='w-full min-w-[1000px] table-fixed'>
            <TableHeader className='z-30 shadow-sm'>
              <TableRow className='bg-slate-50'>
                <TableHead
                  rowSpan={2}
                  className='w-[250px] min-w-[250px] max-w-[250px] sticky left-0 top-0 bg-slate-50 z-40 align-middle text-center border-r border-b font-bold text-slate-900 shadow-[1px_1px_0_#e2e8f0]'
                >
                  LEARNERS' NAMES
                </TableHead>
                <TableHead
                  colSpan={8}
                  className='w-[500px] text-center border-r border-b font-bold text-slate-900 bg-slate-50'
                >
                  WRITTEN/ ORAL WORKS ({wwWeight}%)
                </TableHead>
                <TableHead
                  colSpan={6}
                  className='w-[400px] text-center border-r border-b font-bold text-slate-900 bg-slate-50'
                >
                  PRODUCT/ PERFORMANCE TASKS ({ptWeight}%)
                </TableHead>
                <TableHead
                  colSpan={6}
                  className='w-[400px] text-center border-r border-b font-bold text-slate-900 bg-slate-50'
                >
                  SUMMATIVE TESTS & TERM EXAMINATION ({qaWeight}%)
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className='w-[100px] align-middle text-center border-r border-b font-bold text-slate-900 bg-slate-50'
                >
                  Initial Grade
                </TableHead>
              </TableRow>
              <TableRow className='bg-slate-50 text-slate-900'>
                {/* Written Works Headers */}
                {[1, 2, 3, 4, 5].map((num) => (
                  <TableHead
                    key={`ww-h-${num}`}
                    className='text-center border-r border-b w-12 px-1 font-semibold bg-slate-50'
                  >
                    {num}
                  </TableHead>
                ))}
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  Total
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  PS
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  WS
                </TableHead>

                {/* Performance Tasks Headers */}
                {[1, 2, 3].map((num) => (
                  <TableHead
                    key={`pt-h-${num}`}
                    className='text-center border-r border-b w-12 px-1 font-semibold bg-slate-50'
                  >
                    {num}
                  </TableHead>
                ))}
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  Total
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  PS
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  WS
                </TableHead>

                {/* Summative Headers */}
                <TableHead className='text-center border-r border-b w-12 px-1 font-semibold bg-slate-50'>
                  SA1
                </TableHead>
                <TableHead className='text-center border-r border-b w-12 px-1 font-semibold bg-slate-50'>
                  SA2
                </TableHead>
                <TableHead className='text-center border-r border-b w-12 px-1 font-semibold bg-slate-50'>
                  TE
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  Total
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  PS
                </TableHead>
                <TableHead className='text-center border-r border-b font-bold w-16 bg-slate-50'>
                  WS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={22} className='text-center py-12'>
                    <LogoLoader size='sm' />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* HIGHEST POSSIBLE SCORE ROW */}
                  <TableRow className='bg-slate-100 font-semibold text-sm'>
                    <TableCell className='text-right border-r border-b sticky left-0 bg-slate-100 z-20 font-bold text-slate-900 pr-4 shadow-[1px_0_0_#e2e8f0]'>
                      HIGHEST POSSIBLE SCORE
                    </TableCell>

                    {/* WW HPS Inputs */}
                    {WW_KEYS.map((key) => (
                      <TableCell
                        key={`hps-${key}`}
                        className='text-center border-r border-b p-1'
                      >
                        {isEditing ? (
                          <Input
                            type='number'
                            className='w-14 h-8 mx-auto text-center p-1 text-xs font-bold text-indigo-700 bg-white'
                            value={hps[key] ?? ""}
                            onChange={(e) =>
                              handleHpsChange(key, e.target.value)
                            }
                          />
                        ) : (
                          hps[key] || ""
                        )}
                      </TableCell>
                    ))}
                    <TableCell className='text-center border-r border-b text-indigo-700'>
                      {wwMaxTotal > 0 ? wwMaxTotal : ""}
                    </TableCell>
                    <TableCell className='text-center border-r border-b'>
                      100.00
                    </TableCell>
                    <TableCell className='text-center border-r border-b'>
                      {wwWeight}%
                    </TableCell>

                    {/* PT HPS Inputs */}
                    {PT_KEYS.map((key) => (
                      <TableCell
                        key={`hps-${key}`}
                        className='text-center border-r border-b p-1'
                      >
                        {isEditing ? (
                          <Input
                            type='number'
                            className='w-14 h-8 mx-auto text-center p-1 text-xs font-bold text-indigo-700 bg-white'
                            value={hps[key] ?? ""}
                            onChange={(e) =>
                              handleHpsChange(key, e.target.value)
                            }
                          />
                        ) : (
                          hps[key] || ""
                        )}
                      </TableCell>
                    ))}
                    <TableCell className='text-center border-r border-b text-indigo-700'>
                      {ptMaxTotal > 0 ? ptMaxTotal : ""}
                    </TableCell>
                    <TableCell className='text-center border-r border-b'>
                      100.00
                    </TableCell>
                    <TableCell className='text-center border-r border-b'>
                      {ptWeight}%
                    </TableCell>

                    {/* QA HPS Inputs */}
                    {QA_KEYS.map((key) => (
                      <TableCell
                        key={`hps-${key}`}
                        className='text-center border-r border-b p-1'
                      >
                        {isEditing ? (
                          <Input
                            type='number'
                            className='w-14 h-8 mx-auto text-center p-1 text-xs font-bold text-indigo-700 bg-white'
                            value={hps[key] ?? ""}
                            onChange={(e) =>
                              handleHpsChange(key, e.target.value)
                            }
                          />
                        ) : (
                          hps[key] || ""
                        )}
                      </TableCell>
                    ))}
                    <TableCell className='text-center border-r border-b text-indigo-700'>
                      {qaMaxTotal > 0 ? qaMaxTotal : ""}
                    </TableCell>
                    <TableCell className='text-center border-r border-b'>
                      100.00
                    </TableCell>
                    <TableCell className='text-center border-r border-b'>
                      {qaWeight}%
                    </TableCell>

                    {/* Empty cell for Initial Grade under HPS */}
                    <TableCell className='text-center border-r border-b'></TableCell>
                  </TableRow>

                  {/* MALE SECTION */}
                  {maleStudents.length > 0 && (
                    <TableRow className='bg-slate-200 hover:bg-slate-200'>
                      <TableCell className='font-bold text-left px-4 py-2 text-slate-900 border-b border-r sticky left-0 bg-slate-200 z-20 shadow-[1px_0_0_#e2e8f0]'>
                        MALE
                      </TableCell>
                      <TableCell
                        colSpan={21}
                        className='bg-slate-200 border-b'
                      ></TableCell>
                    </TableRow>
                  )}
                  {maleStudents.map((student) => renderStudentRow(student))}

                  {/* FEMALE SECTION */}
                  {femaleStudents.length > 0 && (
                    <TableRow className='bg-slate-200 hover:bg-slate-200'>
                      <TableCell className='font-bold text-left px-4 py-2 text-slate-900 border-b border-r sticky left-0 bg-slate-200 z-20 shadow-[1px_0_0_#e2e8f0]'>
                        FEMALE
                      </TableCell>
                      <TableCell
                        colSpan={21}
                        className='bg-slate-200 border-b'
                      ></TableCell>
                    </TableRow>
                  )}
                  {femaleStudents.map((student) => renderStudentRow(student))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Weight Settings Modal */}
      <Dialog open={isWeightModalOpen} onOpenChange={setIsWeightModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DepEd Grading Weights</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <label className='text-right text-sm font-medium'>
                Written Work (%)
              </label>
              <Input
                type='number'
                value={wwWeight}
                onChange={(e) => setWwWeight(e.target.value)}
                className='col-span-3'
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <label className='text-right text-sm font-medium'>
                Performance Task (%)
              </label>
              <Input
                type='number'
                value={ptWeight}
                onChange={(e) => setPtWeight(e.target.value)}
                className='col-span-3'
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <label className='text-right text-sm font-medium'>
                Quarterly Assessment (%)
              </label>
              <Input
                type='number'
                value={qaWeight}
                onChange={(e) => setQaWeight(e.target.value)}
                className='col-span-3'
              />
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
              className='bg-indigo-600 hover:bg-indigo-700'
            >
              Save Weights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subject Modal */}
      <Dialog
        open={isAddSubjectModalOpen}
        onOpenChange={setIsAddSubjectModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>Subject Name</label>
              <Input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder='e.g., General Chemistry'
              />
            </div>
            <p className='text-xs text-muted-foreground'>
              This subject will be associated with the currently selected
              section ({selectedSection}).
            </p>
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
              className='bg-indigo-600 hover:bg-indigo-700'
            >
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Lab Grades Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Lab Session Averages</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <p className='text-sm text-slate-600'>
              Choose which Performance Task column to automatically populate
              with the student's Lab Session Activity Grades.
            </p>
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>Target Column</label>
              <Select
                value={importTargetColumn}
                onValueChange={setImportTargetColumn}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select column' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='PT1'>Performance Task 1 (PT1)</SelectItem>
                  <SelectItem value='PT2'>Performance Task 2 (PT2)</SelectItem>
                  <SelectItem value='PT3'>Performance Task 3 (PT3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className='text-xs text-orange-600 font-medium'>
              * This will overwrite any existing manual scores in the selected
              column and set the Highest Possible Score (HPS) to 100.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportLabGrades}
              className='bg-indigo-600 hover:bg-indigo-700'
            >
              Import Grades
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassRecord;
