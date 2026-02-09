import { ParsedNote, JianpuInfo } from '../types';

// Map 'fifths' from MusicXML <key> to Pitch Class of the Tonic (0=C, 1=C#, ... 11=B)
// -1 = F Major. F is 5.
const KEY_FIFTHS_TO_TONIC_PC: Record<number, number> = {
  0: 0,   // C
  1: 7,   // G
  2: 2,   // D
  3: 9,   // A
  4: 4,   // E
  5: 11,  // B
  6: 6,   // F#
  [-1]: 5, // F
  [-2]: 10, // Bb
  [-3]: 3,  // Eb
  [-4]: 8,  // Ab
  [-5]: 1,  // Db
  [-6]: 6,  // Gb
};

const SCALE_DEGREE_NAMES = ['1', '?', '2', '?', '3', '4', '?', '5', '?', '6', '?', '7'];

// New helper to create structural items
const createStructureItem = (type: 'bar' | 'dash', startTime: number): ParsedNote => ({
  step: '', octave: 0, alter: 0, duration: 0, type: '',
  isRest: false,
  isBarline: type === 'bar',
  isDash: type === 'dash',
  voice: 0, staff: 0, chord: false, pitchName: '', absolutePitch: 0, startTime,
  jianpu: { number: '', octave: 0, accidental: '', underlineCount: 0, dot: false }
});

const calculateJianpu = (midi: number, fifths: number, isRest: boolean): JianpuInfo => {
  if (isRest) {
    return { number: '0', octave: 0, accidental: '', underlineCount: 0, dot: false };
  }

  // 1. Determine the Tonic Pitch Class (0-11)
  const tonicPC = KEY_FIFTHS_TO_TONIC_PC[fifths] ?? 0;

  // 2. Determine "Middle 1" (Central Tonic)
  // Standard Jianpu usually treats the octave near C4/D4 as the central octave (no dots).
  // For F Major (1=F), F4 (MIDI 65) is usually "1". 
  // F3 (53) is "1" with dot below.
  
  // Let's find the Tonic instance closest to C4 (60)
  // e.g., if F, F4(65) vs F3(53). 65 is closer.
  let baseTonic = tonicPC; 
  while (baseTonic < 60) baseTonic += 12;
  // Now baseTonic is >= 60. Check if the one below is closer.
  if (Math.abs((baseTonic - 12) - 60) < Math.abs(baseTonic - 60)) {
      baseTonic -= 12;
  }
  
  // 3. Calculate Interval from Tonic
  // diff = semitones from the central tonic
  const diff = midi - baseTonic;
  
  // 4. Calculate Octave Shift
  // We use floor to handle negatives correctly. -1 to -12 is octave -1.
  // Actually, we want scale degrees.
  // (midi - tonicPC) % 12 gives scale degree index.
  const semitoneFromTonic = ((midi - tonicPC) % 12 + 12) % 12;
  
  // Calculate raw octave relative to baseTonic
  // e.g. if midi is D4 (62) and baseTonic is F4 (65). diff = -3.
  // -3 / 12 floor is -1.
  // But wait, D4 is "6" of F major. It is in the SAME octave range notationally as F4?
  // Usually: 1 2 3 4 5 6 7.
  // If 1 is F4(65). 6 is D5(74).
  // D4(62) is lower than 1(65). So it is Low 6.
  // Correct.
  
  // Special adjustment:
  // In Jianpu, "7" (B) is below "1" (C) in absolute terms if we wrap? 
  // No, 1 is the bottom of the octave group.
  // So anything < baseTonic gets a dot below.
  const octave = Math.floor(diff / 12);
  if (midi < baseTonic) {
      // Check boundaries. 
      // If D4 (62) vs F4 (65). diff = -3. floor(-0.25) = -1. Correct.
  }

  let number = SCALE_DEGREE_NAMES[semitoneFromTonic];
  let accidental = '';

  // Handle Chromatics (simplified)
  if (number === '?') {
      // Find previous valid note and add #
      const prev = SCALE_DEGREE_NAMES[((semitoneFromTonic - 1) + 12) % 12];
      if (prev !== '?') {
          number = prev;
          accidental = '#';
      } else {
          number = '?';
      }
  }

  return { number, octave, accidental, underlineCount: 0, dot: false };
};

export const parseMusicXML = (xmlContent: string): ParsedNote[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  const notes: ParsedNote[] = [];
  
  const measures = Array.from(xmlDoc.querySelectorAll("measure"));
  let measureStartTime = 0;
  let currentFifths = 0; // Default to C

  measures.forEach((measure) => {
    // Get divisions for this measure
    const attrNode = measure.querySelector('attributes');
    let divisions = 1; 
    
    if (attrNode) {
        const divNode = attrNode.querySelector('divisions');
        if (divNode && divNode.textContent) divisions = parseInt(divNode.textContent, 10);
        
        const keyNode = attrNode.querySelector('key > fifths');
        if (keyNode && keyNode.textContent) currentFifths = parseInt(keyNode.textContent, 10);
    } else {
         // Attempt to find previous divisions if not present
         if (divisions === 1) {
             const firstDiv = xmlDoc.querySelector('divisions');
             if (firstDiv && firstDiv.textContent) divisions = parseInt(firstDiv.textContent, 10);
         }
    }

    const children = Array.from(measure.children);
    let currentOffset = 0;

    children.forEach((child) => {
      if (child.tagName === 'note') {
        const rest = child.querySelector('rest');
        const chord = child.querySelector('chord') !== null;
        const durationNode = child.querySelector('duration');
        const duration = durationNode ? parseInt(durationNode.textContent || '0', 10) : 0;
        
        const pitch = child.querySelector('pitch');
        const voice = parseInt(child.querySelector('voice')?.textContent || '1', 10);
        
        // Dot check
        const dotNode = child.querySelector('dot');
        const isDotted = dotNode !== null;
        
        const typeNode = child.querySelector('type');
        const noteType = typeNode ? typeNode.textContent : '';
        
        if (voice > 1) return; 

        // Rhythm Calculation
        const quarterDuration = divisions;
        const beats = duration / quarterDuration; 
        
        let underlineCount = 0;
        if (noteType === 'eighth') underlineCount = 1;
        else if (noteType === '16th') underlineCount = 2;
        else if (noteType === '32nd') underlineCount = 3;
        // Quarters and Halves have 0 underlines

        let noteStartTime = measureStartTime + currentOffset;

        let noteData: ParsedNote = {
          step: '', octave: 0, alter: 0, duration,
          type: noteType || '',
          isRest: !!rest,
          isBarline: false,
          isDash: false,
          voice, staff: 1, chord,
          pitchName: '',
          absolutePitch: 0,
          startTime: noteStartTime,
          jianpu: { number: '0', octave: 0, accidental: '', underlineCount, dot: isDotted }
        };

        if (pitch) {
          const step = pitch.querySelector('step')?.textContent || 'C';
          const octave = parseInt(pitch.querySelector('octave')?.textContent || '4', 10);
          const alter = parseInt(pitch.querySelector('alter')?.textContent || '0', 10);
          noteData.step = step; noteData.octave = octave; noteData.alter = alter;
          const baseMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
          noteData.absolutePitch = (octave + 1) * 12 + baseMap[step] + alter;
          
          noteData.jianpu = { 
              ...calculateJianpu(noteData.absolutePitch, currentFifths, false),
              underlineCount,
              dot: isDotted
          };
        } else if (rest) {
           noteData.jianpu = {
               ...calculateJianpu(0, currentFifths, true),
               underlineCount,
               dot: isDotted
           };
        }

        notes.push(noteData);

        // --- DASH Logic for Long Notes ---
        // If type is half (2 beats), add 1 dash.
        // If type is whole (4 beats), add 3 dashes.
        if (noteType === 'half') {
             notes.push(createStructureItem('dash', noteStartTime));
        } else if (noteType === 'whole') {
             notes.push(createStructureItem('dash', noteStartTime));
             notes.push(createStructureItem('dash', noteStartTime));
             notes.push(createStructureItem('dash', noteStartTime));
        } else if (!noteType && beats >= 2) {
             // Fallback if no type tag
             const dashCount = Math.floor(beats) - 1;
             for (let i = 0; i < dashCount; i++) {
                 notes.push(createStructureItem('dash', noteStartTime));
             }
        }

        if (!chord) {
           currentOffset += duration;
        }

      } else if (child.tagName === 'backup') {
        const duration = parseInt(child.querySelector('duration')?.textContent || '0', 10);
        currentOffset -= duration;
      } else if (child.tagName === 'forward') {
        const duration = parseInt(child.querySelector('duration')?.textContent || '0', 10);
        currentOffset += duration;
      }
    });

    notes.push(createStructureItem('bar', measureStartTime + currentOffset));
    measureStartTime += currentOffset; 
  });

  return notes;
};

export const recalculateJianpu = (notes: ParsedNote[], fifths: number): ParsedNote[] => {
    return notes.map(note => {
        if (note.isBarline || note.isDash) return note;
        const j = calculateJianpu(note.absolutePitch, fifths, note.isRest);
        return {
            ...note,
            jianpu: { ...j, underlineCount: note.jianpu.underlineCount, dot: note.jianpu.dot }
        };
    });
};