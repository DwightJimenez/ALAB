import React, { useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import QRCode from "react-qr-code";
import { User, Mail, GraduationCap, Download, Camera } from "lucide-react";
import { toast } from "sonner";
import { setCredentials } from "../redux/authSlice";
import StudentRadarChart from "./student/StudentRadarChart";

const AVATARS = [
  "/avatar/avatar-1.svg",
  "/avatar/avatar-2.svg",
  "/avatar/avatar-3.svg",
  "/avatar/avatar-4.svg",
  "/avatar/avatar-5.svg",
  "/avatar/avatar-6.svg",
  "/avatar/avatar-7.svg",
  "/avatar/avatar-8.svg",
  "/avatar/avatar-fox.svg",
  "/avatar/avatar-frog.svg",
  "/avatar/avatar-giraffe.svg",
  "/avatar/avatar-penguin.svg",
  "/avatar/avatar-rabbit.svg",
  "/avatar/avatar-rat.svg",
  "/avatar/avatar-sheep.svg",
];

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const qrWrapperRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(
    user.avatar || "/avatar/avatar-default.svg",
  );
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleAvatarSelect = async (avatarPath) => {
    if (avatarPath === currentAvatar) {
      setIsModalOpen(false);
      return;
    }

    setIsUpdating(true);
    const toastId = toast.loading("Updating avatar...");

    try {
      const response = await fetch(`${API_URL}/api/user/avatar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ avatar: avatarPath }),
      });

      if (!response.ok) {
        throw new Error("Failed to update avatar on the server.");
      }

      // Update Local State
      setCurrentAvatar(avatarPath);
      setIsModalOpen(false);

      // Update Redux State
      dispatch(setCredentials({ ...user, avatar: avatarPath }));

      toast.success("Avatar updated successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update avatar. Please try again.", {
        id: toastId,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className='flex flex-col items-center min-h-[80vh] relative'>
      {/* Increased max-width slightly (max-w-lg) to accommodate the radar chart comfortably */}
      <div className='w-full max-w-lg overflow-hidden mt-6'>
        {/* Avatar Section */}
        <div className='relative w-32 h-32 mx-auto mb-4 group'>
          <img
            src={currentAvatar}
            alt='User Avatar'
            className={`w-full h-full object-cover rounded-full shadow-sm border-4 border-white dark:border-slate-800 bg-slate-50 transition-opacity ${
              isUpdating ? "opacity-50" : "opacity-100"
            }`}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isUpdating}
            className='absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-colors shadow-md border-2 border-white dark:border-slate-800 disabled:opacity-50'
            aria-label='Change Avatar'
          >
            <Camera size={16} />
          </button>
        </div>

        {/* Info Grid */}
        <div className='p-6 space-y-4'>
          <div className='grid grid-cols-1 gap-3'>
            <div className='flex items-center gap-3 text-slate-700 dark:text-slate-300'>
              <User size={16} className='text-slate-400 shrink-0' />
              <div>
                <p className='text-xs text-slate-400 uppercase tracking-wider font-semibold'>
                  Name
                </p>
                <p className='text-sm font-medium'>{user.name}</p>
              </div>
            </div>

            <div className='flex items-center gap-3 text-slate-700 dark:text-slate-300'>
              <Mail size={16} className='text-slate-400 shrink-0' />
              <div>
                <p className='text-xs text-slate-400 uppercase tracking-wider font-semibold'>
                  Email
                </p>
                <p className='text-sm font-medium'>{user.email}</p>
              </div>
            </div>

            {user.role === "STUDENT" && (
              <div className='flex items-center gap-3 text-slate-700 dark:text-slate-300'>
                <GraduationCap size={16} className='text-slate-400 shrink-0' />
                <div>
                  <p className='text-xs text-slate-400 uppercase tracking-wider font-semibold'>
                    Year & Section
                  </p>
                  <p className='text-sm font-medium'>
                    {user.year} — {user.section}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className='border-t border-slate-100 dark:border-slate-800 my-4' />

          {/* STUDENT ONLY SECTION (Radar + QR) */}
          {user.role === "STUDENT" && (
            <div className='flex flex-col space-y-8'>
              {/* Radar Chart Component */}
              <div className=' h-64'>
                <StudentRadarChart />
              </div>

              <div className='border-t border-slate-100 dark:border-slate-800' />

              {/* QR Code Section */}
              <div className='flex flex-col items-center text-center space-y-5'>
                <p className='text-xs text-slate-500 dark:text-slate-400 max-w-xs'>
                  Present this QR code to the faculty desk to scan and log your
                  safety gate entry.
                </p>

                <div
                  ref={qrWrapperRef}
                  className='p-4 bg-white border border-slate-200 rounded-2xl shadow-sm'
                >
                  <QRCode
                    value={qrPayload}
                    size={160}
                    level='H'
                    className='w-40 h-40'
                  />
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownloadQR}
                  className='flex items-center gap-2 mt-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all active:scale-95 shadow-sm'
                >
                  <Download size={16} />
                  Download QR Pass
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Selection Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4'>
          <div className='bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200'>
            <h3 className='text-lg font-semibold mb-4 text-center text-slate-900 dark:text-white'>
              Choose an Avatar
            </h3>

            <div className='grid grid-cols-3 gap-4 mb-6 max-h-60 overflow-y-auto p-1'>
              {AVATARS.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAvatarSelect(src)}
                  disabled={isUpdating}
                  className={`w-full aspect-square rounded-full p-1 border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                    currentAvatar === src
                      ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <img
                    src={src}
                    alt={`Avatar ${idx + 1}`}
                    className='w-full h-full object-cover rounded-full bg-slate-100'
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              disabled={isUpdating}
              className='w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
