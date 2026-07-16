import React, { useState, useEffect } from "react";
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

const ManageSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Handle Approving a Session
  const handleApprove = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/api/sessions/${id}/approve`,
        {
          method: "PUT",
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to approve");

      alert("Session approved!");
      fetchSessions(); // Refresh the list
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Error approving session.");
    }
  };

  // Handle Rejecting a Session
  const handleReject = async (id) => {
    if (
      !window.confirm("Are you sure you want to reject this booking request?")
    )
      return;

    try {
      const response = await fetch(
        `${API_URL}/api/sessions/${id}/reject`,
        {
          method: "PUT",
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to reject");

      alert("Session rejected!");
      fetchSessions(); // Refresh the list
    } catch (error) {
      console.error("Rejection failed:", error);
      alert("Error rejecting session.");
    }
  };

  // Filter only pending sessions for the review queue
  const pendingSessions = sessions.filter(
    (session) => session.status === "PENDING",
  );
  // Filter recently resolved sessions (Approved/Rejected) for history
  const resolvedSessions = sessions.filter(
    (session) => session.status !== "PENDING",
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
                        "MMMM do, yyyy",
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
                    onClick={() => handleReject(session.id)}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle size={16} className="mr-2" /> Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(session.id)}
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

      {/* RESOLVED REQUESTS HISTORY (Optional, but good for UX) */}
      <div className="opacity-75">
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
    </div>
  );
};

export default ManageSessions;
