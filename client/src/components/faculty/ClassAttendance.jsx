import React, { useState, useEffect, useMemo } from "react";
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
  Save,
  Check,
  X,
  Clock,
  CalendarPlus,
  FlaskConical,
  BookOpen,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import LogoLoader from "../LogoLoader";

const ClassAttendance = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // --- COMPONENT STATE ---
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Add Subject Modal State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // --- 1. FETCH SECTIONS & SUBJECTS ON MOUNT ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;
      try {
        // Fetch Sections First
        const sectionRes = await fetch(
          `${API_URL}/api/class-management/available-sections/${user.id}`,
          { credentials: "include" }
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
        toast.error("Failed to load initial data.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.id, API_URL]);

  // --- FILTER SUBJECTS BASED ON SELECTED SECTION ---
  const filteredSubjects = useMemo(() => {
    if (!selectedSection) return [];

    return availableSubjects.filter((sub) => {
      // UPDATED: Matches the new backend structure (sub.section instead of sub.facultySections array)
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
  }, [filteredSubjects, selectedSection]); // Added selectedSection to dependencies

  // --- 2. FETCH ATTENDANCE DATA WHEN SUBJECT OR SECTION CHANGES ---
  useEffect(() => {
    const loadData = async () => {
      if (!selectedSection || !selectedSubject || !user?.id) {
        setStudents([]);
        setSessions([]);
        setAttendance({});
        return;
      }

      setTableLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/class-management/${user.id}/${encodeURIComponent(
            selectedSubject
          )}/${encodeURIComponent(selectedSection)}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
          setAttendance(data.attendance || {});

          const formattedSessions = (data.sessions || []).map((s) => ({
            ...s,
            uniqueKey: `${s.sessionType}_${s.id}`,
          }));
          setSessions(formattedSessions);
        }
      } catch (error) {
        toast.error("Failed to load attendance data.");
        console.error(error);
      } finally {
        setTableLoading(false);
      }
    };

    loadData();
  }, [selectedSection, selectedSubject, user?.id, API_URL]);

  // --- ADD SUBJECT HANDLER ---
  const handleAddSubject = async () => {
    if (!newSubjectName.trim())
      return toast.error("Please enter a subject name.");
    if (!selectedSection)
      return toast.error(
        "Please select a section first to assign this subject to."
      );

    try {
      const res = await fetch(`${API_URL}/api/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSubjectName.trim(),
          facultyId: user.id,
          fullSectionName: selectedSection, // Links subject to current section
        }),
      });

      if (res.ok) {
        const newSubject = await res.json();

        // Add to dropdown
        setAvailableSubjects((prev) => {
          const exists = prev.find((s) => s.id === newSubject.id);
          if (exists) return prev;
          return [...prev, newSubject].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        });

        setSelectedSubject(newSubject.name);
        setNewSubjectName("");
        setIsAddSubjectOpen(false);
        toast.success("Subject added and linked to your section!");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to add subject.");
      }
    } catch (error) {
      toast.error("Network error.");
      console.error(error);
    }
  };

  // --- ATTENDANCE HANDLERS ---
  const addClassSession = () => {
    const newId = `s_${Date.now()}`;
    const newSession = {
      id: newId,
      date: "",
      sessionType: "CLASS",
      uniqueKey: `CLASS_${newId}`,
    };
    setSessions([...sessions, newSession]);
  };

  const updateSessionDate = (uniqueKey, newDate) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.uniqueKey === uniqueKey ? { ...s, date: newDate } : s
      )
    );
  };

  const toggleAttendance = (studentId, uniqueSessionKey) => {
    setAttendance((prev) => {
      const currentStatus = prev[studentId]?.[uniqueSessionKey];
      let nextStatus = "P";
      if (currentStatus === "P") nextStatus = "A";
      else if (currentStatus === "A") nextStatus = "L";
      else if (currentStatus === "L") nextStatus = null;

      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [uniqueSessionKey]: nextStatus,
        },
      };
    });
  };

  // --- SAVE DATA TO DATABASE ---
  const saveAttendance = async () => {
    if (!selectedSection || !selectedSubject || !user?.id)
      return toast.error("Please select a subject and section.");

    try {
      const res = await fetch(`${API_URL}/api/class-management/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          facultyId: user.id,
          subject: selectedSubject,
          section: selectedSection,
          sessions: sessions,
          attendance: attendance,
        }),
      });

      if (res.ok) {
        toast.success("Attendance records synchronized!");
        const dataRes = await fetch(
          `${API_URL}/api/class-management/${user.id}/${encodeURIComponent(
            selectedSubject
          )}/${encodeURIComponent(selectedSection)}`,
          { credentials: "include" }
        );
        if (dataRes.ok) {
          const data = await dataRes.json();
          setAttendance(data.attendance || {});

          const formattedSessions = (data.sessions || []).map((s) => ({
            ...s,
            uniqueKey: `${s.sessionType}_${s.id}`,
          }));
          setSessions(formattedSessions);
        }
      } else {
        toast.error("Failed to sync records.");
      }
    } catch (error) {
      toast.error("Network error while saving.");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className='w-full min-h-[80vh] flex justify-center items-center'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 w-full mx-auto space-y-6 animate-in fade-in duration-500'>
      {/* Header & Controls */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>
            Class Attendance
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Freestyle session tracking. Click cells to toggle status.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-3 w-full sm:w-auto'>
          {/* SECTION DROPDOWN */}
          <div className='flex items-center gap-2 bg-white border border-input rounded-md px-3 py-1.5 shadow-sm flex-1 sm:flex-none'>
            <Users className='w-4 h-4 text-slate-400 shrink-0' />
            <select
              className='h-8 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer w-full'
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

          {/* SUBJECT DROPDOWN & ADD BUTTON */}
          <div className='flex items-center gap-2 bg-white border border-input rounded-md px-3 py-1.5 shadow-sm flex-1 sm:flex-none'>
            <BookOpen className='w-4 h-4 text-slate-400 shrink-0' />
            <select
              className='h-8 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer w-full'
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={filteredSubjects.length === 0 || !selectedSection}
            >
              {filteredSubjects.length === 0 ? (
                <option value=''>
                  {selectedSection ? "No subjects found" : "Select section first"}
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
              onClick={() => setIsAddSubjectOpen(true)}
              className='text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
              title='Add New Subject'
              disabled={!selectedSection}
            >
              <Plus className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      <Card className='shadow-sm border-slate-200'>
        <CardHeader className='bg-slate-50/50 border-b flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-4'>
          <div className='flex items-center gap-3'>
            <CardTitle className='text-lg text-slate-800'>
              Session Records
            </CardTitle>
            <Badge
              variant='outline'
              className='text-xs text-muted-foreground font-normal bg-white hidden sm:inline-flex'
            >
              Toggle: Present → Absent → Late
            </Badge>
          </div>
          <div className='flex gap-2 flex-wrap w-full md:w-auto'>
            <Button
              onClick={addClassSession}
              variant='outline'
              className='gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white flex-1 md:flex-none'
              disabled={!selectedSection || !selectedSubject || tableLoading}
            >
              <CalendarPlus className='w-4 h-4' /> Add Class
            </Button>
            <Button
              onClick={saveAttendance}
              className='gap-2 bg-indigo-600 hover:bg-indigo-700 text-white flex-1 md:flex-none'
              disabled={!selectedSection || !selectedSubject || tableLoading}
            >
              <Save className='w-4 h-4' /> Save Record
            </Button>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto relative'>
            <Table className='min-w-[600px]'>
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead className='w-[250px] font-semibold sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]'>
                    Student Name
                  </TableHead>
                  {/* Dynamic Session Columns */}
                  {sessions.map((session, index) => (
                    <TableHead
                      key={session.uniqueKey}
                      className={`min-w-[180px] text-center border-l ${
                        session.sessionType === "LAB" ? "bg-cyan-50/30" : ""
                      }`}
                    >
                      <div className='flex flex-col gap-1 p-1'>
                        <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1'>
                          {session.sessionType === "LAB" ? (
                            <FlaskConical className='w-3 h-3 text-cyan-600' />
                          ) : (
                            <CalendarPlus className='w-3 h-3 text-indigo-600' />
                          )}
                          {session.sessionType === "LAB" ? "Lab" : "Class"}{" "}
                          {index + 1}
                        </span>

                        {session.sessionType === "LAB" &&
                          session.experimentName && (
                            <span
                              className='text-[10px] text-cyan-700 font-medium truncate w-full px-1'
                              title={session.experimentName}
                            >
                              {session.experimentName}
                            </span>
                          )}

                        <Input
                          type='date'
                          value={session.date ? session.date.split("T")[0] : ""}
                          onChange={(e) =>
                            updateSessionDate(session.uniqueKey, e.target.value)
                          }
                          disabled={session.sessionType === "LAB"}
                          className='h-8 text-xs font-medium bg-white mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50'
                        />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={sessions.length + 1}
                      className='text-center py-12'
                    >
                      <div className='flex justify-center'>
                        <LogoLoader size='sm' />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={sessions.length + 1}
                      className='text-center text-muted-foreground py-8'
                    >
                      No students found for this section.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id} className='hover:bg-slate-50/50'>
                      <TableCell className='font-medium text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]'>
                        {student.name}
                      </TableCell>

                      {/* Dynamic Attendance Cells */}
                      {sessions.map((session) => {
                        const status =
                          attendance[student.id]?.[session.uniqueKey];
                        return (
                          <TableCell
                            key={session.uniqueKey}
                            className={`text-center border-l p-2 ${
                              session.sessionType === "LAB"
                                ? "bg-cyan-50/10"
                                : ""
                            }`}
                          >
                            <button
                              onClick={() =>
                                toggleAttendance(student.id, session.uniqueKey)
                              }
                              className={`w-12 h-10 rounded-md flex items-center justify-center transition-all duration-200 mx-auto border
                                ${
                                  status === "P"
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 shadow-inner"
                                    : status === "A"
                                      ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200 shadow-inner"
                                      : status === "L"
                                        ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 shadow-inner"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                                }`}
                            >
                              {status === "P" && <Check className='w-5 h-5' />}
                              {status === "A" && <X className='w-5 h-5' />}
                              {status === "L" && <Clock className='w-5 h-5' />}
                              {!status && (
                                <span className='text-xl leading-none -mt-1'>
                                  -
                                </span>
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- ADD SUBJECT MODAL --- */}
      <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
        <DialogContent className='w-[95vw] sm:max-w-[400px] bg-white rounded-lg'>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-3'>
            <label className='text-xs font-semibold text-slate-700'>
              Subject Name for Section: <span className="text-indigo-600 font-bold">{selectedSection}</span>
            </label>
            <Input
              placeholder='e.g., Advanced Biology'
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant='outline'
              onClick={() => setIsAddSubjectOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubject}
              className='bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto'
            >
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassAttendance;