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
  FolderOpen,
  User,
  Clock,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [sortOrder, setSortOrder] = useState("newest"); // New state for sorting

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

  // Filter and Sort materials
  const filteredAndSortedMaterials = materials
    .filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSubject =
        selectedSubject === "ALL" ||
        (item.subject && item.subject.name === selectedSubject);
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      if (sortOrder === "a-z") return a.title.localeCompare(b.title);
      if (sortOrder === "z-a") return b.title.localeCompare(a.title);
      
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      
      if (sortOrder === "newest") return dateB - dateA;
      if (sortOrder === "oldest") return dateA - dateB;
      
      return 0;
    });

  const displaySection =
    user?.year && user.section
      ? `${user.year} - ${user.section}`
      : user?.section || "4 - A";

  const getViewerUrl = (item) => {
    if (!item) return "";
    const ext = item.fileType?.toLowerCase();

    if (ext === "pdf") {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(item.fileUrl)}&embedded=true`;
    }

    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(item.fileUrl)}`;
  };

  return (
    <div className='p-3 sm:p-6 w-full mx-auto space-y-6 animate-in fade-in duration-500'>
      {/* Header & Filters */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4'>
        <div className='w-full'>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>
            Learning Materials
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Access and download course modules, presentations, and documents for section{" "}
            <span className='font-semibold text-slate-700'>
              {displaySection}
            </span>
            .
          </p>
        </div>

        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto'>
          {/* Search Bar */}
          <div className='relative flex-1 w-full sm:w-64'>
            <Search className='absolute left-2.5 top-3 h-4 w-4 text-slate-400' />
            <Input
              placeholder='Search materials...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8 bg-white w-full'
            />
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              className='h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1'
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === "ALL" ? "All Subjects" : subject}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              className='h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1'
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="a-z">Title (A-Z)</option>
              <option value="z-a">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p>Loading materials...</p>
        </div>
      ) : filteredAndSortedMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
          <BookOpen className="h-12 w-12 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">No learning materials found</p>
          <p className="text-sm">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredAndSortedMaterials.map((item) => (
            <Card key={item.id} className="flex flex-col h-full overflow-hidden hover:shadow-md transition-all duration-200 border-slate-200 group">
              <CardHeader className="p-4 bg-slate-50/50 border-b pb-3 space-y-3 flex-shrink-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 bg-pink-50 text-pink-700 px-2 py-1 rounded-md border border-pink-100 font-semibold text-[10px] tracking-wider uppercase">
                    <FileText className="w-3 h-3" />
                    {item.fileType || "FILE"}
                  </div>
                  {item.createdAt && (
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg leading-tight font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                <p className="text-sm text-slate-500 line-clamp-3 flex-1">
                  {item.description || "No description provided."}
                </p>
                
                <div className="space-y-1.5 mt-2 pt-3 border-t border-slate-100 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{item.subject?.name || "General"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{item.faculty?.name || "Instructor"}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0 gap-2 shrink-0 border-t border-slate-100 bg-slate-50/50 flex-col sm:flex-row mt-auto">
                <Button
                  variant="outline"
                  className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 h-9"
                  onClick={() => setPreviewItem(item)}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 h-9"
                  onClick={() => window.open(item.fileUrl, "_blank")}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* --- RESPONSIVE FULLSCREEN VIEWER MODAL --- */}
      <Dialog
        open={!!previewItem}
        onOpenChange={() => {
          setPreviewItem(null);
          setIsFullscreen(false);
        }}
      >
        <DialogContent
          className={`flex flex-col bg-white transition-all duration-300 p-3 sm:p-6 ${
            isFullscreen
              ? "w-screen max-w-none h-screen rounded-none m-0 border-0"
              : "w-[100vw] max-w-[100vw] sm:w-[95vw] sm:max-w-[95vw] h-[100dvh] sm:h-[92vh] rounded-none sm:rounded-lg"
          }`}
        >
          <DialogHeader className='flex flex-row items-center justify-between pb-2 sm:pb-3 border-b space-y-0'>
            <DialogTitle className='text-sm sm:text-lg font-bold text-slate-800 truncate pr-2 flex-1'>
              {previewItem?.title}
            </DialogTitle>

            {/* Modal Controls */}
            <div className='flex items-center gap-1 sm:gap-2 shrink-0'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setIsFullscreen(!isFullscreen)}
                className='hidden sm:flex h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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

          <div className='flex-1 w-full h-full bg-slate-50/50 rounded-lg overflow-hidden border mt-2'>
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