import React, { useMemo } from "react";
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

function CollaborativeEditor() {
  const provider = useHocuspocusProvider();
  const user = useSelector((state) => state.auth.user);

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

  return <BlockNoteView editor={editor} theme="light" />;
}

export default function Workspace() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const wsURL = import.meta.env.VITE_WS_URL;
  const url = `${wsURL}/collaboration`;

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <img src="/alab-icon.svg" alt="LOGO" className="w-10" />
          <span className="text-[18px] font-medium text-gray-800 border-l pl-3 ml-1">
            Lab Group {groupId} Workspace
          </span>
        </div>
      </div>

      {/* WebSocket Manager & Room Context */}
      <div className="flex-1 overflow-y-auto">
        <div className="my-10 mx-auto bg-white shadow-md border border-gray-200 p-10 min-h-[1056px] w-[816px]">
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
    </div>
  );
}
