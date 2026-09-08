import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { toast } from "sonner";
import {
  CalculatorIcon,
  X,
  CornerDownRight,
  Loader2,
  FlaskConical,
} from "lucide-react";
import Calculator from "@/components/Calculator";
import PeriodicTable from "@/components/student/PeriodicTable";

function CollaborativeEditor() {
  const provider = useHocuspocusProvider();
  const user = useSelector((state) => state.auth.user);
  const { groupId } = useParams();
  const [isExtracting, setIsExtracting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  // --- STRICT "KEYBOARD ONLY" TIME TRACKER ---
  useEffect(() => {
    if (!provider?.document || !user) return;

    const metadataMap = provider.document.getMap("metadata");
    const userName = user?.name || user?.firstName || "Student";

    // We keep track of the last exact moment we added a second to the total.
    let lastCountedTime = 0;

    const handleDocUpdate = (update, origin, doc, tr) => {
      // tr.local ensures this ONLY triggers when THIS specific user physically types
      if (tr.local && origin !== "metadata-update") {
        const now = Date.now();

        // If it has been at least 1 full second (1000ms) since we last added time...
        if (now - lastCountedTime >= 1000) {
          provider.document.transact(() => {
            const currentTotal = metadataMap.get("totalActiveTimeMs") || 0;

            // Add EXACTLY 1000 milliseconds (1 second) to the total.
            // It is physically impossible for this to add 5 minutes.
            metadataMap.set("totalActiveTimeMs", currentTotal + 1000);
            metadataMap.set("lastActiveAt", new Date(now).toISOString());
            metadataMap.set("lastActiveUser", userName);
          }, "metadata-update");

          // Lock the timer for the next 1000 milliseconds
          lastCountedTime = now;
        }
      }
    };

    provider.document.on("update", handleDocUpdate);
    return () => provider.document.off("update", handleDocUpdate);
  }, [provider, user]);

  const cursorColor = useMemo(() => {
    const identifier = user?.name || user?.firstName || user?.id || "Student";
    const hash = identifier
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const h = hash % 360;
    const s = 70;
    const l = 50;

    const lDecimal = l / 100;
    const a = (s * Math.min(lDecimal, 1 - lDecimal)) / 100;

    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = lDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };

    return `#${f(0)}${f(8)}${f(4)}`;
  }, [user]);

  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: provider.document.getXmlFragment("document-store"),
      user: {
        name: user?.name || user?.firstName || "Student",
        color: cursorColor,
      },
    },
  });

  const handleExtractTemplate = async () => {
    try {
      setIsExtracting(true);

      const templateRes = await fetch(
        `${API_URL}/api/group/template/${groupId}`,
        {
          credentials: "include",
        },
      );
      if (!templateRes.ok) {
        throw new Error("Could not fetch assignment template");
      }
      const templateData = await templateRes.json();

      if (!templateData.instructionsHTML) {
        toast.info("No template instructions found for this assignment.");
        return;
      }

      toast.info("Extracting assignment questions...");
      const aiRes = await fetch(`${API_URL}/api/ai/extract-workspace-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: templateData.instructionsHTML }),
        credentials: "include",
      });

      if (!aiRes.ok) {
        throw new Error("Failed to extract content via AI API");
      }

      const aiData = await aiRes.json();

      let blocks = [];
      if (aiData.extractedHTML) {
        blocks = await editor.tryParseHTMLToBlocks(aiData.extractedHTML);
      } else {
        toast.info("No interactive questions or tables found to copy.");
        return;
      }

      editor.insertBlocks(
        blocks,
        editor.document[editor.document.length - 1],
        "after",
      );
      toast.success("Successfully copied activity template to workspace.");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to extract template.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className='relative h-full'>
      <div className='absolute top-2 right-2 z-10'>
        <button
          onClick={handleExtractTemplate}
          disabled={isExtracting}
          className='flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium'
          title='Copy question/activity template from assignment'
        >
          {isExtracting ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <CornerDownRight className='w-4 h-4' />
          )}
          {isExtracting ? "Extracting..." : "Copy Template"}
        </button>
      </div>
      <BlockNoteView editor={editor} theme='light' />
    </div>
  );
}

export default function Workspace() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const wsURL = import.meta.env.VITE_WS_URL;
  const url = `${wsURL}/collaboration`;
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  return (
    <div className='flex flex-col h-screen bg-[#F8F9FA] overflow-hidden font-sans'>
      {/* Top Navbar */}
      <div className='flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10'>
        <div className='flex items-center gap-4'>
          <img src='/alab-icon.svg' alt='LOGO' className='w-10' />
          <span className='text-[18px] font-medium text-gray-800 border-l pl-3 ml-1'>
            Lab Group {groupId} Workspace
          </span>
        </div>
      </div>

      {/* WebSocket Manager & Room Context */}
      <div className='flex-1 overflow-y-auto'>
        <div className='my-10 mx-auto bg-white shadow-md border border-gray-200 p-10 min-h-[1056px] w-[816px]'>
          <HocuspocusProviderWebsocketComponent url={url}>
            <HocuspocusRoom
              name={`group-${groupId}`}
              onAuthenticationFailed={({ reason }) => {
                toast.error(
                  reason.message ||
                    "Access Denied. You are not a member of this workspace.",
                );
                navigate("/student-dashboard", { replace: true });
              }}
            >
              <CollaborativeEditor />
            </HocuspocusRoom>
          </HocuspocusProviderWebsocketComponent>
        </div>
      </div>

      {/* Floating Action Dock */}
      <div className='fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4'>
        {/* Active Tool Popup */}
        {activeTool && (
          <div
            className={`bg-background/90 backdrop-blur-xl  rounded-2xl shadow-2xl border border-emerald-500 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden flex flex-col
                 ${activeTool === "periodic-table" ? "w-[95vw] md:w-[85vw] lg:w-[75vw] max-h-[80vh] overflow-y-auto custom-scrollbar" : ""}
                 `}
          >
            {activeTool === "calculator" && <Calculator />}
            {activeTool === "periodic-table" && (
              <div className='p-4  w-full h-full'>
                <PeriodicTable />
              </div>
            )}
          </div>
        )}

        <div
          className={`group flex items-center transition-all duration-500 ease-out bg-white/40 hover:bg-white/80 backdrop-blur-lg p-2 rounded-full border border-gray-200/50 shadow-lg hover:shadow-xl cursor-pointer ${
            activeTool ? "space-x-3 bg-white/80" : "-space-x-6 hover:space-x-3"
          }`}
        >
          {/* Periodic Table Button */}
          <button
            onClick={() =>
              setActiveTool(
                activeTool === "periodic-table" ? null : "periodic-table",
              )
            }
            className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-all duration-300 relative z-10 group/pt ${
              activeTool === "periodic-table"
                ? "bg-gray-800 text-white"
                : "bg-gradient-to-tr from-emerald-400 to-teal-500 text-white"
            }`}
            aria-label='Toggle Periodic Table'
          >
            {activeTool === "periodic-table" ? (
              <X className='w-5 h-5 transition-transform duration-300 rotate-90' />
            ) : (
              <FlaskConical className='w-5 h-5 transition-transform duration-300' />
            )}
            <span className='absolute -top-12 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover/pt:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none'>
              Periodic Table
            </span>
          </button>

          {/* Calculator Button */}
          <button
            onClick={() =>
              setActiveTool(activeTool === "calculator" ? null : "calculator")
            }
            className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-all duration-300 relative z-20 group/calc ${
              activeTool === "calculator"
                ? "bg-gray-800 text-white"
                : "bg-gradient-to-tr from-indigo-500 to-purple-500 text-white"
            }`}
            aria-label='Toggle Calculator'
          >
            {activeTool === "calculator" ? (
              <X className='w-5 h-5 transition-transform duration-300 rotate-90' />
            ) : (
              <CalculatorIcon className='w-5 h-5 transition-transform duration-300' />
            )}
            <span className='absolute -top-12 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover/calc:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none'>
              Calculator
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
