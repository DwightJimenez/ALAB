import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  BookOpen,
  FlaskConical,
  CalendarClock,
  FileText,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

// --- TEMPORAL POLYFILL RESTORED ---
import "temporal-polyfill/global";

// --- SCHEDULE-X IMPORTS ---
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewWeek,
  createViewMonthGrid,
  createViewDay,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import LogoLoader from "../LogoLoader";

const TIME_SLOTS = [
  "07:00 AM",
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const FacultyOverview = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // Booking Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [experimentId, setExperimentId] = useState("");

  // Inline Draft Experiment State
  const [isCreatingNewExp, setIsCreatingNewExp] = useState(false);
  const [newExperimentTitle, setNewExperimentTitle] = useState("");

  // Details Modal & Alert State
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null);

  // Data State
  const [sessions, setSessions] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableExperiments, setAvailableExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DERIVED STATS ---
  const mySessions = useMemo(() => {
    return sessions
      .filter((s) => s.facultyId === user?.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first
  }, [sessions, user?.id]);

  const upcomingOwnSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return mySessions
      .filter((s) => {
        if (s.status !== "APPROVED") return false;
        const sessionDate = new Date(s.reservationDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate >= today;
      })
      .sort(
        (a, b) => new Date(a.reservationDate) - new Date(b.reservationDate)
      );
  }, [mySessions]);

  // Single next immediate upcoming session
  const nextUpcomingSession = upcomingOwnSessions[0] || null;

  // Filter experiments based on selected subject
  const filteredExperiments = useMemo(() => {
    if (!subject) return [];
    const selectedSubjectObj = availableSubjects.find(
      (s) => s.name === subject
    );
    if (!selectedSubjectObj) return [];
    
    return availableExperiments.filter(
      (exp) => exp.subjectId === selectedSubjectObj.id
    );
  }, [subject, availableSubjects, availableExperiments]);

  // --- SCHEDULE-X SETUP ---
  const [eventsService] = useState(() => createEventsServicePlugin());

  const calendar = useCalendarApp({
    views: [createViewWeek(), createViewMonthGrid(), createViewDay()],
    defaultView: "week",
    plugins: [eventsService],
    calendars: {
      own: {
        colorName: "own",
        lightColors: {
          main: "#2563eb", // Blue-600
          container: "#dbeafe", // Blue-100
          onContainer: "#1e3a8a", // Blue-900
        },
      },
      others: {
        colorName: "others",
        lightColors: {
          main: "#94a3b8", // Slate-400
          container: "#f1f5f9", // Slate-100
          onContainer: "#334155", // Slate-700
        },
      },
    },
    callbacks: {
      onEventClick(calendarEvent) {
        if (calendarEvent.rawSession) openDetails(calendarEvent.rawSession);
      },
    },
  });

  // --- FETCH SESSIONS ---
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH ASSIGNED SECTIONS, SUBJECTS & EXPERIMENTS ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;
      try {
        const sectionRes = await fetch(
          `${API_URL}/api/class-management/available-sections/${user.id}`,
          { credentials: "include" }
        );
        if (sectionRes.ok) setAvailableSections(await sectionRes.json());

        const subjectRes = await fetch(`${API_URL}/api/subjects`, {
          credentials: "include",
        });
        if (subjectRes.ok) setAvailableSubjects(await subjectRes.json());

        const expRes = await fetch(`${API_URL}/api/experiments`, {
          credentials: "include",
        });
        if (expRes.ok) setAvailableExperiments(await expRes.json());
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    fetchInitialData();
  }, [user?.id, API_URL]);

  useEffect(() => {
    fetchSessions();
  }, []);

  // --- TEMPORAL CONVERTER ---
  const formatToTemporal = (dateStr, timeStr) => {
    try {
      if (!dateStr || !timeStr) return null;
      const cleanDate =
        typeof dateStr === "string" ? dateStr.split("T")[0] : null;
      const timeMatch = timeStr
        .trim()
        .match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1], 10);
      let minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const paddedHours = hours.toString().padStart(2, "0");
      const paddedMinutes = minutes.toString().padStart(2, "0");

      const isoString = `${cleanDate}T${paddedHours}:${paddedMinutes}:00[UTC]`;
      return Temporal.ZonedDateTime.from(isoString);
    } catch (error) {
      console.error("Temporal Conversion Error:", error);
      return null;
    }
  };

  // Sync sessions into Schedule-X (ONLY APPROVED)
  useEffect(() => {
    if (!sessions.length) return;

    const calendarEvents = sessions.reduce((acc, session) => {
      // SKIP unapproved sessions in the calendar
      if (session.status !== "APPROVED") return acc;

      const start = formatToTemporal(
        session.reservationDate,
        session.startTime
      );
      const end = formatToTemporal(session.reservationDate, session.endTime);

      if (start && end) {
        const isOwnSession = session.facultyId === user?.id;

        acc.push({
          id: String(session.id || Math.random().toString(36).slice(2)),
          title: `${session.experimentName || "Experiment"} (${session.section})`,
          start,
          end,
          calendarId: isOwnSession ? "own" : "others",
          rawSession: session,
        });
      }
      return acc;
    }, []);

    try {
      eventsService.set(calendarEvents);
    } catch (err) {
      console.error("Failed to render Schedule-X events:", err);
    }
  }, [sessions, eventsService, user?.id]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalExperimentId = null;
      let finalExperimentName = "";

      if (isCreatingNewExp) {
        const selectedSubjectObj = availableSubjects.find(
          (s) => s.name === subject
        );
        const subjectIdForDraft = selectedSubjectObj
          ? selectedSubjectObj.id
          : null;

        const draftPayload = {
          title: newExperimentTitle,
          subjectId: subjectIdForDraft,
          skillIds: [],
          materials: [],
          instructionsHTML:
            "<p>Draft experiment. Please edit this template to add full instructions.</p>",
          isGroupSubmission: true,
          maxGroupSize: 4,
        };

        const expResponse = await fetch(`${API_URL}/api/experiments/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(draftPayload),
        });

        const expData = await expResponse.json();
        if (!expResponse.ok)
          throw new Error(
            expData.error || "Failed to create draft experiment."
          );

        finalExperimentId = expData.experiment.id;
        finalExperimentName = expData.experiment.title;

        const assignPayload = {
          yearAndSections: [section],
          dueDate: format(date, "yyyy-MM-dd"),
          requireSafetyGate: true,
        };

        const assignResponse = await fetch(
          `${API_URL}/api/experiments/${finalExperimentId}/assign`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(assignPayload),
          }
        );

        if (!assignResponse.ok)
          throw new Error("Failed to assign draft experiment.");
        setAvailableExperiments((prev) => [...prev, expData.experiment]);
      } else {
        finalExperimentId = parseInt(experimentId);
        const selectedExp = availableExperiments.find(
          (exp) => exp.id.toString() === experimentId
        );
        if (selectedExp) finalExperimentName = selectedExp.title;
      }

      const bookingPayload = {
        section,
        subject,
        experimentId: finalExperimentId,
        experimentName: finalExperimentName,
        reservationDate: format(date, "yyyy-MM-dd"),
        startTime,
        endTime,
      };

      const response = await fetch(`${API_URL}/api/sessions/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to submit request.");
        return;
      }

      toast.success(
        `Lab session requested for ${section} on ${format(date, "MMM dd")}!`
      );

      setIsModalOpen(false);
      setDate(null);
      setStartTime("");
      setEndTime("");
      setSection("");
      setSubject("");
      setExperimentId("");
      setIsCreatingNewExp(false);
      setNewExperimentTitle("");

      fetchSessions();
    } catch (error) {
      console.error("Booking failed:", error);
      toast.error(error.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeCancelSession = async () => {
    if (!sessionToCancel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionToCancel}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to cancel session.");
      }

      toast.success("Session successfully cancelled.");
      fetchSessions(); // Refresh list & calendar
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSessionToCancel(null);
    }
  };

  const openDetails = (session) => {
    setSelectedSession(session);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className='text-slate-800 w-full p-4 sm:p-6'>
      {/* HEADER */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-xl border shadow-sm gap-4'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Welcome, {user?.name ? user.name.split(" ")[0] : "Faculty"}
          </h2>
          <p className='text-slate-500 mt-1'>
            Manage your classes and laboratory schedules.
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 w-full md:w-auto'>
          {/* --- MY REQUESTS SHEET TRIGGER --- */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className='shadow-sm flex gap-2 w-full sm:w-auto'>
                <FileText size={18} />
                My Requests
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[95vw] sm:max-w-md overflow-y-auto custom-scrollbar">
              <SheetHeader className="border-b pb-4">
                <SheetTitle>My Session Requests</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {mySessions.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No requests found.</p>
                ) : (
                  mySessions.map((session) => (
                    <div key={session.id} className="bg-slate-50 p-4 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-bold text-slate-800 line-clamp-1">{session.experimentName}</h4>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${session.status === 'APPROVED' ? 'bg-green-100 text-green-700' : session.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-1 flex items-center gap-1.5"><Users size={12} /> {session.section}</p>
                      <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5"><CalendarIcon size={12} /> {format(parseISO(session.reservationDate), "MMM dd, yyyy")} • {session.startTime}</p>
                      
                      {/* Cancel Button only for active/pending sessions */}
                      {(session.status === "PENDING" || session.status === "APPROVED") && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => setSessionToCancel(session.id)}
                        >
                          <Trash2 size={14} className="mr-1.5" /> Cancel Session
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* --- BOOK LAB SESSION TRIGGER --- */}
          <Button
            className='bg-blue-600 hover:bg-blue-700 text-white shadow-md flex gap-2 w-full sm:w-auto'
            onClick={() => {
              setDate(new Date());
              setIsModalOpen(true);
            }}
          >
            <CalendarIcon size={18} />
            Book Lab Session
          </Button>
        </div>
      </div>

      {/* --- NEXT UPCOMING SESSION BANNER --- */}
      {nextUpcomingSession && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-md overflow-hidden relative mb-6">
          <div className="absolute right-0 top-0 opacity-10 scale-150 -translate-y-8 translate-x-8 pointer-events-none">
            <FlaskConical size={200} />
          </div>
          <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl shrink-0">
                <CalendarClock className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-100 font-semibold block mb-0.5">
                  Your Next Scheduled Lab
                </span>
                <h3 className="text-xl font-bold">
                  {nextUpcomingSession.experimentName || "Experiment Session"}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-blue-50">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5" /> {nextUpcomingSession.section}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CalendarIcon className="w-3.5 h-3.5" />{" "}
                    {format(parseISO(nextUpcomingSession.reservationDate), "MMMM do, yyyy")}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" /> {nextUpcomingSession.startTime} - {nextUpcomingSession.endTime}
                  </span>
                </div>
              </div>
            </div>
            <Button
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold shrink-0 w-full md:w-auto"
              onClick={() => openDetails(nextUpcomingSession)}
            >
              View Details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STAT CARDS */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
        <div className='bg-white p-6 rounded-xl border shadow-sm'>
          <h3 className='font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2'>
            Your Upcoming Labs
          </h3>
          <p className='text-slate-800 font-bold text-3xl'>
            {upcomingOwnSessions.length}
          </p>
        </div>
        <div className='bg-white p-6 rounded-xl border shadow-sm'>
          <h3 className='font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2'>
            Pending Requests
          </h3>
          <p className='text-slate-800 font-bold text-3xl'>
            {sessions.filter((s) => s.status === "PENDING" && s.facultyId === user?.id).length}
          </p>
        </div>
        <div className='bg-white p-6 rounded-xl border shadow-sm'>
          <h3 className='font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2'>
            Student Progress
          </h3>
          <p className='text-slate-800 font-bold text-lg leading-tight mt-1'>
            All assigned students cleared Safety Gate.
          </p>
        </div>
      </div>

      {/* SCHEDULE-X CALENDAR SECTION */}
      <div className='bg-white p-4 sm:p-6 rounded-xl border shadow-sm mb-8'>
        <div className='flex justify-between items-center mb-6 border-b pb-4'>
          <h3 className='font-semibold text-lg'>Laboratory Schedule</h3>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600"></div> My Labs</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-400"></div> Other Faculty</span>
          </div>
        </div>

        <div className='h-full w-full relative z-0'>
          {loading ? (
            <LogoLoader size='sm' />
          ) : (
            <ScheduleXCalendar calendarApp={calendar} />
          )}
        </div>
      </div>

      {/* --- FACULTY BOOKING MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className='w-[95vw] sm:max-w-[650px] h-[90vh] sm:h-fit overflow-y-auto bg-white custom-scrollbar'>
          <DialogHeader>
            <DialogTitle className='text-xl flex items-center gap-2 text-blue-700'>
              <CalendarIcon /> Request Laboratory Access
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBookingSubmit} className='space-y-4 mt-2'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex flex-col gap-4'>
                {/* SECTION DROPDOWN */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Class Section</label>
                  <Select
                    value={section}
                    onValueChange={setSection}
                    required
                    disabled={availableSections.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          availableSections.length === 0
                            ? "No sections assigned"
                            : "Select a section"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((sec) => (
                        <SelectItem key={sec} value={sec}>
                          {sec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* SUBJECT DROPDOWN */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Subject</label>
                  <Select
                    value={subject}
                    onValueChange={(val) => {
                      setSubject(val);
                      setExperimentId(""); // Reset experiment when subject changes
                      setIsCreatingNewExp(false);
                    }}
                    required
                    disabled={availableSubjects.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          availableSubjects.length === 0
                            ? "No subjects found"
                            : "Select a subject"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>{" "}
                {/* EXPERIMENT DROPDOWN */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium flex items-center gap-1'>
                    <FlaskConical size={16} /> Assign Experiment
                  </label>
                  <Select
                    value={isCreatingNewExp ? "new" : experimentId}
                    onValueChange={(val) => {
                      if (val === "new") {
                        setIsCreatingNewExp(true);
                        setExperimentId("");
                      } else {
                        setIsCreatingNewExp(false);
                        setExperimentId(val);
                      }
                    }}
                    required
                    disabled={!subject} // Locked until subject is picked
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          !subject 
                            ? "Select a subject first" 
                            : "Select an experiment"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value='new'
                        className='font-bold text-blue-600'
                      >
                        + Create New Draft Experiment
                      </SelectItem>
                      {filteredExperiments.map((exp) => (
                        <SelectItem key={exp.id} value={exp.id.toString()}>
                          {exp.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* NEW EXPERIMENT TITLE INPUT */}
                {isCreatingNewExp && (
                  <div className='space-y-2 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md'>
                    <label className='text-sm font-semibold text-blue-800'>
                      Draft Experiment Title
                    </label>
                    <Input
                      placeholder='e.g., Intro to Titration'
                      value={newExperimentTitle}
                      onChange={(e) => setNewExperimentTitle(e.target.value)}
                      required={isCreatingNewExp}
                      className='bg-white'
                    />
                    <p className='text-xs text-blue-600/80 leading-snug'>
                      This will generate a blank template assigned to your
                      selected section. You can add materials, skills, and
                      instructions later in the Experiment Library.
                    </p>
                  </div>
                )}
                <div className='grid grid-cols-2 gap-4 border-t pt-4'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium flex items-center gap-1'>
                      <Clock size={16} /> Start Time
                    </label>
                    <Select
                      value={startTime}
                      onValueChange={setStartTime}
                      disabled={!date}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Start' />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={`start-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium flex items-center gap-1'>
                      <Clock size={16} /> End Time
                    </label>
                    <Select
                      value={endTime}
                      onValueChange={setEndTime}
                      disabled={!date}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='End' />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={`end-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className='flex flex-col space-y-2 pt-4 md:pt-0 mx-auto w-full max-w-[280px]'>
                <Calendar
                  mode='single'
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) =>
                    d.getDay() === 0 ||
                    d.getDay() === 6 ||
                    d < new Date().setHours(0, 0, 0, 0)
                  }
                  className='transform origin-center rounded-lg border w-full'
                />
              </div>
            </div>

            <div className='flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t'>
              <Button
                type='button'
                variant='outline'
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type='submit'
                className='bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] w-full sm:w-auto'
                disabled={
                  !date ||
                  !startTime ||
                  !endTime ||
                  !section ||
                  !subject ||
                  isSubmitting ||
                  (!isCreatingNewExp && !experimentId) ||
                  (isCreatingNewExp && !newExperimentTitle)
                }
              >
                {isSubmitting ? (
                  <Spinner className='w-5 h-5' />
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- SESSION DETAILS POPUP MODAL --- */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className='w-[95vw] sm:max-w-[450px] bg-white rounded-lg'>
          <DialogHeader>
            <DialogTitle className='text-xl flex items-center gap-2 border-b pb-4'>
              <BookOpen className='text-blue-600' /> Session Overview
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className='space-y-6 mt-2'>
              <div className='space-y-4 bg-slate-50 p-4 rounded-lg border'>
                <div>
                  <p className='text-xs text-slate-500 font-semibold uppercase tracking-wider'>
                    Experiment
                  </p>
                  <p className='text-lg font-bold text-slate-800'>
                    {selectedSession.experimentName || "Experiment"}
                  </p>
                </div>
                
                <div>
                  <p className='text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1'>
                    Assigned Faculty
                  </p>
                  <p className='text-sm font-medium text-slate-700'>
                    {selectedSession.faculty?.name || (selectedSession.facultyId === user?.id ? "You" : "Another Instructor")}
                  </p>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <p className='text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1'>
                      Class Section
                    </p>
                    <p className='flex items-center gap-2 text-slate-700 font-medium'>
                      <Users size={16} className='text-slate-400 shrink-0' />{" "}
                      {selectedSession.section}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1'>
                      Status
                    </p>
                    <span
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-full inline-block mt-0.5 ${
                        selectedSession.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : selectedSession.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {selectedSession.status}
                    </span>
                  </div>
                  <div>
                    <p className='text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1'>
                      Date
                    </p>
                    <p className='flex items-center gap-2 text-slate-700 font-medium'>
                      <CalendarIcon size={16} className='text-slate-400 shrink-0' />{" "}
                      {format(
                        parseISO(selectedSession.reservationDate),
                        "MMM dd, yyyy"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1'>
                      Time Block
                    </p>
                    <p className='flex items-center gap-2 text-slate-700 font-medium'>
                      <Clock size={16} className='text-slate-400 shrink-0' />{" "}
                      {selectedSession.startTime} - {selectedSession.endTime}
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex justify-end pt-2 border-t'>
                <Button className="w-full sm:w-auto" onClick={() => setIsDetailsModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- CANCEL SESSION ALERT DIALOG --- */}
      <AlertDialog open={!!sessionToCancel} onOpenChange={(open) => !open && setSessionToCancel(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Cancel Session Request</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to cancel this session request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto flex-1">Keep Session</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeCancelSession} 
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto flex-1"
            >
              Yes, Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FacultyOverview;