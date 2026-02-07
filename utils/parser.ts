import { ParsedNote, JianpuInfo } from '../types';

// Standard mapping from Key Fifths to Tonic Pitch Class (C=0, C#=1...)
const KEY_FIFTHS_TO_PC: Record<number, number> = {
  0: 0,   // C
  1: 7,   // G
  2: 2,   // D
  3: 9,   // A
  4: 4,   // E
  5: 11,  // B
  6: 6,   // F#
  7: 1,   // C#
  [-1]: 5,  // F
  [-2]: 10, // Bb
  [-3]: 3,  // Eb
  [-4]: 8,  // Ab
  [-5]: 1,  // Db
  [-6]: 6,  // Gb
  [-7]: 11  // Cb
};

// Major scale intervals from root: 1, 2, 3, 4, 5, 6, 7
const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const SCALE_DEGREE_NAMES = ['1', '2', '3', '4', '5', '6', '7'];

const calculateJianpu = (midi: number, fifths: number, isRest: boolean): JianpuInfo => {
  if (isRest) {
    return { number: '0', octave: 0, accidental: '' };
  }

  // 1. Determine Base Tonic (The "1" closest to Middle C / MIDI 60)
  // This ensures that notes around middle C have 0 dots if they are within the main octave
  const tonicPC = KEY_FIFTHS_TO_PC[fifths] ?? 0; // Default to C if unknown
  
  // Find candidate tonics: tonicPC, tonicPC + 12, etc.
  // We want the one closest to 60 to be the "middle" register.
  // e.g. Key C(0): 60. Key G(7): 55 (G3) vs 67 (G4). 55 is closer to 60.
  const t1 = tonicPC + 12 * Math.floor((60 - tonicPC) / 12);     // Lower candidate
  const t2 = t1 + 12;                                            // Upper candidate
  const baseTonic = (Math.abs(t1 - 60) <= Math.abs(t2 - 60)) ? t1 : t2;

  // 2. Calculate offset from Base Tonic
  const diff = midi - baseTonic;
  
  // 3. Determine Octave (Dots)
  // diff 0..11 => Octave 0
  // diff 12..23 => Octave 1 (Dot above)
  // diff -1..-12 => Octave -1 (Dot below)
  const octave = Math.floor(diff / 12);
  
  // 4. Determine Scale Degree
  const semitoneInOctave = ((diff % 12) + 12) % 12; // Normalize to 0..11
  
  // Simple mapping: check if it matches a major scale degree
  let number = '';
  let accidental = '';

  const degreeIndex = MAJOR_SCALE_OFFSETS.indexOf(semitoneInOctave);
  
  if (degreeIndex !== -1) {
    number = SCALE_DEGREE_NAMES[degreeIndex];
  } else {
    // It's a non-scale note. Find closest.
    const chromaticMap: Record<number, {num: string, acc: string}> = {
        1: { num: '1', acc: '#' },
        3: { num: '2', acc: '#' }, // Defaulting to sharp for now
        6: { num: '4', acc: '#' },
        8: { num: '5', acc: '#' },
        10: { num: '6', acc: '#' }, 
    };
    const mapped = chromaticMap[semitoneInOctave];
    if (mapped) {
        number = mapped.num;
        accidental = mapped.acc;
    } else {
        // Fallback
        number = '?';
    }
  }

  return { number, octave, accidental };
};

export const parseMusicXML = (xmlContent: string): ParsedNote[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  const notes: ParsedNote[] = [];
  
  const measures = Array.from(xmlDoc.querySelectorAll("measure"));
  let measureStartTime = 0;
  let currentFifths = 0; // Default C Major

  measures.forEach((measure) => {
    const children = Array.from(measure.children);
    let currentOffset = 0;
    let maxOffsetInMeasure = 0;

    children.forEach((child) => {
      // Handle Key Signature Change
      if (child.tagName === 'attributes') {
          const keyNode = child.querySelector('key');
          if (keyNode) {
              const fifthsNode = keyNode.querySelector('fifths');
              if (fifthsNode && fifthsNode.textContent) {
                  currentFifths = parseInt(fifthsNode.textContent, 10);
              }
          }
      }

      if (child.tagName === 'note') {
        const rest = child.querySelector('rest');
        const chord = child.querySelector('chord') !== null;
        const durationNode = child.querySelector('duration');
        const duration = durationNode ? parseInt(durationNode.textContent || '0', 10) : 0;
        
        const pitch = child.querySelector('pitch');
        const voice = parseInt(child.querySelector('voice')?.textContent || '1', 10);
        const staff = parseInt(child.querySelector('staff')?.textContent || '1', 10);
        
        let noteStartTime = measureStartTime + currentOffset;
        
        if (chord && notes.length > 0) {
           noteStartTime = notes[notes.length - 1].startTime;
        }

        let noteData: ParsedNote = {
          step: '',
          octave: 0,
          alter: 0,
          duration: duration,
          type: child.querySelector('type')?.textContent || '',
          isRest: !!rest,
          voice,
          staff,
          chord,
          pitchName: '',
          absolutePitch: 0,
          startTime: noteStartTime,
          jianpu: { number: '0', octave: 0, accidental: '' } // placeholder
        };

        if (pitch) {
          const step = pitch.querySelector('step')?.textContent || 'C';
          const octave = parseInt(pitch.querySelector('octave')?.textContent || '4', 10);
          const alter = parseInt(pitch.querySelector('alter')?.textContent || '0', 10);
          
          noteData.step = step;
          noteData.octave = octave;
          noteData.alter = alter;
          
          const baseMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
          noteData.absolutePitch = (octave + 1) * 12 + baseMap[step] + alter;
          
          const acc = alter === 1 ? '#' : alter === -1 ? 'b' : '';
          noteData.pitchName = `${step}${acc}${octave}`;
        }
        
        // Calculate Jianpu based on absolute pitch and current key
        if (noteData.isRest) {
            noteData.jianpu = calculateJianpu(0, currentFifths, true);
        } else {
            noteData.jianpu = calculateJianpu(noteData.absolutePitch, currentFifths, false);
        }

        notes.push(noteData);

        if (!chord) {
           currentOffset += duration;
        }
        
        if (currentOffset > maxOffsetInMeasure) {
            maxOffsetInMeasure = currentOffset;
        }

      } else if (child.tagName === 'backup') {
        const duration = parseInt(child.querySelector('duration')?.textContent || '0', 10);
        currentOffset -= duration;
      } else if (child.tagName === 'forward') {
        const duration = parseInt(child.querySelector('duration')?.textContent || '0', 10);
        currentOffset += duration;
      }
    });
    
    measureStartTime += maxOffsetInMeasure;
  });

  return notes.sort((a, b) => {
      if (a.startTime === b.startTime) {
          return b.absolutePitch - a.absolutePitch; 
      }
      return a.startTime - b.startTime;
  });
};