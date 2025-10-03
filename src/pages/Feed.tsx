import { useState, useRef } from 'react';

interface Entry {
  date: string;
  metric: string;
  value: string;
  time: string;
  type: 'data' | 'photo' | 'voice';
  imageUrl?: string;
}

export default function Feed() {
  const [entries, setEntries] = useState<Entry[]>([
    { date: '2024-10-02', metric: 'Weight', value: '150 lbs', time: '08:30 AM', type: 'data' },
    { date: '2024-10-01', metric: 'Pulse', value: '72 bpm', time: '07:15 AM', type: 'data' },
    { date: '2024-10-01', metric: 'Blood Pressure', value: '120/80 mmHg', time: '07:10 AM', type: 'data' },
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const now = new Date();
      const newEntry: Entry = {
        date: now.toISOString().split('T')[0],
        metric: 'Photo',
        value: file.name,
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: 'photo',
        imageUrl: URL.createObjectURL(file)
      };
      setEntries([newEntry, ...entries]);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      // Stop recording logic would go here
      const now = new Date();
      const newEntry: Entry = {
        date: now.toISOString().split('T')[0],
        metric: 'Voice Note',
        value: 'Audio recording',
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: 'voice'
      };
      setEntries([newEntry, ...entries]);
    } else {
      setIsRecording(true);
      // Start recording logic would go here
    }
  };

  return (
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <h1 className="text-xl font-bold text-center text-foreground-light dark:text-foreground-dark">
          Feed
        </h1>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* Entries List */}
        {entries.map((entry, index) => (
          <div
            key={index}
            className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-subtle-light dark:text-subtle-dark">{entry.metric}</p>
                <p className="text-2xl font-bold text-foreground-light dark:text-foreground-dark mt-1">
                  {entry.value}
                </p>
                {entry.type === 'photo' && entry.imageUrl && (
                  <img
                    src={entry.imageUrl}
                    alt="Captured"
                    className="mt-3 rounded-lg max-w-full h-auto"
                  />
                )}
                {entry.type === 'voice' && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm">Play recording</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-subtle-light dark:text-subtle-dark">{entry.date}</p>
                <p className="text-xs text-subtle-light dark:text-subtle-dark">{entry.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-3 z-20">
        {/* Voice Recording Button */}
        <button
          onClick={handleVoiceRecord}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-primary text-black hover:scale-105'
          }`}
          aria-label="Voice recording"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {isRecording ? (
              <rect x="9" y="9" width="6" height="6" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>

        {/* Photo Capture Button */}
        <button
          onClick={handlePhotoCapture}
          className="w-14 h-14 bg-primary text-black rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Take photo"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
