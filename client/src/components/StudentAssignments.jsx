import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

const StudentAssignments = () => {
  const { user } = useSelector((state) => state.auth);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExperiment, setActiveExperiment] = useState(null);

  useEffect(() => {
    // Check for both year and section!
    if (!user || !user.section || !user.year) {
      setLoading(false);
      return;
    }

    // 1. Combine them exactly like the backend did
    const yearAndSection = `${user.year} - ${user.section}`;

    const fetchAssignments = async () => {
      try {
        // 2. Use the combined string in the fetch URL
        const response = await fetch(
          `http://localhost:5000/api/experiments/assignments/${yearAndSection}`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          setAssignments(data);
        }
      } catch (error) {
        console.error("Failed to load assignments", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading student profile...
      </div>
    );
  }

  // --- THE ACTIVE EXPERIMENT (READING) VIEW ---
  if (activeExperiment) {
    const { template } = activeExperiment;
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => setActiveExperiment(null)}>
          ← Back to Assignments
        </Button>
        <Card>
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-3xl font-bold">
              {template.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3">
                Required Lab Materials
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                {template.materials.map((m, idx) => (
                  <li key={idx} className="text-sm font-medium">
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="text-xl font-bold mb-4">Instructions</h3>
              <div
                className="prose max-w-none [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: template.instructionsHTML }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- THE DEFAULT LIST VIEW ---
  // Combine it here just for displaying the Badge!
  const displayYearSection =
    user.year && user.section ? `${user.year} - ${user.section}` : "Unassigned";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          My Assigned Experiments
        </h1>
        <p className="text-muted-foreground mt-1">
          Showing laboratory requirements for:{" "}
          <Badge variant="outline">{displayYearSection}</Badge>
        </p>
      </div>

      <Separator />

      {loading ? (
        <p>Loading your assignments...</p>
      ) : !user.section ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-destructive">
          <p>
            Your profile does not have a section assigned. Please contact your
            teacher.
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            No experiments assigned to {displayYearSection} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="flex flex-col hover:border-primary transition-colors cursor-pointer"
              onClick={() => setActiveExperiment(assignment)}
            >
              <CardHeader>
                <CardTitle className="text-xl">
                  {assignment.template.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Due:{" "}
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString()
                    : "No deadline"}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <Badge variant="secondary">
                  {assignment.template.materials.length} Materials Required
                </Badge>
              </CardContent>
              <div className="p-4 border-t bg-muted/10 text-center text-sm font-medium text-primary">
                View Instructions →
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
