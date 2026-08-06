import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, Users, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";

// --- TEMPORAL POLYFILL & SCHEDULE-X IMPORTS ---
import "temporal-polyfill/global";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { createViewWeek, createViewMonthGrid, createViewDay } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";

const TIME_SLOTS = [
  "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", 
  "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"
];

const FacultyOverview = () => {
  // Booking Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [section, setSection] = useState("");
  const [experimentName, setExperimentName] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;
  
  // Details Modal State
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Data State
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detect user's current local time zone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila";

  // --- SCHEDULE-X SETUP ---
  const [eventsService] = useState(() => createEventsServicePlugin());

  const calendar = useCalendarApp({
    views: [createViewWeek(), createViewMonthGrid(), createViewDay()],
    defaultView: "week",
    plugins: [eventsService],
    callbacks: {
      onEventClick(calendarEvent) {
        if (calendarEvent.rawSession) openDetails(calendarEvent.rawSession);
      },
    },
  });

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

  useEffect(() => {
    fetchSessions();
  }, []);

  // Converts ("2026-07-03", "07:00 AM") -> Temporal.ZonedDateTime object
  const formatToTemporal = (dateStr, timeStr) => {
    try {
      if (!dateStr || !timeStr) return null;

      // Clean date string (e.g., "2026-07-03")
      const cleanDate = typeof dateStr === "string" ? dateStr.split("T")[0] : null;

      // Parse 12-hour AM/PM time (e.g., "07:00 AM")
      const timeMatch = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1], 10);
      let minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const paddedHours = hours.toString().padStart(2, "0");
      const paddedMinutes = minutes.toString().padStart(2, "0");

      // RFC 9557 ISO string format expected by Temporal: "2026-07-03T07:00:00[Asia/Manila]"
      const isoString = `${cleanDate}T${paddedHours}:${paddedMinutes}:00[${userTimeZone}]`;

      return Temporal.ZonedDateTime.from(isoString);
    } catch (error) {
      console.error("Temporal Conversion Error:", error);
      return null;
    }
  };

  // Sync sessions into Schedule-X whenever data loads or changes
  useEffect(() => {
    if (!sessions.length) return;

    const calendarEvents = sessions.reduce((acc, session) => {
      const start = formatToTemporal(session.reservationDate, session.startTime);
      const end = formatToTemporal(session.reservationDate, session.endTime);

      if (start && end) {
        acc.push({
          id: String(session.id || Math.random().toString(36).slice(2)),
          title: `${session.experimentName} (${session.section})`,
          start,
          end,
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
  }, [sessions, eventsService]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    const bookingPayload = {
      section,
      experimentName,
      reservationDate: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
    };

    try {
      const response = await fetch(`${API_URL}/api/sessions/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Failed to submit request.");
        return; 
      }
      
      alert(`Lab session requested for ${section} on ${format(date, "MMM dd")}! Waiting for technician approval.`);
      setIsModalOpen(false);
      
      setDate(null);
      setStartTime("");
      setEndTime("");
      setSection("");
      setExperimentName("");

      fetchSessions();
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Failed to submit request.");
    }
  };

  const openDetails = (session) => {
    setSelectedSession(session);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="text-slate-800 w-full m-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-xl border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, Faculty</h2>
          <p className="text-slate-500 mt-1">Manage your classes and laboratory schedules.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex gap-2"
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

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Upcoming Lab Sessions</h3>
          <p className="text-slate-500 text-sm font-bold text-blue-600 text-2xl">
            {sessions.filter(s => s.status === 'APPROVED').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Pending Requests</h3>
          <p className="text-slate-500 text-sm">{sessions.filter(s => s.status === 'PENDING').length} pending approvals</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Student Progress</h3>
          <p className="text-slate-500 text-sm">All students passed Safety Gate.</p>
        </div>
      </div>

      {/* SCHEDULE-X CALENDAR SECTION */}
      <div className="bg-white p-6 rounded-xl border shadow-sm mb-8">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="font-semibold text-lg">Laboratory Schedule</h3>
        </div>
        
        <div className="h-[600px] w-full relative z-0">
          {loading ? (
             <p className="text-center text-slate-400 mt-10">Loading sessions...</p>
          ) : (
            <ScheduleXCalendar calendarApp={calendar} />
          )}
        </div>
      </div>

      {/* --- FACULTY BOOKING MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-blue-700">
              <CalendarIcon /> Request Laboratory Access
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBookingSubmit} className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Class Section</label>
                <Input required placeholder="e.g. 11-STEM Newton" value={section} onChange={(e) => setSection(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Experiment Name</label>
                <Input required placeholder="e.g. Titration of Acids" value={experimentName} onChange={(e) => setExperimentName(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col space-y-2 border-t pt-4">
              <label className="text-sm font-medium text-center">Select Date</label>
              <div className="border rounded-md p-2 flex justify-center bg-slate-50">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d.getDay() === 0 || d.getDay() === 6 || d < new Date().setHours(0,0,0,0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1"><Clock size={16} /> Start Time</label>
                <Select value={startTime} onValueChange={setStartTime} disabled={!date}>
                  <SelectTrigger><SelectValue placeholder="Start" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1"><Clock size={16} /> End Time</label>
                <Select value={endTime} onValueChange={setEndTime} disabled={!date}>
                  <SelectTrigger><SelectValue placeholder="End" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!date || !startTime || !endTime || !section}>
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- SESSION DETAILS POPUP MODAL --- */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 border-b pb-4">
              <BookOpen className="text-blue-600" /> Session Overview
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6 mt-2">
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Experiment</p>
                  <p className="text-lg font-bold text-slate-800">{selectedSession.experimentName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Class Section</p>
                    <p className="flex items-center gap-2 text-slate-700 font-medium">
                      <Users size={16} className="text-slate-400"/> {selectedSession.section}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Status</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full inline-block mt-1 ${
                      selectedSession.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                      selectedSession.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Date</p>
                    <p className="flex items-center gap-2 text-slate-700 font-medium">
                      <CalendarIcon size={16} className="text-slate-400"/> {format(parseISO(selectedSession.reservationDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Time Block</p>
                    <p className="flex items-center gap-2 text-slate-700 font-medium">
                      <Clock size={16} className="text-slate-400"/> {selectedSession.startTime} - {selectedSession.endTime}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyOverview;