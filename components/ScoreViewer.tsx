import React, { useRef, useCallback, useState } from 'react';
import { GuqinNote } from '../types';
import { JianzipuChar } from './JianzipuChar';
import { Download, Loader2, Printer } from 'lucide-react';
import { toPng } from 'html-to-image';
import { TUNINGS } from '../constants';

interface Props {
  notes: GuqinNote[];
  tuningName?: string;
  title?: string;
}

export const ScoreViewer: React.FC<Props> = ({ notes, tuningName, title }) => {
  const scoreRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Derive key signature from the first note (rough heuristic) or fallback
  // In a real app we would pass this from the parser
  const keySignature = "F"; 
  const tuningInfo = TUNINGS.find(t => t.name === tuningName);
  const tuningSolfege = tuningInfo?.solfege || "5 6 1 2 3 5 6";
  const tuningDisplay = `1=${keySignature} (${tuningName?.split(' ')[0]}定弦 ${tuningSolfege})`;

  const handleDownload = useCallback(async () => {
    if (scoreRef.current === null) {
      return;
    }

    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(scoreRef.current, { 
        cacheBust: true, 
        backgroundColor: '#ffffff',
        pixelRatio: 3 
      });
      
      const link = document.createElement('a');
      link.download = `${title || 'guqin-score'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('Could not generate image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [scoreRef, title]);

  if (notes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 font-serif">
        <div className="w-24 h-24 mb-6 opacity-20 border-4 border-stone-400 rounded-full flex items-center justify-center">
             <span className="text-4xl">琴</span>
        </div>
        <p className="text-lg tracking-widest text-stone-500">AWAITING SCORE</p>
        <p className="text-sm opacity-60 mt-2">Please upload a MusicXML file</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center min-h-full">
      
      {/* Action Bar */}
      <div className="sticky top-0 z-50 mb-6 flex gap-3 print:hidden">
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-stone-50 rounded shadow-xl hover:bg-amber-900 hover:-translate-y-0.5 transition-all text-xs uppercase tracking-widest font-semibold disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isDownloading ? 'Inking...' : 'Export PNG'}
        </button>
      </div>

      {/* The Paper Sheet */}
      <div 
        ref={scoreRef} 
        className="relative w-full max-w-[1100px] min-h-[1200px] bg-white shadow-2xl mb-20 p-20 print:shadow-none print:p-0"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center mb-12">
           <h1 className="text-5xl font-bold font-serif text-black tracking-[0.1em] mb-6">
             {title || '古琴谱'}
           </h1>
           
           <div className="w-full flex justify-start pl-2">
              <p className="text-sm font-serif font-bold text-black tracking-widest">
                {tuningDisplay}
              </p>
           </div>
        </div>
        
        {/* Score Body */}
        {/* We use flex-wrap with a specific gap to emulate the flow. 
            The parser injects bars and dashes to control spacing. */}
        <div className="flex flex-wrap items-end justify-start gap-y-10 gap-x-0 content-start min-h-[600px]">
          {notes.map((note, index) => (
             <JianzipuChar key={index} note={note} />
          ))}
          {/* End Bar */}
          <div className="w-[3px] h-[6rem] bg-stone-900 mx-3 self-start mt-2" />
        </div>
      </div>
    </div>
  );
};