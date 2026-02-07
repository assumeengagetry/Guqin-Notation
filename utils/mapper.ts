import { GuqinNote, HandTechnique, LeftHand, ParsedNote, RightHand } from '../types';

// Standard Tuning (Zheng Diao): C2, D2, F2, G2, A2, C3, D3
// MIDI Numbers: 
// 1=36(C2), 2=38(D2), 3=41(F2), 4=43(G2), 5=45(A2), 6=48(C3), 7=50(D3)
const STRING_PITCHES = [36, 38, 41, 43, 45, 48, 50];

// Common Hui positions and their approximate semitone offsets from the open string
// Derived from harmonic nodes: 7th=Octave(+12), 9th=P5(+7), 10th=P4(+5), etc.
// We map semitone difference -> Hui Name
const HUI_OFFSETS: Record<number, string> = {
  0: '散',  // Open
  2: '十三', // Maj 2nd (approx)
  3: '十二', // Min 3rd (approx)
  4: '十一', // Maj 3rd
  5: '十',   // P4
  7: '九',   // P5
  9: '八',   // Maj 6th (approx, sometimes 8.5)
  10: '七.六', // Min 7th approx
  11: '七.三', // Maj 7th approx
  12: '七',  // Octave
  14: '六.四', // Maj 9th
  15: '六.二', // Min 10th
  16: '六',    // Maj 10th
  17: '五.九', // P11
  19: '五',    // P12 (Octave + P5)
  21: '四.五', // Maj 13th
  24: '四',    // 2 Octaves
};

interface Position {
  string: number;
  hui: string;
  technique: HandTechnique;
}

const findPositionsForPitch = (targetMidi: number): Position[] => {
  const candidates: Position[] = [];

  STRING_PITCHES.forEach((openMidi, index) => {
    const stringNum = index + 1;
    const diff = targetMidi - openMidi;

    // 1. Check Open String
    if (diff === 0) {
      candidates.push({
        string: stringNum,
        hui: '散',
        technique: HandTechnique.San
      });
      return; 
    }

    // 2. Check Stopped String (An Yin)
    // We only look for positive diffs (cannot play lower than open string)
    // and reasonable range (e.g., up to 2 octaves + a bit)
    if (diff > 0 && diff <= 26) {
      // Find closest standard Hui
      // We check if the exact semitone exists in our map
      if (HUI_OFFSETS[diff]) {
        candidates.push({
          string: stringNum,
          hui: HUI_OFFSETS[diff],
          technique: HandTechnique.An
        });
      } else {
        // Fallback for accidentals not perfectly in the simple map
        // e.g., if diff is 1 (semitone), Guqin doesn't have a main Hui for it easily (13.something)
        // We find the closest key in HUI_OFFSETS
        const offsets = Object.keys(HUI_OFFSETS).map(Number);
        const closest = offsets.reduce((prev, curr) => 
          Math.abs(curr - diff) < Math.abs(prev - diff) ? curr : prev
        );
        
        // Only use if reasonably close (within 1 semitone? Guqin is fretless, so yes)
        if (Math.abs(closest - diff) <= 1) {
             candidates.push({
                string: stringNum,
                hui: HUI_OFFSETS[closest],
                technique: HandTechnique.An
             });
        }
      }
    }
  });

  return candidates;
};

export const mapNotesToGuqin = (notes: ParsedNote[]): GuqinNote[] => {
  let lastString = 0;

  return notes.map((note) => {
    if (note.isRest) {
      return {
        originalNote: note,
        string: 0,
        hui: '',
        technique: HandTechnique.Empty,
        rightHand: RightHand.None,
        leftHand: LeftHand.None,
        isValid: true
      };
    }

    // Filter out extremely low/high notes not playable
    // Lowest C2 (36), Highest typical ~D6
    const midi = note.absolutePitch;
    
    let candidates = findPositionsForPitch(midi);

    // If no candidates found (e.g. out of range or weird accidental), 
    // force a "closest" match logic or generic fallback
    if (candidates.length === 0) {
        // Try to map to string 7 upper register if high, string 1 if low
        if (midi < 36) candidates = [{ string: 1, hui: '散', technique: HandTechnique.San }];
        else candidates = [{ string: 7, hui: '四', technique: HandTechnique.An }];
    }

    // Selection Strategy:
    // 1. Prefer Open String if available
    // 2. Prefer Middle Strings (3,4,5) for mid-range
    // 3. Minimize string jump from last note
    
    // Sort candidates
    candidates.sort((a, b) => {
        // Priority 1: San (Open) is easiest/loudest
        if (a.technique === HandTechnique.San && b.technique !== HandTechnique.San) return -1;
        if (b.technique === HandTechnique.San && a.technique !== HandTechnique.San) return 1;

        // Priority 2: Minimize string distance
        const distA = Math.abs(a.string - (lastString || 4)); // Default to string 4 if first note
        const distB = Math.abs(b.string - (lastString || 4));
        if (distA !== distB) return distA - distB;

        // Priority 3: Prefer strings 5,6,7 for melody (higher positions usually clearer on thinner strings)
        return b.string - a.string;
    });

    const selected = candidates[0];
    lastString = selected.string;

    // Right Hand Logic
    // If open string -> usually Tiao or Gou based on string
    // Simplified: String 1-4 Gou/Da, 5-7 Tiao
    // Or if same string as previous -> can't allow quick repeat without alt technique?
    // Keep it simple for now
    let rh = RightHand.Tiao;
    if (selected.string <= 4) rh = RightHand.Gou;
    
    // Left Hand Logic
    let lh = LeftHand.None;
    if (selected.technique === HandTechnique.An) {
        // Use thumb (Da) for lower positions (larger Hui numbers, physically lower on body? No, Hui 13 is far left, Hui 1 is far right)
        // Actually: 
        // Hui 13-10: Left side (near head), usually Thumb (Da)
        // Hui 9-7: Middle, often Ring (Ming) or Middle (Zhong)
        // Hui < 7: High notes, often Ring (Ming)
        
        // Need to parse Hui string to number for heuristic
        // Rough heuristic:
        if (selected.hui.includes('十') || selected.hui === '九') {
            lh = LeftHand.Da;
        } else {
            lh = LeftHand.Ming;
        }
    }

    return {
      originalNote: note,
      string: selected.string,
      hui: selected.hui,
      technique: selected.technique,
      rightHand: rh,
      leftHand: lh,
      isValid: true
    };
  });
};