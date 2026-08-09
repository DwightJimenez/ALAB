import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  BookOpen,
  Search,
  Eye,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { useSelector } from "react-redux";

const LearningMaterials = () => {
  const { user } = useSelector((state) => state.auth);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");

  // State for document preview modal & fullscreen toggle
  const [previewItem, setPreviewItem] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // --- Fetch Materials for Student's Section ---
  const fetchStudentMaterials = async () => {
    const studentSection =
      user?.year && user.section
        ? `${user.year} - ${user.section}`
        : user?.section || "4 - A";

    try {
      const response = await fetch(
        `${API_URL}/api/learning-materials/${encodeURIComponent(studentSection)}`,
        {
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMaterials(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Could not fetch learning materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudentMaterials();
    }
  }, [user]);

  // Extract unique subjects dynamically from available materials
  const uniqueSubjects = [
    "ALL",
    ...new Set(materials.map((m) => m.subject?.name).filter(Boolean)),
  ];

  // Filter materials based on search query and selected subject
  const filteredMaterials = materials.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject =
      selectedSubject === "ALL" ||
      (item.subject && item.subject.name === selectedSubject);
    return matchesSearch && matchesSubject;
  });

  const displaySection =
    user?.year && user.section
      ? `${user.year} - ${user.section}`
      : user?.section || "4 - A";

  // Helper to determine viewer URL (PDFs use direct URL, Word/PPT use Microsoft Office Viewer)
  const getViewerUrl = (item) => {
    if (!item) return "";
    const ext = item.fileType?.toLowerCase();
    if (ext === "pdf") {
      return item.fileUrl;
    }
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(item.fileUrl)}`;
  };

  return (
    <div className='p-4 sm:p-6 w-full mx-auto space-y-6 animate-in fade-in duration-500'>
      {/* Header & Filters */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>
            Learning Materials
          </h1>
          <p className='text-sm text-muted-foreground'>
            Access and download course modules, presentations, and documents for
            section{" "}
            <span className='font-semibold text-slate-700'>
              {displaySection}
            </span>
            .
          </p>
        </div>

        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto'>
          {/* Search Bar */}
          <div className='relative flex-1 sm:w-64'>
            <Search className='absolute left-2.5 top-3 h-4 w-4 text-slate-400' />
            <Input
              placeholder='Search materials...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8 bg-white'
            />
          </div>

          {/* Subject Filter Dropdown */}
          <select
            className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {uniqueSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject === "ALL" ? "All Subjects" : subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table Card */}
      <Card className='shadow-sm border-slate-200'>
        <CardHeader className='bg-slate-50/50 border-b py-4'>
          <CardTitle className='text-lg text-slate-800'>
            Published Documents & Modules
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead className='w-[60px]'>Type</TableHead>
                  <TableHead>Title & Description</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='h-24 text-center text-slate-500'
                    >
                      Loading materials...
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='h-24 text-center text-slate-500'
                    >
                      No learning materials available for your section yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((item) => (
                    <TableRow key={item.id} className='hover:bg-slate-50/50'>
                      <TableCell>
                        <div className='h-10 w-10 bg-pink-50 text-pink-700 rounded-md flex items-center justify-center font-bold text-xs uppercase border border-pink-100'>
                          {item.fileType || "FILE"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='font-semibold text-slate-800'>
                          {item.title}
                        </div>
                        <div className='text-xs text-slate-500 truncate max-w-xs sm:max-w-md'>
                          {item.description || "No description provided."}
                        </div>
                      </TableCell>
                      <TableCell className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                        {item.subject?.name || "General"}
                      </TableCell>
                      <TableCell className='text-sm text-slate-600 whitespace-nowrap'>
                        {item.faculty?.name || "Instructor"}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-1.5 sm:gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setPreviewItem(item)}
                            className='text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white h-8 px-2.5 sm:px-3 text-xs'
                          >
                            <Eye className='w-3.5 h-3.5 sm:mr-1' />
                            <span className='hidden sm:inline'>View</span>
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => window.open(item.fileUrl, "_blank")}
                            className='text-blue-600 border-blue-200 hover:bg-blue-50 bg-white h-8 px-2.5 sm:px-3 text-xs'
                          >
                            <Download className='w-3.5 h-3.5 sm:mr-1' />
                            <span className='hidden sm:inline'>Download</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- RESPONSIVE FULLSCREEN VIEWER MODAL --- */}
      <Dialog
        open={!!previewItem}
        onOpenChange={() => {
          setPreviewItem(null);
          setIsFullscreen(false);
        }}
      >
        <DialogContent
          className={`flex flex-col bg-white transition-all duration-300 p-4 sm:p-6 ${
            isFullscreen
              ? "w-screen max-w-none h-screen rounded-none m-0 border-0"
              : "w-[98vw] max-w-[98vw] sm:w-[95vw] sm:max-w-[95vw] h-[95vh] sm:h-[92vh] rounded-lg"
          }`}
        >
          <DialogHeader className='flex flex-row items-center justify-between pb-3 border-b space-y-0'>
            <DialogTitle className='text-base sm:text-lg font-bold text-slate-800 truncate pr-4 flex-1'>
              {previewItem?.title}
            </DialogTitle>

            {/* Modal Controls */}
            <div className='flex items-center gap-2 shrink-0'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setIsFullscreen(!isFullscreen)}
                className='h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
              >
                {isFullscreen ? (
                  <Minimize2 className='w-4 h-4' />
                ) : (
                  <Maximize2 className='w-4 h-4' />
                )}
              </Button>
            </div>
          </DialogHeader>

          <div className='flex-1 w-full h-full bg-slate-100 rounded-lg overflow-hidden border mt-2'>
            {previewItem && (
              <iframe
                src={getViewerUrl(previewItem)}
                className='w-full h-full border-0'
                title={previewItem.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearningMaterials;
