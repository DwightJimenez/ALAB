import React, { useState, useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  PanelLeft,
  Save,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
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

const Logbook = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Shadcn Delete Alert
  const [pageToDelete, setPageToDelete] = useState(null);

  const saveTimeoutRef = useRef(null);
  const isSwitchingPageRef = useRef(false);

  const editor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: "" }],
  });

  const activePage = pages.find((p) => p.id === activePageId);

  const user = useSelector((state) => state.auth.user);
  const defaultMarkdown = `**
**Name of the Student: ${user?.name || ""}**
**Year & Section: ${user?.year || ""} - ${user?.section || ""}**
**Subject:

| Date | Time (from-to) | Hour | Venue | Activity | Signature of the Student with date | Signature of Supervisor with date | Signature of the Authorized Person with date |
| ---- | -------------- | ---- | ----- | -------- | ---------------------------------- | --------------------------------- | -------------------------------------------- |
|      |                |      |       |          |                                    |                                   |                                              |
|      |                |      |       |          |                                    |                                   |                                              |
|      |                |      |       |          |                                    |                                   |                                              |
`;

  // Fetch pages on load
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/logbook`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setPages(data);
            setActivePageId(data[0].id);
          } else {
            setPages([]);
            setActivePageId(null);
          }
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

  // Synchronize editor content when active page changes
  useEffect(() => {
    if (activePage && editor) {
      isSwitchingPageRef.current = true;

      const loadContent = async () => {
        try {
          // If the page has content, load it. Otherwise, parse the default markdown table layout.
          if (activePage.content && activePage.content.length > 0) {
            editor.replaceBlocks(editor.document, activePage.content);
          } else {
            const defaultBlocks =
              await editor.tryParseMarkdownToBlocks(defaultMarkdown);
            editor.replaceBlocks(editor.document, defaultBlocks);
          }
        } catch (err) {
          console.error("Failed to update editor content", err);
        } finally {
          setTimeout(() => {
            isSwitchingPageRef.current = false;
          }, 50);
        }
      };

      loadContent();
    }
  }, [activePageId, editor]);

  // Auto-save: Track content changes and trigger a debounced save to backend
  const handleEditorChange = () => {
    if (!activePage || !editor || isSwitchingPageRef.current) return;

    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const pageId = activePage.id;
    saveTimeoutRef.current = setTimeout(async () => {
      await saveContent(pageId);
    }, 1500);
  };

  const saveContent = async (pageId = activePageId) => {
    if (!pageId || !editor) return false;
    try {
      const jsonContent = editor.document;
      const response = await fetch(`${API_URL}/api/logbook/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: jsonContent }),
      });

      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      return true;
    } catch (err) {
      console.error("Save failed", err);
      toast.error("Failed to save changes.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    await saveContent();
    toast.success("Logbook saved");
  };

  const handlePrint = () => {
    // Forcing save before print to ensure the print view is up to date
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveContent().then(() => {
      window.print();
    });
  };

  const handleSelectPage = (id) => {
    if (id === activePageId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(false);
    setActivePageId(id);
  };

  const handleAddPage = async () => {
    try {
      // Parse markdown to blocks before sending to backend
      let initialBlocks = [{ type: "paragraph", content: "" }];
      if (editor) {
        initialBlocks = await editor.tryParseMarkdownToBlocks(defaultMarkdown);
      }

      const res = await fetch(`${API_URL}/api/logbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "Activity Logbook",
          content: initialBlocks,
        }),
      });

      if (res.ok) {
        const newPage = await res.json();
        setPages([newPage, ...pages]);
        setActivePageId(newPage.id);
        toast.success("New page created.");
      }
    } catch (err) {
      toast.error("Failed to create page.");
    }
  };

  const handleTitleChange = async (newTitle) => {
    if (!activePage) return;
    const updatedTitle = newTitle || "Untitled";

    setPages(
      pages.map((p) =>
        p.id === activePage.id ? { ...p, title: updatedTitle } : p,
      )
    );

    try {
      await fetch(`${API_URL}/api/logbook/${activePage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: updatedTitle }),
      });
    } catch (err) {
      console.error("Failed to update title", err);
    }
  };

  // Function called when the user confirms deletion in the dialog
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
      setPageToDelete(null); // Close the modal
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
    <div className='flex h-screen w-full bg-white text-zinc-900 overflow-hidden font-sans'>
      
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

      {/* NUCLEAR PRINT CSS */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-area, #print-area * {
              visibility: visible !important;
            }
            #print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 20px !important;
            }
            /* Hide the BlockNote floating menus and our own buttons */
            .bn-ui-container, .bn-side-menu, .bn-inline-menu, .hide-on-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* SIDEBAR */}
      <aside
        className={`flex-shrink-0 border-r border-zinc-200 bg-zinc-50/80 transition-all duration-300 ease-in-out flex flex-col ${
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
                      {page.title}
                    </span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageToDelete(page.id); // Trigger the shadcn modal
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
            <Plus className='w-4 h-4' /> New Page
          </Button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className='flex-1 flex flex-col h-screen overflow-y-auto bg-white relative'>
        {!isSidebarOpen && (
          <div className='absolute top-3 left-3 z-30 hide-on-print'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsSidebarOpen(true)}
              className='h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              title='Toggle Sidebar'
            >
              <PanelLeft className='w-4 h-4' />
            </Button>
          </div>
        )}

        {/* THIS DIV IS THE ONLY THING THAT PRINTS */}
        <div
          id='print-area'
          className='w-full mx-auto px-8 md:px-12 py-16 flex-1'
        >
          {activePage ? (
            <>
              {/* Header */}
              <div className='mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4'>
                <input
                  type='text'
                  value={activePage.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className='w-full text-3xl font-extrabold text-zinc-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-zinc-300'
                  placeholder='Untitled'
                  disabled
                />

                {/* Print & Save Buttons - explicitly given hide-on-print class */}
                <div className='flex items-center gap-2 shrink-0 hide-on-print'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleManualSave}
                    disabled={isSaving}
                    className='w-24 flex items-center justify-center text-zinc-600'
                  >
                    {isSaving ? (
                      <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    ) : (
                      <Save className='w-4 h-4 mr-2' />
                    )}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>

                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handlePrint}
                    className='text-zinc-600'
                  >
                    <Printer className='w-4 h-4 mr-2' />
                    Print
                  </Button>
                </div>
              </div>

              {/* BlockNote Editor */}
              <div className='min-h-[600px] text-zinc-900'>
                <BlockNoteView
                  editor={editor}
                  theme='light'
                  onChange={handleEditorChange}
                />
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center justify-center h-full text-zinc-500 gap-3 hide-on-print'>
              <p>No pages found. Select or create a page to start writing.</p>
              <Button onClick={handleAddPage} variant='outline' size='sm'>
                <Plus className='w-4 h-4 mr-2' /> Create First Page
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Logbook;