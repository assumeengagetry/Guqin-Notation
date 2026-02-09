import React, { useEffect, useRef, useState } from 'react';
import * as OSMDLib from 'opensheetmusicdisplay';

interface Props {
  xml: string;
}

export const StaffViewer: React.FC<Props> = ({ xml }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const osmdInstanceRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!divRef.current || !xml) return;

    const renderScore = async () => {
        try {
            setError(null);
            // Clear previous content
            divRef.current!.innerHTML = '';

            // Handle various export structures from CDN (ESM wrapper around CJS/UMD)
            const lib: any = OSMDLib;
            const OpenSheetMusicDisplay = lib.OpenSheetMusicDisplay || lib.default?.OpenSheetMusicDisplay || lib.default;

            if (!OpenSheetMusicDisplay) {
                 throw new Error("Could not load OpenSheetMusicDisplay class from module.");
            }

            if (!osmdInstanceRef.current) {
                // Instantiate
                osmdInstanceRef.current = new OpenSheetMusicDisplay(divRef.current, {
                    autoResize: true,
                    backend: 'svg',
                    drawingParameters: 'compact', // compact style
                    drawPartNames: true,
                    drawTitle: true,
                    drawSubtitle: false,
                    drawComposer: true,
                    drawMetronomeMarks: true,
                });
            }

            // Load and Render
            await osmdInstanceRef.current.load(xml);
            osmdInstanceRef.current.render();
            
        } catch (e: any) {
            console.error("OSMD Render Error:", e);
            setError("Could not render the staff notation for this XML. " + (e.message || ""));
        }
    };

    renderScore();

  }, [xml]);

  return (
    <div className="relative w-full min-h-[800px] bg-[#faf9f6] shadow-2xl p-8 mb-20"
         style={{
             backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
             backgroundSize: '100% 100px',
             backgroundPosition: '0 0'
         }}>
         
         <div className="relative border-b-2 border-stone-800 pb-4 mb-8 text-center">
             <div className="absolute left-0 top-0 opacity-20">
                 <span className="text-4xl font-serif">♪</span>
             </div>
             <h2 className="text-3xl font-bold text-stone-900 tracking-widest font-serif">Original Score</h2>
             <p className="text-xs uppercase tracking-widest text-stone-500 mt-2">Western Staff Notation</p>
         </div>

         {error ? (
             <div className="flex items-center justify-center h-64 text-red-800 bg-red-50/50 border border-red-100 rounded">
                 <p>{error}</p>
             </div>
         ) : (
             <div ref={divRef} className="w-full h-full min-h-[600px] [&_svg]:!w-full [&_svg]:!h-auto" />
         )}

         <div className="mt-8 pt-4 border-t border-stone-300 text-right text-[10px] text-stone-400 uppercase tracking-widest">
            Rendered via OpenSheetMusicDisplay
         </div>
    </div>
  );
};