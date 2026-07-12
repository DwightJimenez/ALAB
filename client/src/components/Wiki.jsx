import React from "react";
import "@google/model-viewer";
import ChemicalGrid from "./ChemicalGrid";
import EquipmentGrid from "./EquipmentGrid";

const Wiki = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <style>{`
        /* The Hotspot Button (The Circle) */
        .Hotspot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        /* The Annotation Card (Hidden by default) */
        .HotspotAnnotation {
          position: absolute;
          top: 50%;
          left: calc(100% + 15px);
          transform: translateY(-50%);
          background: #ffffff;
          color: #333;
          padding: 12px;
          border-radius: 8px;
          width: 200px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          display: none; /* Hidden until hover */
          text-align: left;
          z-index: 100;
        }

        /* Show annotation on hover */
        .Hotspot:hover .HotspotAnnotation {
          display: block;
        }
      `}</style>

      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Compound Microscope</h2>

        <model-viewer
          src="/models/compound_microscope.glb"
          alt="A 3D model of a microscope"
          auto-rotate
          camera-controls
          debug
          style={{
            width: "100%",
            height: "500px",
            backgroundColor: "oklch(0.3688 0.1267 271.36)",
            borderRadius: "12px",
          }}
        >
          {/* Eyepiece Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-eyepiece"
            data-position="0.26 2.39 1.48"
            data-normal="0 1 0"
          >
            1
            <div className="HotspotAnnotation">
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                Eyepiece (10x)
              </div>
              <div style={{ fontSize: "12px" }}>
                The lens you look through to see the specimen.
              </div>
            </div>
          </button>

          {/* Stage Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-stage"
            data-position="0 0.94 0.68"
            data-normal="0 1 0"
          >
            2
            <div className="HotspotAnnotation">
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                Mechanical Stage
              </div>
              <div style={{ fontSize: "12px" }}>
                The platform where the slide is placed.
              </div>
            </div>
          </button>

          {/* Coarse Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-coarse"
            data-position="0.67 0.59 -0.31"
            data-normal="0 1 0"
          >3
            <div className="HotspotAnnotation">
              <div className="HotspotTitle">Part Name</div>
              <div className="HotspotDesc">
                Detailed description of the part.
              </div>
            </div>
          </button>

          {/* Objective Lens Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-objective_lense"
            data-position="0 1.18 0.5"
            data-normal="0 1 0"
          >4
            <div className="HotspotAnnotation">
              <div className="HotspotTitle">Part Name</div>
              <div className="HotspotDesc">
                Detailed description of the part.
              </div>
            </div>
          </button>
          {/* Fine Focus Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-fine_focus"
            data-position="0.45 1.65 0.43"
            data-normal="0 1 0"
          >5
            <div className="HotspotAnnotation">
              <div className="HotspotTitle">Part Name</div>
              <div className="HotspotDesc">
                Detailed description of the part.
              </div>
            </div>
          </button>
          {/* Condenser Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-condenser"
            data-position="0 1.74 0.62"
            data-normal="0 1 0"
          >6
            <div className="HotspotAnnotation">
              <div className="HotspotTitle">Part Name</div>
              <div className="HotspotDesc">
                Detailed description of the part.
              </div>
            </div>
          </button>
          {/* Illuminator Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-illuminator"
            data-position="0 0.5 0.58"
            data-normal="0 1 0"
          >7
            <div className="HotspotAnnotation">
              <div className="HotspotTitle">Part Name</div>
              <div className="HotspotDesc">
                Detailed description of the part.
              </div>
            </div>
          </button>
          {/* Rack Stop Hotspot */}
          <button
            className="Hotspot"
            slot="hotspot-rack_stop"
            data-position="0 0.94 -0.05"
            data-normal="0 0 1"
          >8
            <div className="HotspotAnnotation">
              <div className="HotspotTitle">Part Name</div>
              <div className="HotspotDesc">
                Detailed description of the part.
              </div>
            </div>
          </button>
        </model-viewer>
      </div>
      <ChemicalGrid/>
      <EquipmentGrid/>
    </div>
  );
};

export default Wiki;
