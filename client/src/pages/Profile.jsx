import React from "react";
import { useSelector } from "react-redux";
import QRCode from "react-qr-code";
import { User, Mail, GraduationCap, ShieldCheck } from "lucide-react";

const Profile = () => {
  const user = useSelector((state) => state.auth.user);

  // Payload for the active safety gate scanner
  const qrPayload = JSON.stringify({
    name: user.name,
    email: user.email,
    year: user.year,
    section: user.section,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 dark:bg-slate-950">
      {/* Profile & Gate Pass Container (Shadcn-style Card) */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        
        {/* Header Section */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                Student Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ALAB Academic System
              </p>
            </div>
          </div>
        </div>

        {/* Info Grid (Details Panel) */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            
            {/* Student Name */}
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <User size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Name</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
            </div>

            {/* Email Address */}
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>

            {/* Academic Info */}
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <GraduationCap size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Year & Section</p>
                <p className="text-sm font-medium">
                  {user.year} — {user.section}
                </p>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

          {/* Safety Gate QR Section */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-full text-xs font-semibold">
              <ShieldCheck size={14} />
              ALAB Safety Gate Pass
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Present this QR code to the faculty desk to scan and log your safety gate entry.
            </p>

            {/* QR Card - Isolated white box for scanner readability */}
            <div className="p-4 bg-white border border-slate-100 dark:border-transparent rounded-lg shadow-inner">
              <QRCode
                value={qrPayload}
                size={160}
                level="H"
                className="w-40 h-40"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;