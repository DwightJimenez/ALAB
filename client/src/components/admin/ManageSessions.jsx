import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  BookOpen,
} from "lucide-react";
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

const ManageSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Modal States ---
  const [sessionToApprove, setSessionToApprove] = useState(null);
  const [sessionToReject, setSessionToReject] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Fetch all sessions
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      setSessions(data);
    } catch (error) {
      toast.error("Error fetching sessions.");
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // --- Execute Approve ---
  const handleApproveConfirm = async () => {
    if (!sessionToApprove) return;
    
    try {
      const response = await fetch(
        `${API_URL}/api/sessions/${sessionToApprove.id}/approve`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to approve");

      toast.success("Session approved successfully!");
      fetchSessions(); // Refresh the list
    } catch (error) {
      toast.error("Error approving session.");
      console.error("Approval failed:", error);
    } finally {
      setSessionToApprove(null); // Close modal
    }
  };

  // --- Execute Reject ---
  const handleRejectConfirm = async () => {
    if (!sessionToReject) return;

    try {
      const response = await fetch(
        `${API_URL}/api/sessions/${sessionToReject.id}/reject`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to reject");

      toast.success("Session rejected.");
      fetchSessions(); // Refresh the list
    } catch (error) {
      toast.error("Error rejecting session.");
      console.error("Rejection failed:", error);
    } finally {
      setSessionToReject(null); // Close modal
    }
  };

  // Filter only pending sessions for the review queue
  const pendingSessions = sessions.filter(
    (session) => session.status === "PENDING"
  );
  // Filter recently resolved sessions (Approved/Rejected) for history
  const resolvedSessions = sessions.filter(
    (session) => session.status !== "PENDING"
  );

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500">
        Loading session requests...
      </div>
    );

  return (
    <div className="p-6 text-slate-800 w-full max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-3xl font-bold tracking-tight">
          Lab Session Approvals
        </h2>
        <p className="text-slate-500 mt-1">
          Review and manage incoming laboratory booking requests from faculty.
        </p>
      </div>

      {/* PENDING REQUESTS SECTION */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="text-orange-500" /> Pending Requests (
          {pendingSessions.length})
        </h3>

        {pendingSessions.length === 0 ? (
          <div className="bg-white p-10 rounded-xl border shadow-sm text-center text-slate-400">
            No pending booking requests at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <BookOpen size={18} className="text-blue-600" />
                      {session.experimentName}
                    </h4>
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                      PENDING
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Users size={16} />{" "}
                      <span className="font-medium text-slate-800">
                        Faculty:
                      </span>{" "}
                      {session.faculty?.name || "Unknown"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users size={16} />{" "}
                      <span className="font-medium text-slate-800">
                        Section:
                      </span>{" "}
                      {session.section}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar size={16} />{" "}
                      <span className="font-medium text-slate-800">Date:</span>{" "}
                      {format(
                        parseISO(session.reservationDate),
                        "MMMM do, yyyy"
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} />{" "}
                      <span className="font-medium text-slate-800">Time:</span>{" "}
                      {session.startTime} - {session.endTime}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button
                    onClick={() => setSessionToReject(session)}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle size={16} className="mr-2" /> Reject
                  </Button>
                  <Button
                    onClick={() => setSessionToApprove(session)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle size={16} className="mr-2" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESOLVED REQUESTS HISTORY */}
      <div className="">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">
          Recently Resolved
        </h3>
        <div className="space-y-3">
          {resolvedSessions
            .slice(-5)
            .reverse()
            .map((session) => (
              <div
                key={session.id}
                className="bg-slate-50 p-4 rounded-lg border flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">
                    {session.experimentName} ({session.section})
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(parseISO(session.reservationDate), "MMM dd, yyyy")}{" "}
                    • {session.startTime}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    session.status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* --- APPROVE CONFIRMATION DIALOG --- */}
      <AlertDialog 
        open={!!sessionToApprove} 
        onOpenChange={(open) => { if (!open) setSessionToApprove(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-700">Approve Session Request</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to approve the laboratory session for <strong>{sessionToApprove?.experimentName}</strong> requested by <strong>{sessionToApprove?.faculty?.name || "the faculty member"}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApproveConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Yes, Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- REJECT CONFIRMATION DIALOG --- */}
      <AlertDialog 
        open={!!sessionToReject} 
        onOpenChange={(open) => { if (!open) setSessionToReject(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Reject Session Request</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to reject this booking request for <strong>{sessionToReject?.experimentName}</strong>? This action will notify the faculty member and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default ManageSessions;