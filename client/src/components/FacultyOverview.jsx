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
import { Calendar as CalendarIcon, Clock, Users, BookOpen, Eye, CheckCircle } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";

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
  
  // Details Modal State
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Availability Modal State (NEW)
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  // Data & Viewer State
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

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
        // Handle server-side conflict errors smoothly
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

  // Helper to open details modal
  const openDetails = (session) => {
    setSelectedSession(session);
    setIsDetailsModalOpen(true);
  };

  // --- NEW AVAILABILITY HELPERS ---
  const getOccupiedSlots = () => {
    return sessions
      .filter(s => s.reservationDate === format(viewDate, "yyyy-MM-dd") && s.status !== "REJECTED")
      .map(s => s.startTime);
  };

  const getNextSlot = (start) => {
    const index = TIME_SLOTS.indexOf(start);
    return TIME_SLOTS[index + 1] || start; // Returns next consecutive hour
  };

  // Filter fetched sessions for the currently selected date in the dashboard Agenda
  const dailySessions = sessions.filter(session => {
    const sessionDate = parseISO(session.reservationDate);
    return isSameDay(sessionDate, viewDate);
  });

  return (
    <div className="p-6 text-slate-800 w-full max-w-6xl mx-auto ">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-xl border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, Faculty</h2>
          <p className="text-slate-500 mt-1">Manage your classes and laboratory schedules.</p>
        </div>
        
        {/* Actions Container */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm flex gap-2"
            onClick={() => setIsAvailabilityOpen(true)}
          >
            <CheckCircle size={18} />
            Check Availability
          </Button>

          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex gap-2"
            onClick={() => {
              setDate(viewDate); // Default to viewed date
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

      {/* CALENDAR VIEWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Side: Interactive Calendar */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center">
          <h3 className="font-semibold text-lg mb-4 w-full text-left">Schedule Viewer</h3>
          <div className="border rounded-lg p-2 bg-slate-50">
            <Calendar
              mode="single"
              selected={viewDate}
              onSelect={(day) => day && setViewDate(day)}
              className="rounded-md"
            />
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center w-full">
            Select a date to view its agenda or check availability.
          </p>
        </div>

        {/* Right Side: Daily Agenda */}
        <div className="bg-white p-6 rounded-xl border shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="font-semibold text-lg">Laboratory Sessions</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
              {format(viewDate, "EEEE, MMMM do, yyyy")}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
               <p className="text-center text-slate-400 mt-10">Loading sessions...</p>
            ) : dailySessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <CalendarIcon size={48} className="mb-4 opacity-20" />
                <p>No laboratory sessions scheduled for this date.</p>
              </div>
            ) : (
              dailySessions.map((session) => (
                <div 
                  key={session.id} 
                  onClick={() => openDetails(session)}
                  className="flex gap-4 p-4 border rounded-lg bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                >
                  {/* Time Block */}
                  <div className={`flex flex-col items-center justify-center text-white rounded-md px-4 py-2 min-w-[120px] ${session.status === 'PENDING' ? 'bg-orange-400' : session.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-600'}`}>
                    <span className="font-bold text-sm">{session.startTime}</span>
                    <span className="text-xs text-white/70">to</span>
                    <span className="font-bold text-sm">{session.endTime}</span>
                  </div>
                  
                  {/* Details Block */}
                  <div className="flex flex-col justify-center w-full">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                        <BookOpen size={18} className="text-blue-600" />
                        {session.experimentName}
                        </h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            session.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                            session.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                            {session.status}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Users size={16} />
                        Class Section: <span className="font-semibold text-slate-700">{session.section}</span>
                      </p>
                      <span className="text-xs text-blue-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye size={14} /> View
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- AVAILABILITY CHECKER MODAL (NEW) --- */}
      <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-slate-800 border-b pb-4">
              <CheckCircle className="text-blue-600" /> Availability Checker
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border mb-4">
              <span className="text-sm font-medium text-slate-600">Selected Date:</span>
              <span className="font-bold text-blue-700">{format(viewDate, "EEEE, MMMM do, yyyy")}</span>
            </div>

            <p className="text-sm text-slate-500 mb-4 text-center">
              Select an available time slot below to instantly begin your booking request.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto p-1">
              {TIME_SLOTS.map((slot) => {
                const isOccupied = getOccupiedSlots().includes(slot);
                return (
                  <div 
                    key={slot} 
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      isOccupied 
                        ? "bg-red-50 border-red-200 text-red-700 cursor-not-allowed opacity-70" 
                        : "bg-green-50 border-green-200 text-green-800 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <span className="font-bold text-sm">{slot}</span>
                    
                    {isOccupied ? (
                      <span className="text-[10px] mt-1 font-bold uppercase tracking-wider bg-red-200 text-red-800 px-2 py-0.5 rounded">
                        Occupied
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                        onClick={() => {
                          // Auto-fill the main booking form
                          setDate(viewDate); 
                          setStartTime(slot);
                          setEndTime(getNextSlot(slot)); 
                          // Close this modal and open booking
                          setIsAvailabilityOpen(false);
                          setIsModalOpen(true);
                        }}
                      >
                        Book Now
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setIsAvailabilityOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- FACULTY BOOKING MODAL (NEW REQUEST) --- */}
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