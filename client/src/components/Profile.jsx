import React, { useRef } from "react";
import { useSelector } from "react-redux";
import QRCode from "react-qr-code";
import { User, Mail, GraduationCap, Download } from "lucide-react";

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  const qrWrapperRef = useRef(null);

  const qrPayload = JSON.stringify({
    name: user.name,
    email: user.email,
    year: user.year,
    section: user.section,
  });

  const handleDownloadQR = () => {
    const svgElement = qrWrapperRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      const padding = 40;

      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, padding, padding);

      const pngUrl = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${user.name.replace(/\s+/g, "_")}_QR.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  return (
    <div className="bflex flex-col items-center  min-h-[80vh]">
      <div className="w-full max-w-md overflow-hidden">
        <img src="/alab-logo-3.svg" alt="LOGO" className="w-60 mx-auto" />
        {/* Info Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <User size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Name
                </p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Email
                </p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>

            {user.role === "STUDENT" && (
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <GraduationCap size={16} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Year & Section
                  </p>
                  <p className="text-sm font-medium">
                    {user.year} — {user.section}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

          {user.role === "STUDENT" && (
            <div className="flex flex-col items-center text-center space-y-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Present this QR code to the faculty desk to scan and log your
                safety gate entry.
              </p>

              <div
                ref={qrWrapperRef}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm"
              >
                <QRCode
                  value={qrPayload}
                  size={160}
                  level="H"
                  className="w-40 h-40"
                />
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-2 mt-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all active:scale-95 shadow-sm"
              >
                <Download size={16} />
                Download QR Pass
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
