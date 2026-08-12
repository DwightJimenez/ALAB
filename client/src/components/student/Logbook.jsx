import React, { useState, useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  PanelLeft,
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
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-zinc-900 overflow-hidden font-sans">
      
      {/* SHADCN-STYLE SIDEBAR (Custom Implementation) */}
      <aside
        className={`flex-shrink-0 border-r border-zinc-200 bg-zinc-50/80 transition-all duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? "w-64" : "w-0 opacity-0 overflow-hidden"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-200/60">
          <span className="font-semibold text-sm truncate text-zinc-900">
            ALAB Logbook
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-zinc-500">
                Private Logbooks
              </span>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <span className="text-[10px] text-zinc-500 font-medium animate-pulse">
                    Saving...
                  </span>
                )}
                <button
                  onClick={handleAddPage}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors"
                  title="Create New Page"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="space-y-0.5">
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
                  <div className="flex items-center gap-2 truncate flex-1">
                    <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="truncate text-left flex-1">{page.title}</span>
                  </div>
                  <div
                    onClick={(e) => handleDeletePage(e, page.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-300/50 hover:text-red-600 text-zinc-400 transition-all"
                    title="Delete page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-200/60">
          <Button
            onClick={handleAddPage}
            variant="ghost"
            className="w-full justify-start text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 gap-2 h-9"
          >
            <Plus className="w-4 h-4" /> New Page
          </Button>
        </div>
      </aside>

      {/* MAIN EDITOR AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white relative">
        
        {/* Floating Trigger (when closed) */}
        {!isSidebarOpen && (
          <div className="absolute top-3 left-3 z-30">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              title="Toggle Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="max-w-3xl w-full mx-auto px-8 md:px-12 py-16 flex-1">
          {activePage ? (
            <>
              <div className="mb-8">
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full text-4xl font-extrabold text-zinc-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-zinc-300"
                  placeholder="Untitled"
                />
              </div>

              <div className="min-h-[600px] text-zinc-900">
                <BlockNoteView
                  editor={editor}
                  theme="light"
                  onChange={handleEditorChange}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
              <p>No pages found. Select or create a page to start writing.</p>
              <Button onClick={handleAddPage} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" /> Create First Page
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Logbook;