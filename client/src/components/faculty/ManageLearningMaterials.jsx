import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  X,
  UploadCloud,
  Loader2,
  FileText,
  Trash2,
  Download,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createClient } from "@supabase/supabase-js";
import { useSelector } from "react-redux";

// Initialize Supabase Client strictly for Storage
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ManageLearningMaterials = () => {
  const { user } = useSelector((state) => state.auth);

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // --- Subject & Section State ---
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Store the raw file locally until form submission
  const [selectedFile, setSelectedFile] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const getInitialForm = () => {
    const matchedSubj = availableSubjects.find(
      (s) => s.name === selectedSubject,
    );
    return {
      title: "",
      description: "",
      yearAndSection: selectedSection || availableSections[0] || "",
      subjectId: matchedSubj ? matchedSubj.id : "",
      fileName: "",
      fileType: "",
    };
  };

  const [formData, setFormData] = useState(getInitialForm());

  // --- 1. Fetch Subjects & Sections on Mount ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;
      try {
        const subjectRes = await fetch(`${API_URL}/api/subjects`, {
          credentials: "include",
        });
        if (subjectRes.ok) {
          const subjectData = await subjectRes.json();
          setAvailableSubjects(subjectData);
          if (subjectData.length > 0) setSelectedSubject(subjectData[0].name);
        }

        const sectionRes = await fetch(
          `${API_URL}/api/class-management/available-sections/${user.id}`,
          { credentials: "include" },
        );
        if (sectionRes.ok) {
          const sectionData = await sectionRes.json();
          setAvailableSections(sectionData);
          if (sectionData.length > 0) setSelectedSection(sectionData[0]);
        }
      } catch (error) {
        toast.error("Failed to load initial dropdown data.");
        console.error(error);
      }
    };

    fetchInitialData();
  }, [user?.id, API_URL]);

  // --- 2. Fetch Materials when Subject or Section changes ---
  const fetchMaterials = async () => {
    if (!selectedSection) return;
    try {
      const response = await fetch(
        `${API_URL}/api/learning-materials/${encodeURIComponent(selectedSection)}`,
        {
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const filtered = selectedSubject
        ? data.filter((m) => !m.subject || m.subject.name === selectedSubject)
        : data;

      setMaterials(filtered || []);
    } catch (err) {
      console.error(err);
      toast.error("Could not fetch learning materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSection) {
      fetchMaterials();
    }
  }, [selectedSection, selectedSubject]);

  // --- LOCAL FILE SELECTION (No immediate upload) ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedTypes.includes(file.type)) {
      return toast.error(
        "Invalid file format. Please upload PDF, Word, or PowerPoint files.",
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return toast.error("File size must be smaller than 25MB.");
    }

    const fileExt = file.name.split(".").pop();
    setSelectedFile(file);
    setFormData((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: fileExt.toUpperCase(),
    }));

    toast.success("File attached. Ready to publish!");
  };

  // --- CREATE Logic: Uploads to Supabase THEN saves to Backend on Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile)
      return toast.error("Please attach a learning material file.");
    if (!formData.subjectId) return toast.error("Please select a subject.");
    if (!formData.yearAndSection)
      return toast.error("Please select a target section.");

    setIsUploading(true);

    try {
      // 1. Upload file to Supabase Storage right when Publish is clicked
      const fileExt = selectedFile.name.split(".").pop();
      const fileNameClean = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = fileNameClean;

      const { error: uploadError } = await supabase.storage
        .from("learning-materials")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("learning-materials")
        .getPublicUrl(filePath);

      const fileUrl = data.publicUrl;

      // 2. Send metadata + public URL to your Express Backend
      const response = await fetch(`${API_URL}/api/learning-materials/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          fileUrl: fileUrl,
          fileType: formData.fileType,
          yearAndSection: formData.yearAndSection,
          subjectId: formData.subjectId,
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);

      toast.success("Learning material published successfully!");
      setIsModalOpen(false);
      setFormData(getInitialForm());
      setSelectedFile(null);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to publish learning material.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- DELETE Logic ---
  const openDeleteModal = (material) => {
    setSelectedMaterial(material);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMaterial) return;

    try {
      const response = await fetch(
        `${API_URL}/api/learning-materials/${selectedMaterial.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success("Material deleted successfully!");
      setIsDeleteModalOpen(false);
      setSelectedMaterial(null);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete material.");
    }
  };

  return (
    <div className='bg-white p-6 m-5 rounded-lg border-2 w-full space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-slate-900'>
            Learning Materials
          </h2>
          <p className='text-sm text-slate-500'>
            Upload and manage course documents, modules, and presentations.
          </p>
        </div>

        {/* Filters and Upload Trigger */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* HEADER SUBJECT DROPDOWN */}
          <div className='flex items-center gap-2 bg-white border border-input rounded-md px-3 py-1 shadow-sm'>
            <BookOpen className='w-4 h-4 text-slate-400' />
            <select
              className='h-8 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer'
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={availableSubjects.length === 0}
            >
              {availableSubjects.length === 0 ? (
                <option value=''>No subjects found</option>
              ) : (
                availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* HEADER SECTION DROPDOWN */}
          <select
            className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'
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

          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (open) {
                setFormData(getInitialForm());
                setSelectedFile(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className='bg-pink-600 hover:bg-pink-700 text-white'>
                <Plus className='w-4 h-4 mr-2' /> Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[600px] bg-white'>
              <DialogHeader>
                <DialogTitle className='text-xl text-pink-600'>
                  Upload Learning Material
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
                <div className='space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase'>
                    Material Title *
                  </label>
                  <Input
                    required
                    placeholder='e.g., Module 1: Introduction to Chemistry'
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className='grid grid-cols-12 gap-4'>
                  {/* Target Section Dropdown inside Modal */}
                  <div className='col-span-12 sm:col-span-6 space-y-2'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Target Section *
                    </label>
                    <select
                      className='w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'
                      value={formData.yearAndSection}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yearAndSection: e.target.value,
                        })
                      }
                      required
                    >
                      <option value=''>Select Section</option>
                      {availableSections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Dropdown inside Modal */}
                  <div className='col-span-12 sm:col-span-6 space-y-2'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Subject *
                    </label>
                    <select
                      className='w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'
                      value={formData.subjectId}
                      onChange={(e) =>
                        setFormData({ ...formData, subjectId: e.target.value })
                      }
                      required
                    >
                      <option value=''>Select Subject</option>
                      {availableSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase'>
                    Description (Optional)
                  </label>
                  <Textarea
                    placeholder='Brief overview of the material...'
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase'>
                    Attachment (PDF, Word, PPT) *
                  </label>
                  <div className='flex items-center gap-4'>
                    {formData.fileName ? (
                      <div className='flex items-center justify-between flex-1 p-3 rounded-md border bg-slate-50'>
                        <div className='flex items-center gap-2 truncate'>
                          <FileText className='w-5 h-5 text-pink-600 shrink-0' />
                          <span className='text-sm font-medium truncate'>
                            {formData.fileName}
                          </span>
                        </div>
                        <button
                          type='button'
                          onClick={() => {
                            setSelectedFile(null);
                            setFormData({
                              ...formData,
                              fileName: "",
                              fileType: "",
                            });
                          }}
                          className='text-red-500 hover:text-red-700 p-1'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    ) : (
                      <div className='flex-1'>
                        <Input
                          type='file'
                          accept='.pdf,.doc,.docx,.ppt,.pptx'
                          onChange={handleFileSelect}
                          disabled={isUploading}
                          className='file:text-pink-600 file:bg-pink-50 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-sm file:font-semibold hover:file:bg-pink-100 cursor-pointer'
                        />
                      </div>
                    )}
                    {isUploading && (
                      <Loader2 className='w-5 h-5 animate-spin text-pink-600' />
                    )}
                  </div>
                </div>

                <div className='flex justify-end pt-4 space-x-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => setIsModalOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={isUploading || !selectedFile}
                    className='bg-pink-600 hover:bg-pink-700 text-white'
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />{" "}
                        Publishing...
                      </>
                    ) : (
                      "Publish Material"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader className='bg-slate-50'>
            <TableRow>
              <TableHead className='w-[60px]'>Type</TableHead>
              <TableHead>Title & Description</TableHead>
              <TableHead>Target Section</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-slate-500'
                >
                  No learning materials uploaded for {selectedSection} under{" "}
                  {selectedSubject || "selected subject"}.
                </TableCell>
              </TableRow>
            ) : (
              materials.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className='h-10 w-10 bg-pink-50 text-pink-700 rounded-md flex items-center justify-center font-bold text-xs uppercase border border-pink-100'>
                      {item.fileType || "FILE"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='font-semibold text-slate-800'>
                      {item.title}
                    </div>
                    <div className='text-xs text-slate-500 truncate max-w-md'>
                      {item.description || "No description provided."}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className='px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700'>
                      {item.yearAndSection}
                    </span>
                  </TableCell>
                  <TableCell className='text-sm text-slate-600 font-medium'>
                    {item.subject?.name || "General"}
                  </TableCell>
                  <TableCell className='text-sm text-slate-600'>
                    {item.faculty?.name || "Faculty"}
                  </TableCell>
                  <TableCell className='text-right space-x-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => window.open(item.fileUrl, "_blank")}
                      className='text-blue-600 border-blue-200 hover:bg-blue-50'
                    >
                      <Download className='w-3.5 h-3.5 mr-1' /> View
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => openDeleteModal(item)}
                      className='text-red-600 hover:bg-red-50'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600'>
              Delete Material
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-700'>
              Are you sure you want to delete{" "}
              <strong>{selectedMaterial?.title}</strong>? This will permanently
              remove the file link for students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              Yes, Delete Material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageLearningMaterials;
