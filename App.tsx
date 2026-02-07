import React, { useState, useEffect } from 'react';
import { parseMusicXML } from './utils/parser';
import { mapNotesToGuqin } from './utils/mapper';
import { ScoreViewer } from './components/ScoreViewer';
import { StaffViewer } from './components/StaffViewer';
import { GuqinNote } from './types';
import { SAMPLE_XML } from './constants';
import { FileText, Music, Upload, PlayCircle, Feather, Columns, PanelLeftClose } from 'lucide-react';

const App: React.FC = () => {
  const [xmlInput, setXmlInput] = useState<string>('');
  const [guqinNotes, setGuqinNotes] = useState<GuqinNote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  // Manually load Google Fonts
  useEffect(() => {
    const fontUrl = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;700&display=swap';
    fetch(fontUrl)
      .then((res) => res.text())
      .then((css) => {
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
      })
      .catch((err) => {
        console.warn('Failed to inject local font styles', err);
      });
  }, []);

  const handleProcess = (xml: string) => {
    setIsProcessing(true);
    try {
      const parsedNotes = parseMusicXML(xml);
      const mapped = mapNotesToGuqin(parsedNotes);
      setGuqinNotes(mapped);
    } catch (e) {
      console.error("Error processing XML", e);
      alert("Failed to process MusicXML. Please check the format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSample = () => {
    setXmlInput(SAMPLE_XML);
    handleProcess(SAMPLE_XML);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setXmlInput(text);
        handleProcess(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f2f0e9] overflow-hidden text-stone-900 font-serif">
      {/* Sidebar - Deep Ink Style */}
      <div className="w-[360px] flex-shrink-0 bg-[#1c1917] text-stone-300 flex flex-col shadow-2xl z-20 border-r border-stone-800">
        
        {/* Header */}
        <div className="p-8 border-b border-stone-800 bg-[#161412]">
          <h1 className="text-3xl font-light text-stone-100 flex items-center gap-3 tracking-wide">
            <Feather className="w-6 h-6 text-amber-700" />
            <span className="tracking-[0.1em]">Guqinize</span>
          </h1>
          <p className="text-xs text-stone-500 mt-2 uppercase tracking-widest pl-1">
            MusicXML to Jianzipu
          </p>
        </div>

        {/* Controls */}
        <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          
          <div className="space-y-6">
             <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-stone-700 rounded bg-stone-800/30 hover:bg-stone-800/50 hover:border-amber-700/50 hover:text-amber-500 cursor-pointer transition-all group">
               <div className="flex flex-col items-center gap-3 text-stone-500 group-hover:text-amber-500 transition-colors">
                 <Upload className="w-8 h-8" />
                 <span className="text-sm tracking-wider uppercase">Upload XML</span>
               </div>
               <input type="file" accept=".xml,.musicxml" onChange={handleFileUpload} className="hidden" />
             </label>
             
             <button 
               onClick={loadSample}
               className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-stone-700 text-stone-400 rounded hover:text-stone-100 hover:border-stone-500 hover:bg-stone-800 transition-all text-sm uppercase tracking-wider"
             >
               <PlayCircle className="w-5 h-5" />
               Load Sample Score
             </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-stone-800 w-full" />

          {/* View Toggle */}
          <div className="flex flex-col gap-3">
             <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                Layout
             </label>
             <button 
                onClick={() => setIsComparisonMode(!isComparisonMode)}
                className={`flex items-center justify-between w-full py-3 px-4 border rounded transition-all text-sm uppercase tracking-wider ${isComparisonMode ? 'border-amber-900 bg-amber-900/20 text-amber-500' : 'border-stone-700 text-stone-400 hover:bg-stone-800'}`}
             >
                <div className="flex items-center gap-2">
                    {isComparisonMode ? <Columns className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    <span>{isComparisonMode ? 'Split View' : 'Single View'}</span>
                </div>
                {isComparisonMode && <span className="text-[10px] bg-amber-900 text-amber-100 px-1.5 py-0.5 rounded">ON</span>}
             </button>
          </div>

          {/* Raw Input (Collapsed usually, but here visible) */}
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Raw Source
              </label>
            </div>
            <textarea
              className="w-full flex-1 p-4 text-xs font-mono bg-[#161412] text-stone-400 border border-stone-800 rounded focus:border-amber-900 focus:outline-none resize-none custom-scrollbar"
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
              placeholder="XML content..."
            />
          </div>
          
          <button 
             onClick={() => handleProcess(xmlInput)}
             disabled={!xmlInput}
             className="w-full py-4 bg-amber-900 text-amber-50 rounded hover:bg-amber-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-serif text-lg tracking-widest shadow-lg border border-amber-800/50"
          >
            {isProcessing ? 'Transcribing...' : 'Transcribe'}
          </button>
        </div>
        
        {/* Footer info */}
        <div className="p-4 text-center text-[10px] text-stone-600 border-t border-stone-800">
           v1.0.0 &middot; Standard Tuning
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col items-center">
        {/* Top Shadow Gradient for depth */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-stone-900/5 to-transparent z-10 pointer-events-none" />
        
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar p-8 pb-20">
           {isComparisonMode && xmlInput ? (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full max-w-[2000px] mx-auto">
                   <div className="flex flex-col items-center animate-in fade-in slide-in-from-left duration-500">
                       <StaffViewer xml={xmlInput} />
                   </div>
                   <div className="flex flex-col items-center animate-in fade-in slide-in-from-right duration-500 delay-100">
                       <ScoreViewer notes={guqinNotes} />
                   </div>
               </div>
           ) : (
               <div className="flex flex-col items-center w-full animate-in fade-in duration-500">
                   <ScoreViewer notes={guqinNotes} />
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default App;