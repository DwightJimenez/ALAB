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
import { Save, Check, X, Clock, CalendarPlus, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const ClassAttendance = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // --- COMPONENT STATE ---
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});

  // --- 1. FETCH AVAILABLE SECTIONS FOR THIS TEACHER ---
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
          if (data.length > 0) {
            setSelectedSection(data[0]);
          }
        }
      } catch (error) {
        toast.error("Failed to load your assigned sections.");
        console.error(error);
      }
    };

    fetchSections();
  }, [user?.id, API_URL]);

  // --- 2. FETCH ATTENDANCE DATA WHEN SECTION CHANGES ---
  useEffect(() => {
    const loadData = async () => {
      if (!selectedSection || !user?.id) return;

      try {
        const res = await fetch(
          `${API_URL}/api/class-management/${user.id}/${selectedSection}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          
          setStudents(data.students || []);
          setAttendance(data.attendance || {});

          // Map sessions to include a unique key for the frontend grid
          const formattedSessions = (data.sessions || []).map((s) => ({
            ...s,
            uniqueKey: `${s.sessionType}_${s.id}`,
          }));
          setSessions(formattedSessions);
        }
      } catch (error) {
        toast.error("Failed to load attendance data.");
        console.error(error);
      }
    };

    loadData();
  }, [selectedSection, user?.id, API_URL]);

  // --- ATTENDANCE HANDLERS ---
  // Only allows adding standard CLASS sessions. Labs come from the DB.
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
      prev.map((s) => (s.uniqueKey === uniqueKey ? { ...s, date: newDate } : s)),
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
    if (!selectedSection || !user?.id)
      return toast.error("No section selected");

    try {
      const res = await fetch(`${API_URL}/api/class-management/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          facultyId: user.id,
          section: selectedSection,
          sessions: sessions, 
          attendance: attendance,
        }),
      });

      if (res.ok) {
        toast.success("Attendance records synchronized!");

        // Refresh to swap temporary frontend IDs (s_XXX) with real database IDs
        const dataRes = await fetch(
          `${API_URL}/api/class-management/${user.id}/${selectedSection}`,
          { credentials: "include" },
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

  return (
    <div className='p-6 w-full mx-auto space-y-6 animate-in fade-in duration-500'>
      {/* Header & Controls */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Class Attendance
          </h1>
          <p className='text-muted-foreground'>
            Freestyle session tracking. Click cells to toggle status.
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
              className='text-xs text-muted-foreground font-normal'
            >
              Toggle: Present → Absent → Late
            </Badge>
          </div>
          <div className='flex gap-2 flex-wrap'>
            <Button
              onClick={addClassSession}
              variant='outline'
              className='gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50'
              disabled={!selectedSection}
            >
              <CalendarPlus className='w-4 h-4' /> Add Class
            </Button>
            {/* Removed the manual "Add Lab" button here */}
            <Button
              onClick={saveAttendance}
              className='gap-2 bg-indigo-600 hover:bg-indigo-700'
              disabled={!selectedSection}
            >
              <Save className='w-4 h-4' /> Save Record
            </Button>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto relative'>
            <Table>
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
                            <FlaskConical className="w-3 h-3 text-cyan-600" />
                          ) : (
                            <CalendarPlus className="w-3 h-3 text-indigo-600" />
                          )}
                          {session.sessionType === "LAB" ? "Lab" : "Class"} {index + 1}
                        </span>
                        
                        {/* Show experiment name if it's a lab session */}
                        {session.sessionType === "LAB" && session.experimentName && (
                          <span className="text-[10px] text-cyan-700 font-medium truncate w-full px-1" title={session.experimentName}>
                            {session.experimentName}
                          </span>
                        )}

                        <Input
                          type='date'
                          value={session.date ? session.date.split('T')[0] : ""}
                          onChange={(e) =>
                            updateSessionDate(session.uniqueKey, e.target.value)
                          }
                          // Disable editing the date if it's a lab session booked via the other module
                          disabled={session.sessionType === "LAB"}
                          className='h-8 text-xs font-medium bg-white mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50'
                        />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={sessions.length + 1}
                      className='text-center text-muted-foreground py-8'
                    >
                      No students found in this section.
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
                        const status = attendance[student.id]?.[session.uniqueKey];
                        return (
                          <TableCell
                            key={session.uniqueKey}
                            className={`text-center border-l p-2 ${
                              session.sessionType === "LAB" ? "bg-cyan-50/10" : ""
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
    </div>
  );
};

export default ClassAttendance;