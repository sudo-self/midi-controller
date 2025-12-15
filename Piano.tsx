import React, { useEffect, useState } from 'react';

interface PianoProps {
  onNotePlay: (frequency: number, note: string) => void;
  onNoteStop: (note: string) => void;
}

const Piano: React.FC<PianoProps> = ({ onNotePlay, onNoteStop }) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // Note frequencies for one octave starting from C4 with keyboard mappings
  const notes = [
    { note: 'C4', frequency: 261.63, type: 'white', position: 0, key: 'a' },
    { note: 'C#4', frequency: 277.18, type: 'black', position: 0, key: 'w' }, // Between C and D
    { note: 'D4', frequency: 293.66, type: 'white', position: 1, key: 's' },
    { note: 'D#4', frequency: 311.13, type: 'black', position: 1, key: 'e' }, // Between D and E
    { note: 'E4', frequency: 329.63, type: 'white', position: 2, key: 'd' },
    { note: 'F4', frequency: 349.23, type: 'white', position: 3, key: 'f' },
    { note: 'F#4', frequency: 369.99, type: 'black', position: 3, key: 't' }, // Between F and G
    { note: 'G4', frequency: 392.00, type: 'white', position: 4, key: 'g' },
    { note: 'G#4', frequency: 415.30, type: 'black', position: 4, key: 'y' }, // Between G and A
    { note: 'A4', frequency: 440.00, type: 'white', position: 5, key: 'h' },
    { note: 'A#4', frequency: 466.16, type: 'black', position: 5, key: 'u' }, // Between A and B
    { note: 'B4', frequency: 493.88, type: 'white', position: 6, key: 'j' },
  ];

  // Duplicate for second octave with different keyboard mappings
  const allNotes = [
    ...notes,
    ...notes.map(note => ({
      ...note,
      note: note.note.replace('4', '5'),
      frequency: note.frequency * 2,
      position: note.position + 7,
      key: note.key === 'a' ? 'k' :
           note.key === 'w' ? 'o' :
           note.key === 's' ? 'l' :
           note.key === 'e' ? 'p' :
           note.key === 'd' ? ';' :
           note.key === 'f' ? "'" :
           note.key === 't' ? ']' :
           note.key === 'g' ? 'Enter' :
           note.key === 'y' ? '\\' :
           note.key === 'h' ? 'z' :
           note.key === 'u' ? 'x' :
           note.key === 'j' ? 'c' : note.key
    }))
  ];

  const whiteKeys = allNotes.filter(note => note.type === 'white');
  const blackKeys = allNotes.filter(note => note.type === 'black');

  // Create a map for quick keyboard lookup
  const keyboardMap = new Map(allNotes.map(note => [note.key.toLowerCase(), note]));

  const handleKeyDown = (note: string, frequency: number) => {
    onNotePlay(frequency, note);
  };

  const handleKeyUp = (note: string) => {
    onNoteStop(note);
  };

  // Function to calculate black key position more accurately
  const getBlackKeyPosition = (blackKey: any) => {
    const whiteKeyWidth = 48;
    const blackKeyWidth = 30;
    const whiteKeySpacing = 50;
    
    // Position black keys between white keys with proper spacing
    const basePosition = blackKey.position * whiteKeySpacing;
    // Offset by about 2/3 of white key width to position between white keys
    const offset = whiteKeyWidth * 0.65;
    const leftPosition = basePosition + offset - (blackKeyWidth / 2);
    
    return leftPosition;
  };

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyboardDown = (event: KeyboardEvent) => {
      // Prevent default behavior for certain keys
      if (['Space', 'Enter', 'Tab'].includes(event.code)) {
        event.preventDefault();
      }

      const key = event.key.toLowerCase();
      const keyCode = event.code.toLowerCase();
      
      // Handle special keys
      let mappedKey = key;
      if (keyCode === 'enter') mappedKey = 'Enter';
      if (keyCode === 'semicolon') mappedKey = ';';
      if (keyCode === 'quote') mappedKey = "'";
      if (keyCode === 'bracketright') mappedKey = ']';
      if (keyCode === 'backslash') mappedKey = '\\';

      const noteData = keyboardMap.get(mappedKey);
      if (noteData && !pressedKeys.has(mappedKey)) {
        setPressedKeys(prev => new Set(prev).add(mappedKey));
        handleKeyDown(noteData.note, noteData.frequency);
      }
    };

    const handleKeyboardUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const keyCode = event.code.toLowerCase();
      
      // Handle special keys
      let mappedKey = key;
      if (keyCode === 'enter') mappedKey = 'Enter';
      if (keyCode === 'semicolon') mappedKey = ';';
      if (keyCode === 'quote') mappedKey = "'";
      if (keyCode === 'bracketright') mappedKey = ']';
      if (keyCode === 'backslash') mappedKey = '\\';

      const noteData = keyboardMap.get(mappedKey);
      if (noteData && pressedKeys.has(mappedKey)) {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(mappedKey);
          return newSet;
        });
        handleKeyUp(noteData.note);
      }
    };

    window.addEventListener('keydown', handleKeyboardDown);
    window.addEventListener('keyup', handleKeyboardUp);

    return () => {
      window.removeEventListener('keydown', handleKeyboardDown);
      window.removeEventListener('keyup', handleKeyboardUp);
    };
  }, [pressedKeys]);

  // Check if a key is currently pressed (for visual feedback)
  const isKeyPressed = (keyboardKey: string) => {
    return pressedKeys.has(keyboardKey.toLowerCase());
  };

  return (
    <div className="relative mx-auto" style={{ width: '700px', height: '200px' }}>
      {/* White keys */}
      {whiteKeys.map((key) => (
        <button
          key={key.note}
          className={`absolute border border-gray-300 transition-colors duration-75 rounded-b-lg shadow-sm ${
            isKeyPressed(key.key) 
              ? 'bg-gray-300 border-gray-400' 
              : 'bg-white hover:bg-gray-100 active:bg-gray-200'
          }`}
          style={{
            left: `${key.position * 50}px`,
            width: '48px',
            height: '200px',
            zIndex: 1
          }}
          onMouseDown={() => handleKeyDown(key.note, key.frequency)}
          onMouseUp={() => handleKeyUp(key.note)}
          onMouseLeave={() => handleKeyUp(key.note)}
        >
          <span className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
            {key.note.replace(/[0-9]/g, '')}
          </span>
          <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
            {key.key === 'Enter' ? '↵' : key.key.toUpperCase()}
          </span>
        </button>
      ))}
      
      {/* Black keys */}
      {blackKeys.map((key) => (
        <button
          key={key.note}
          className={`absolute transition-colors duration-75 rounded-b-lg shadow-lg ${
            isKeyPressed(key.key)
              ? 'bg-gray-600 border border-gray-500'
              : 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700'
          }`}
          style={{
            left: `${getBlackKeyPosition(key)}px`,
            width: '30px',
            height: '120px',
            zIndex: 2
          }}
          onMouseDown={() => handleKeyDown(key.note, key.frequency)}
          onMouseUp={() => handleKeyUp(key.note)}
          onMouseLeave={() => handleKeyUp(key.note)}
        >
          <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white font-mono bg-gray-800 px-1 rounded">
            {key.key.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Piano;
