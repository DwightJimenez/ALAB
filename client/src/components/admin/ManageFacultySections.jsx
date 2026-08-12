import React, { useState, useEffect } from "react";
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
import { Plus, X, Search, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import LogoLoader from "../LogoLoader";

const ManageFacultySections = () => {
  const [faculty, setFaculty] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [newSection, setNewSection] = useState(""); // Will hold "Year - Section" e.g., "12 - STEM"

  const API_URL = import.meta.env.VITE_API_URL;

  // --- 1. FETCH ALL FACULTY AND SECTIONS ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Faculty
        const facultyRes = await fetch(`${API_URL}/api/section-management/all-faculty`, {
          credentials: "include",
        });
        if (facultyRes.ok) {
          const facultyData = await facultyRes.json();
          setFaculty(facultyData);
        }

        // Fetch Available Sections
        const sectionsRes = await fetch(`${API_URL}/api/users/sections`, { 
          credentials: "include" 
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setAvailableSections(sectionsData);
        }
      } catch (error) {
        toast.error("Failed to load data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL]);

  // --- HANDLERS ---
  const handleOpenAssign = (teacher) => {
    setSelectedTeacher(teacher);
    setNewSection("");
    setIsDialogOpen(true);
  };

  // --- 2. ASSIGN A SECTION ---
  const handleAssignSubmit = async () => {
    if (!newSection) return toast.error("Please select a section from the list.");

    // Split the selected string "12 - STEM" into year and section
    const [year, section] = newSection.split(" - ");

    try {
      const res = await fetch(`${API_URL}/api/section-management/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          facultyId: selectedTeacher.id,
          year: year,       // Pass the separated year
          section: section, // Pass the separated section
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Assigned ${newSection} to ${selectedTeacher.name}`);
        
        // Optimistically update the UI to avoid needing a full re-fetch
        setFaculty((prev) =>
          prev.map((f) =>
            f.id === selectedTeacher.id
              ? {
                  ...f,
                  assignedSections: [
                    ...f.assignedSections, 
                    // Add the separated format to the local state
                    { id: data.assignment.id, year, section } 
                  ],
                }
              : f
          )
        );
        setIsDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to assign section");
      }
    } catch (error) {
      toast.error("Network error while assigning section.");
      console.error(error);
    }
  };

  // --- 3. REMOVE A SECTION ---
  const handleRemoveSection = async (teacherId, assignmentId, sectionName) => {
    try {
      const res = await fetch(`${API_URL}/api/section-management/remove/${assignmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.info(`Removed ${sectionName} from assignments.`);
        // Optimistically remove from UI
        setFaculty((prev) =>
          prev.map((f) =>
            f.id === teacherId
              ? {
                  ...f,
                  assignedSections: f.assignedSections.filter((s) => s.id !== assignmentId),
                }
              : f
          )
        );
      } else {
        toast.error("Failed to remove section on server.");
      }
    } catch (error) {
      toast.error("Network error while removing section.");
      console.error(error);
    }
  };

  const filteredFaculty = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className='w-screen h-screen flex justify-center items-center'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>
            Faculty Load Management
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Assign class sections to faculty members to grant them access to records.
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card className='shadow-sm border-slate-200'>
        <CardHeader className='bg-slate-50/50 border-b flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4'>
          <CardTitle className='text-lg text-slate-800 flex items-center gap-2'>
            <GraduationCap className='w-5 h-5 text-indigo-600' />
            Active Instructors
          </CardTitle>
          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <Input
              placeholder='Search by name or email...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 bg-white'
            />
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table className="min-w-[800px]">
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead className='w-[300px] font-semibold pl-6'>
                    Faculty Member
                  </TableHead>
                  <TableHead className='w-[200px] font-semibold'>
                    Email Address
                  </TableHead>
                  <TableHead className='font-semibold'>
                    Assigned Sections
                  </TableHead>
                  <TableHead className='text-right font-semibold pr-6'>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaculty.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center text-muted-foreground py-8'>
                      No faculty found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFaculty.map((teacher) => (
                    <TableRow key={teacher.id} className='hover:bg-slate-50/50'>
                      {/* Name & Avatar */}
                      <TableCell className='font-medium text-slate-800 pl-6'>
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-8 w-8 shrink-0'>
                            <AvatarFallback className='bg-indigo-100 text-indigo-700 text-xs font-bold'>
                              {teacher.name
                                .replace("Dr. ", "")
                                .replace("Prof. ", "")
                                .charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{teacher.name}</span>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className='text-slate-600 text-sm'>
                        {teacher.email}
                      </TableCell>

                      {/* Assigned Sections Tags */}
                      <TableCell>
                        <div className='flex flex-wrap gap-2'>
                          {teacher.assignedSections.length === 0 ? (
                            <span className='text-xs text-muted-foreground italic'>
                              No sections assigned
                            </span>
                          ) : (
                            teacher.assignedSections.map((s) => {
                              // Re-combine year and section for display
                              const displayLabel = s.year ? `${s.year} - ${s.section}` : s.section;
                              
                              return (
                                <Badge
                                  key={s.id}
                                  variant='secondary'
                                  className='bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 whitespace-nowrap'
                                >
                                  {displayLabel}
                                  <button
                                    onClick={() => handleRemoveSection(teacher.id, s.id, displayLabel)}
                                    className='hover:bg-indigo-200 rounded-full p-0.5 transition-colors focus:outline-none'
                                  >
                                    <X className='w-3 h-3 text-indigo-600' />
                                  </button>
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>

                      {/* Action Button */}
                      <TableCell className='text-right pr-6'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleOpenAssign(teacher)}
                          className='text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8 whitespace-nowrap'
                        >
                          <Plus className='w-4 h-4 mr-1.5' /> Assign Section
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- ASSIGN SECTION DIALOG --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] sm:max-w-[425px] rounded-lg'>
          <DialogHeader>
            <DialogTitle>Assign New Section</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-slate-700'>
                Faculty Member
              </label>
              <div className='p-3 bg-slate-50 border rounded-md text-sm text-slate-800 font-medium truncate'>
                {selectedTeacher?.name}
              </div>
            </div>
            
            <div className='space-y-2'>
              <label className='text-sm font-medium text-slate-700'>
                Section Name
              </label>
              
              {/* Standard Select Dropdown */}
              <select
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                autoFocus
              >
                <option value="" disabled>Select a section</option>
                {availableSections.length === 0 ? (
                  <option value="" disabled>No sections available in system</option>
                ) : (
                  availableSections.map((sectionLabel) => (
                    <option key={sectionLabel} value={sectionLabel}>
                      {sectionLabel}
                    </option>
                  ))
                )}
              </select>

              <p className='text-xs text-muted-foreground'>
                Select an existing section from the system to assign to this faculty member.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
            <Button variant='ghost' onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              className='bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto'
              disabled={!newSection}
            >
              Assign Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageFacultySections;