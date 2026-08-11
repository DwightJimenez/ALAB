import React, { useState, useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const Logbook = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimeoutRef = useRef(null);
  const isSwitchingPageRef = useRef(false);

  // Initialize BlockNote editor with a valid non-empty initial block
  const editor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: "" }],
  });

  const activePage = pages.find((p) => p.id === activePageId);

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

  // Synchronize editor content when active page changes
  useEffect(() => {
    if (activePage && editor) {
      isSwitchingPageRef.current = true;
      try {
        editor.replaceBlocks(editor.document, activePage.content || []);
      } catch (err) {
        console.error("Failed to update editor content", err);
      } finally {
        setTimeout(() => {
          isSwitchingPageRef.current = false;
        }, 50);
      }
    }
  }, [activePageId, editor]);

  // Track content changes and trigger a debounced save to backend
  const handleEditorChange = () => {
    if (!activePage || !editor || isSwitchingPageRef.current) return;

    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const jsonContent = editor.document;
        await fetch(`${API_URL}/api/logbook/${activePage.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: jsonContent }),
        });
      } catch (err) {
        console.error("Auto-save failed", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  const handleSelectPage = (id) => {
    if (id === activePageId) return;
    setActivePageId(id);
  };

  const handleAddPage = async () => {
    try {
      const res = await fetch(`${API_URL}/api/logbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "Untitled Page",
          content: [],
        }),
      });
      if (res.ok) {
        const newPage = await res.json();
        setPages([newPage, ...pages]);
        setActivePageId(newPage.id);
        toast.success("New empty page created.");
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
      ),
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

  const handleDeletePage = async (e, id) => {
    e.stopPropagation();

    try {
      const res = await fetch(`${API_URL}/api/logbook/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const remaining = pages.filter((p) => p.id !== id);
        setPages(remaining);
        if (activePageId === id) {
          setActivePageId(remaining.length > 0 ? remaining[0].id : null);
        }
        toast.success("Page deleted.");
      }
    } catch (err) {
      toast.error("Failed to delete page.");
    }
  };

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center bg-white'>
        <Loader2 className='w-6 h-6 animate-spin text-gray-500' />
      </div>
    );
  }

  return (
    <div className='flex h-screen bg-white text-gray-800 overflow-hidden font-sans relative'>
      {/* SIDEBAR */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden select-none z-20`}
      >
        <div className='p-4 flex items-center justify-between border-b border-gray-200'>
          <div className='flex items-center gap-2 truncate'>
            <span className='font-semibold text-sm truncate text-gray-900'>
              ALAB Logbook
            </span>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsSidebarOpen(false)}
            className='h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-200'
          >
            <ChevronLeft className='w-4 h-4' />
          </Button>
        </div>

        <div className='flex-1 overflow-y-auto py-3 px-2 space-y-1'>
          <div className='px-2 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center'>
            <span>Private Logbooks</span>
            <div className='flex items-center gap-1.5'>
              {isSaving && (
                <span className='text-[10px] text-indigo-600 font-normal animate-pulse'>
                  Saving...
                </span>
              )}
              <button
                onClick={handleAddPage}
                className='p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors'
                title='Create New Page'
              >
                <Plus className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => handleSelectPage(page.id)}
              className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                activePageId === page.id
                  ? "bg-gray-200 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <div className='flex items-center gap-2.5 truncate flex-1'>
                <FileText className='w-4 h-4 text-indigo-600 shrink-0' />
                <span className='truncate text-left flex-1'>{page.title}</span>
              </div>
              <button
                onClick={(e) => handleDeletePage(e, page.id)}
                className='opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 text-gray-400 transition-opacity'
              >
                <Trash2 className='w-3.5 h-3.5' />
              </button>
            </div>
          ))}
        </div>

        <div className='p-3 border-t border-gray-200'>
          <Button
            onClick={handleAddPage}
            variant='ghost'
            className='w-full justify-start text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 gap-2 h-9'
          >
            <Plus className='w-4 h-4' /> New Page
          </Button>
        </div>
      </div>

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className='absolute top-4 left-4 z-30 p-2 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm'
          title='Open Sidebar'
        >
          <ChevronRight className='w-4 h-4' />
        </button>
      )}

      {/* MAIN EDITOR AREA */}
      <div className='flex-1 flex flex-col h-screen overflow-y-auto bg-white'>
        <div className='max-w-3xl w-full mx-auto px-12 py-16 flex-1'>
          {activePage ? (
            <>
              <div className='mb-8'>
                <input
                  type='text'
                  value={activePage.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className='w-full text-4xl font-extrabold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-300'
                  placeholder='Untitled'
                />
              </div>

              <div className='min-h-[600px] text-gray-900'>
                <BlockNoteView
                  editor={editor}
                  theme='light'
                  onChange={handleEditorChange}
                />
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-3'>
              <p>No pages found. Select or create a page to start writing.</p>
              <Button onClick={handleAddPage} variant='outline' size='sm'>
                <Plus className='w-4 h-4 mr-2' /> Create First Page
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logbook;
