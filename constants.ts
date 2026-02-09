import { GuqinTuning } from './types';

// Pitches are roughly C2 (36) to D3 (50) for Open Strings 1-7 in Standard Tuning (1=F, so 5 6 1 2 3 5 6)
// Note: Many MIDI files notate Guqin an octave higher (C3-D4). The new mapper handles this via "Solfege Matching".
export const TUNINGS: GuqinTuning[] = [
  {
    id: 'zheng_diao',
    name: '正调 (Standard)',
    description: 'F Major Pentatonic (1=F)',
    solfege: '5 6 1 2 3 5 6',
    pitches: [36, 38, 41, 43, 45, 48, 50] 
  },
  {
    id: 'man_jiao',
    name: '慢角 (Man Jiao)',
    description: 'Slack 3rd String',
    solfege: '1 2 3 5 6 1 2',
    pitches: [36, 38, 40, 43, 45, 48, 50]
  },
  {
    id: 'ruibin',
    name: '蕤宾 (Ruibin)',
    description: 'Raise 5th String',
    solfege: '2 3 5 6 7 2 3',
    pitches: [36, 38, 41, 43, 46, 48, 50]
  },
];

export const DEFAULT_TUNING = TUNINGS[0];

// Corrected Sample XML for "Xian Weng Cao" (First few measures)
export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>仙翁操</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Guqin</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key>
          <fifths>-1</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>3</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>3</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>3</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>3</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="3">
       <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>3</octave>
        </pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`;