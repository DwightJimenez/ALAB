import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { CheckCircle, XCircle, ShieldAlert, Loader2 } from "lucide-react";

const GateScanner = () => {
  const [clearedStudents, setClearedStudents] = useState(new Set());
  const [flashState, setFlashState] = useState("idle"); // 'idle', 'pass', 'fail'
  const [lastScanned, setLastScanned] = useState(null);
  const [failReason, setFailReason] = useState("");
  const [isFetching, setIsFetching] = useState(true);


  useEffect(() => {
    const fetchClearedList = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/quiz/admin/passers", {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();

          const clearedEmails = data
            .filter(student => student.isCleared)
            .map(student => student.email);
            
          setClearedStudents(new Set(clearedEmails));
        }
      } catch (err) {
        console.error("Failed to pre-fetch cleared list", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchClearedList();
  }, []);

  const handleScan = (detectedCodes) => {
    if (flashState !== "idle" || !detectedCodes || detectedCodes.length === 0) return;

    try {
      const rawData = detectedCodes[0].rawValue;
      const studentData = JSON.parse(rawData);
      
      if (!studentData.email || !studentData.name) {
        throw new Error("Invalid ALAB format");
      }

      const isCleared = clearedStudents.has(studentData.email);
      
      setLastScanned(studentData);
      
      if (isCleared) {
        triggerFlash("pass");
      } else {
        setFailReason("Student has not cleared the Safety Gate.");
        triggerFlash("fail");
      }

    } catch (err) {
      setLastScanned(null);
      setFailReason("Unrecognized QR Code format.");
      triggerFlash("fail");
    }
  };

  const triggerFlash = (status) => {
    setFlashState(status);
    
    try {
      const audio = new Audio(status === "pass" ? "/success-beep.mp3" : "/error-buzzer.mp3");
      audio.play().catch(e => console.log("Audio play blocked by browser. User interaction needed first."));
    } catch (err) {
    
    }


    setTimeout(() => {
      setFlashState("idle");
    }, 1500);
  };


  const getFlashColor = () => {
    if (flashState === "pass") return "bg-emerald-500";
    if (flashState === "fail") return "bg-rose-500";
    return "bg-slate-900"; // Default dark camera background
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 bg-slate-900 text-white">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-400 mb-4" />
        <h2 className="text-xl font-semibold">Syncing Safety Gate Data...</h2>
        <p className="text-slate-400 mt-2">Downloading pre-cleared list for offline speed.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[85vh] p-4 transition-colors duration-200 ${getFlashColor()} rounded-xl shadow-inner mt-4 mx-4`}>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
        
        {/* Header */}
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-6 drop-shadow-sm">
          <ShieldAlert size={28} />
          Active Safety Gate
        </h2>

        {/* Viewport Box */}
        <div className="relative rounded-xl overflow-hidden aspect-square bg-black border-4 border-white/20 shadow-inner">
          
          {/* Only render camera if idle */}
          {flashState === "idle" && (
            <Scanner 
              onScan={handleScan}
              formats={["qr_code"]}
              components={{ audio: false, finder: true }}
              styles={{ container: { width: "100%", height: "100%" } }}
            />
          )}

          {/* Pass Flash Overlay */}
          {flashState === "pass" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500 text-white animate-in zoom-in duration-200 p-4">
              <CheckCircle size={80} className="mb-4" />
              <h3 className="text-3xl font-black tracking-widest">CLEARED</h3>
              <p className="font-bold text-xl mt-2 truncate w-full">{lastScanned?.name}</p>
              <p className="text-emerald-100">{lastScanned?.year} - {lastScanned?.section}</p>
            </div>
          )}

          {/* Fail Flash Overlay */}
          {flashState === "fail" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500 text-white animate-in zoom-in duration-200 p-4">
              <XCircle size={80} className="mb-4" />
              <h3 className="text-3xl font-black tracking-widest">DENIED</h3>
              <p className="font-bold text-lg mt-2 truncate w-full">{lastScanned?.name || "Unknown User"}</p>
              <p className="text-rose-200 text-sm mt-1">{failReason}</p>
            </div>
          )}
          
        </div>
        
        <p className="text-white/80 text-sm font-medium mt-6 bg-black/20 py-2 px-4 rounded-full inline-block">
          {flashState === "idle" ? "Align QR code inside the frame" : "Processing next..."}
        </p>

      </div>
    </div>
  );
};

export default GateScanner;