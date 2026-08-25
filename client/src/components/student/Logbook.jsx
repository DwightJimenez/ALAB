import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  PanelLeft,
  Save,
  Printer,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSelector } from "react-redux";
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

// Helper to generate unique IDs for log entries
const generateId = () => Math.random().toString(36).substring(2, 9);

const emptyEntry = () => ({
  id: generateId(),
  date: "",
  timeFrom: "",
  timeTo: "",
  hours: "",
  venue: "",
  activity: "",
});

const Logbook = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

  const saveTimeoutRef = useRef(null);

  // Fetch pages on load
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/logbook`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const parsedData = data.map((page) => {
            let parsedContent = [];
            if (Array.isArray(page.content)) {
              if (page.content[0]?.type === "paragraph") {
                parsedContent = [emptyEntry()]; // Wipe legacy rich-text
              } else {
                parsedContent = page.content;
              }
            } else if (typeof page.content === "string") {
              try {
                parsedContent = JSON.parse(page.content);
              } catch (e) {
                parsedContent = [emptyEntry()];
              }
            } else {
              parsedContent = [emptyEntry()];
            }
            return { ...page, content: parsedContent };
          });

          setPages(parsedData);
          if (parsedData.length > 0) setActivePageId(parsedData[0].id);
        } else {
          toast.error("Failed to load logbook pages.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error loading logbook.");
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [API_URL]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const activePage = pages.find((p) => p.id === activePageId);

  // Auto-save logic
  const triggerAutoSave = useCallback((pageData) => {
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/logbook/${pageData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: pageData.title, // 'title' acts as the Subject
            content: pageData.content,
          }),
        });
        if (!response.ok) throw new Error("Save failed");
      } catch (err) {
        console.error("Save failed", err);
        toast.error("Failed to sync changes.");
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [API_URL]);

  const handleUpdateEntry = (entryId, field, value) => {
    let updatedPage = null;
    setPages((prevPages) => {
      return prevPages.map((p) => {
        if (p.id !== activePageId) return p;
        const newContent = p.content.map((entry) =>
          entry.id === entryId ? { ...entry, [field]: value } : entry
        );
        updatedPage = { ...p, content: newContent };
        return updatedPage;
      });
    });
    if (updatedPage) triggerAutoSave(updatedPage);
  };

  const handleAddRow = () => {
    let updatedPage = null;
    setPages((prevPages) => {
      return prevPages.map((p) => {
        if (p.id !== activePageId) return p;
        const newContent = [...p.content, emptyEntry()];
        updatedPage = { ...p, content: newContent };
        return updatedPage;
      });
    });
    if (updatedPage) triggerAutoSave(updatedPage);
  };

  const handleDeleteRow = (entryId) => {
    let updatedPage = null;
    setPages((prevPages) => {
      return prevPages.map((p) => {
        if (p.id !== activePageId) return p;
        const newContent = p.content.filter((entry) => entry.id !== entryId);
        if (newContent.length === 0) newContent.push(emptyEntry());
        updatedPage = { ...p, content: newContent };
        return updatedPage;
      });
    });
    if (updatedPage) triggerAutoSave(updatedPage);
  };

  // Maps the subject input directly to the title field to ensure saving and sidebar matching
  const handleSubjectChange = (newSubject) => {
    let updatedPage = null;
    setPages((prevPages) => {
      return prevPages.map((p) => {
        if (p.id !== activePageId) return p;
        updatedPage = { ...p, title: newSubject };
        return updatedPage;
      });
    });
    if (updatedPage) triggerAutoSave(updatedPage);
  };

  const handleManualSave = () => {
    if (!activePage) return;
    triggerAutoSave(activePage);
    toast.success("Logbook saved manually");
  };

  const handlePrint = () => {
    if (!activePage) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    triggerAutoSave(activePage);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSelectPage = (id) => {
    if (id === activePageId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(false);
    setActivePageId(id);
  };

  const handleAddPage = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "New Subject", // Defaults to "New Subject" instead of "Activity Logbook"
          content: [emptyEntry()],
        }),
      });

      if (res.ok) {
        const newPage = await res.json();
        if (typeof newPage.content === "string") {
            try { newPage.content = JSON.parse(newPage.content); } 
            catch { newPage.content = [emptyEntry()]; }
        }
        setPages([newPage, ...pages]);
        setActivePageId(newPage.id);
        toast.success("New page created.");
      }
    } catch (err) {
      toast.error("Failed to create page.");
    }
  };

  const confirmDelete = async () => {
    if (!pageToDelete) return;
    try {
      const res = await fetch(`${API_URL}/api/logbook/${pageToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const remaining = pages.filter((p) => p.id !== pageToDelete);
        setPages(remaining);
        if (activePageId === pageToDelete) {
          setActivePageId(remaining.length > 0 ? remaining[0].id : null);
        }
        toast.success("Page deleted successfully.");
      } else {
        toast.error("Failed to delete page.");
      }
    } catch (err) {
      toast.error("An error occurred while deleting.");
    } finally {
      setPageToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center bg-white'>
        <Loader2 className='w-6 h-6 animate-spin text-zinc-500' />
      </div>
    );
  }

  return (
    <div className='flex h-screen w-full bg-zinc-50 text-zinc-900 overflow-hidden font-sans'>
      
      {/* SHADCN ALERT DIALOG */}
      <AlertDialog open={!!pageToDelete} onOpenChange={(open) => !open && setPageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your logbook page and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPageToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRINT CSS */}
      <style>
        {`
          @media print {
            @page { size: landscape; margin: 10mm; }
            body * { visibility: hidden !important; }
            #print-area, #print-area * { visibility: visible !important; }
            #print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            .hide-on-print { display: none !important; }
            
            /* Style inputs to look like plain text for printing */
            input, textarea {
              border: none !important;
              background: transparent !important;
              resize: none !important;
              padding: 0 !important;
              margin: 0 !important;
              font-family: inherit !important;
            }
            
            /* Ensure table borders print clearly */
            table { border-collapse: collapse !important; width: 100% !important; }
            th, td { border: 1px solid #000 !important; padding: 8px !important; font-size: 12px !important; }
          }
        `}
      </style>

      {/* SIDEBAR */}
      <aside
        className={`flex-shrink-0 border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 hide-on-print ${
          isSidebarOpen ? "w-64" : "w-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className='flex h-14 items-center justify-between px-4 border-b border-zinc-200/60'>
          <span className='font-semibold text-sm truncate text-zinc-900'>
            ALAB Logbook
          </span>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsSidebarOpen(false)}
            className='h-8 w-8 text-zinc-500 hover:text-zinc-900'
          >
            <PanelLeft className='w-4 h-4' />
          </Button>
        </div>

        <div className='flex-1 overflow-y-auto py-4 px-3 space-y-6'>
          <div className='space-y-2'>
            <div className='flex justify-between items-center px-1'>
              <span className='text-xs font-semibold text-zinc-500'>
                Private Logbooks
              </span>
              <div className='flex items-center gap-2'>
                {isSaving && (
                  <span className='text-[10px] text-zinc-500 font-medium animate-pulse'>
                    Saving...
                  </span>
                )}
                <button
                  onClick={handleAddPage}
                  className='p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors'
                  title='Create New Page'
                >
                  <Plus className='w-3.5 h-3.5' />
                </button>
              </div>
            </div>

            <nav className='space-y-0.5'>
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page.id)}
                  className={`w-full group flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                    activePageId === page.id
                      ? "bg-zinc-200/60 text-zinc-900 font-medium"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <div className='flex items-center gap-2 truncate flex-1'>
                    <FileText className='w-4 h-4 text-zinc-500 shrink-0' />
                    <span className='truncate text-left flex-1'>
                      {/* Displays Subject since subject is mapped to title */}
                      {page.title || "Untitled Subject"}
                    </span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageToDelete(page.id);
                    }}
                    className='opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-300/50 hover:text-red-600 text-zinc-400 transition-all'
                    title='Delete page'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className='p-3 border-t border-zinc-200/60'>
          <Button
            onClick={handleAddPage}
            variant='ghost'
            className='w-full justify-start text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 gap-2 h-9'
          >
            <Plus className='w-4 h-4' /> New Subject
          </Button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className='flex-1 flex flex-col h-screen overflow-y-auto relative bg-zinc-50/50'>
        {!isSidebarOpen && (
          <div className='sticky top-3 left-3 z-30 hide-on-print w-min'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => setIsSidebarOpen(true)}
              className='h-8 w-8 text-zinc-500 bg-white hover:text-zinc-900 shadow-sm'
              title='Toggle Sidebar'
            >
              <PanelLeft className='w-4 h-4' />
            </Button>
          </div>
        )}

        <div
          id='print-area'
          className='w-full max-w-[1400px] mx-auto px-4 sm:px-8 md:px-12 py-10 flex-1'
        >
          {activePage ? (
            <div className="bg-white p-8 md:p-12 shadow-sm border border-zinc-200 rounded-xl">
              
              {/* Toolbar */}
              <div className='mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-zinc-100 pb-6'>
                <div className="flex-1 w-full space-y-4">
                  <h1 className='w-full text-3xl font-extrabold text-zinc-900'>
                    Laboratory Logbook
                  </h1>
                  
                  {/* Pre-filled Student Details & Interactive Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-zinc-700">
                    <p><span className="font-semibold">Name:</span> {user?.name || "__________________"}</p>
                    <p><span className="font-semibold">Year & Section:</span> {user?.year || "___"} - {user?.section || "___"}</p>
                    <p className="flex items-center gap-2">
                        <span className="font-semibold whitespace-nowrap">Subject:</span>
                        {/* Interactive input for screen */}
                        <input 
                            type="text"
                            value={activePage.title || ""}
                            onChange={(e) => handleSubjectChange(e.target.value)} 
                            className="w-full border-b border-zinc-300 bg-transparent outline-none focus:border-zinc-500 px-1 py-0.5 hide-on-print text-zinc-900 font-medium" 
                            placeholder="Enter subject name..."
                        />
                        {/* Text display for print */}
                        <span className="hidden print:inline border-b border-black w-full min-w-[200px] pb-1">
                            {activePage.title || "\u00A0"}
                        </span>
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-2 shrink-0 hide-on-print mt-2 md:mt-0'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleManualSave}
                    disabled={isSaving}
                    className='w-24 text-zinc-600 bg-white'
                  >
                    {isSaving ? (
                      <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    ) : (
                      <Save className='w-4 h-4 mr-2' />
                    )}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>

                  <Button
                    variant='default'
                    size='sm'
                    onClick={handlePrint}
                    className='bg-zinc-900 text-white hover:bg-zinc-800'
                  >
                    <Printer className='w-4 h-4 mr-2' />
                    Print
                  </Button>
                </div>
              </div>

              {/* Structured Logbook Table */}
              <div className="overflow-x-auto rounded-lg border border-zinc-200 print:border-none">
                <table className="w-full text-sm text-left border-collapse min-w-[900px]">
                  <thead className="bg-zinc-100/80 text-zinc-700 font-semibold border-b border-zinc-200 print:bg-transparent">
                    <tr>
                      <th className="p-3 border-r border-zinc-200 w-28">Date</th>
                      <th className="p-3 border-r border-zinc-200 w-36">Time (From - To)</th>
                      <th className="p-3 border-r border-zinc-200 w-20">Hours</th>
                      <th className="p-3 border-r border-zinc-200 w-48">Venue</th>
                      <th className="p-3 border-r border-zinc-200 min-w-[200px]">Activity</th>
                      <th className="p-3 border-r border-zinc-200 w-32 text-center text-xs print:text-sm">Student Sig.</th>
                      <th className="p-3 border-r border-zinc-200 w-32 text-center text-xs print:text-sm">Supervisor Sig.</th>
                      <th className="p-3 w-32 text-center text-xs print:text-sm">Auth Person Sig.</th>
                      <th className="p-2 w-12 text-center hide-on-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {Array.isArray(activePage.content) && activePage.content.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-50/50 transition-colors group">
                        <td className="border-r border-zinc-200 p-0 align-top">
                          <input
                            type="date"
                            value={entry.date || ""}
                            onChange={(e) => handleUpdateEntry(entry.id, "date", e.target.value)}
                            className="w-full h-full min-h-[44px] p-2 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-zinc-400"
                          />
                        </td>
                        <td className="border-r border-zinc-200 p-0 align-top">
                          <div className="flex flex-col h-full">
                            <input
                              type="time"
                              value={entry.timeFrom || ""}
                              onChange={(e) => handleUpdateEntry(entry.id, "timeFrom", e.target.value)}
                              className="w-full p-1.5 text-xs bg-transparent outline-none focus:bg-white border-b border-dashed border-zinc-200"
                            />
                            <input
                              type="time"
                              value={entry.timeTo || ""}
                              onChange={(e) => handleUpdateEntry(entry.id, "timeTo", e.target.value)}
                              className="w-full p-1.5 text-xs bg-transparent outline-none focus:bg-white"
                            />
                          </div>
                        </td>
                        <td className="border-r border-zinc-200 p-0 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={entry.hours || ""}
                            onChange={(e) => handleUpdateEntry(entry.id, "hours", e.target.value)}
                            className="w-full h-full min-h-[44px] p-2 bg-transparent outline-none focus:bg-white text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="border-r border-zinc-200 p-0 align-top">
                          <textarea
                            value={entry.venue || ""}
                            onChange={(e) => handleUpdateEntry(entry.id, "venue", e.target.value)}
                            className="w-full h-full min-h-[60px] p-2 bg-transparent outline-none focus:bg-white resize-none"
                            placeholder="Location..."
                          />
                        </td>
                        <td className="border-r border-zinc-200 p-0 align-top">
                          <textarea
                            value={entry.activity || ""}
                            onChange={(e) => handleUpdateEntry(entry.id, "activity", e.target.value)}
                            className="w-full h-full min-h-[60px] p-2 bg-transparent outline-none focus:bg-white resize-y"
                            placeholder="Describe activity..."
                          />
                        </td>
                        {/* Physical signature boxes (blank for printing) */}
                        <td className="border-r border-zinc-200 p-2 align-bottom text-center text-zinc-300">
                          <div className="h-full min-h-[60px] border-b border-dashed border-zinc-300 w-4/5 mx-auto"></div>
                        </td>
                        <td className="border-r border-zinc-200 p-2 align-bottom text-center">
                          <div className="h-full min-h-[60px] border-b border-dashed border-zinc-300 w-4/5 mx-auto"></div>
                        </td>
                        <td className="p-2 align-bottom text-center">
                          <div className="h-full min-h-[60px] border-b border-dashed border-zinc-300 w-4/5 mx-auto"></div>
                        </td>
                        <td className="p-2 align-middle text-center hide-on-print">
                          <button
                            onClick={() => handleDeleteRow(entry.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove row"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Add Row Button */}
              <div className="mt-4 hide-on-print flex justify-center">
                <Button 
                    onClick={handleAddRow} 
                    variant="outline" 
                    className="w-full max-w-sm border-dashed border-2 text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry Row
                </Button>
              </div>

            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-full text-zinc-500 gap-3 hide-on-print'>
              <p>No pages found. Select or create a page to start writing.</p>
              <Button onClick={handleAddPage} variant='outline' size='sm'>
                <Plus className='w-4 h-4 mr-2' /> Create First Subject
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Logbook;