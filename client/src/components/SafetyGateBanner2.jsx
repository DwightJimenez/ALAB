import React from "react";

const SafetyGateBanner2 = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center">
      <div className="w-full max-w-4xl bg-yellow-500/10 backdrop-blur-md border border-yellow-500/30 shadow-[0_4px_20px_rgba(234,179,8,0.15)] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/20 p-2 rounded-lg">
            <AlertTriangle className="text-yellow-500" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-yellow-900">
              Safety Assessment Required
            </h3>
            <p className="text-sm text-yellow-800/80">
              You must fully master all lab safety modules before you can
              request materials or book equipment.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/assessment")}
          className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg"
        >
          Master Assessment
        </button>
      </div>
    </div>
  );
};

export default SafetyGateBanner2;
