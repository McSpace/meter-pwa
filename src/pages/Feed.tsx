import { useState, useRef } from 'react';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { useProfile } from '@/contexts/ProfileContext';
import { useFeedEntries, metricLabels } from '@/hooks/useFeedEntries';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import * as mediaService from '@/services/media.service';

interface PendingUpload {
  id: string;
  previewUrl?: string;
  file: File | Blob;
  status: 'uploading' | 'error';
  error?: string;
  type: 'photo' | 'voice';
  duration?: number; // for voice recordings
}

export default function Feed() {
  const { selectedProfile } = useProfile();
  const { entries, loading, refetch } = useFeedEntries(selectedProfile?.id || null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, duration, startRecording, stopRecording, error: recordingError } = useAudioRecorder();

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProfile) return;

    // Create optimistic preview
    const uploadId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    setPendingUploads(prev => [...prev, {
      id: uploadId,
      previewUrl,
      file,
      status: 'uploading',
      type: 'photo',
    }]);

    try {
      // Upload to storage
      await mediaService.uploadMedia({
        profileId: selectedProfile.id,
        file,
        type: 'photo',
      });

      // Refetch entries to show the new photo
      await refetch();

      // Remove from pending
      setPendingUploads(prev => prev.filter(u => u.id !== uploadId));
      URL.revokeObjectURL(previewUrl);
    } catch (error: any) {
      // Update to error state
      setPendingUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, status: 'error', error: error.message }
          : u
      ));
    }
  };

  const handleRetryUpload = async (upload: PendingUpload) => {
    if (!selectedProfile) return;

    setPendingUploads(prev => prev.map(u =>
      u.id === upload.id ? { ...u, status: 'uploading' as const, error: undefined } : u
    ));

    try {
      await mediaService.uploadMedia({
        profileId: selectedProfile.id,
        file: upload.file,
        type: 'photo',
      });

      // Refetch entries
      await refetch();

      setPendingUploads(prev => prev.filter(u => u.id !== upload.id));
      if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
    } catch (error: any) {
      setPendingUploads(prev => prev.map(u =>
        u.id === upload.id
          ? { ...u, status: 'error', error: error.message }
          : u
      ));
    }
  };

  const handleCancelUpload = (uploadId: string) => {
    setPendingUploads(prev => {
      const upload = prev.find(u => u.id === uploadId);
      if (upload?.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      return prev.filter(u => u.id !== uploadId);
    });
  };

  const handleVoiceRecord = async () => {
    if (!selectedProfile) return;

    if (isRecording) {
      // Stop recording
      const audioBlob = await stopRecording();

      if (!audioBlob) {
        console.error('No audio recorded');
        return;
      }

      // Create pending upload
      const uploadId = crypto.randomUUID();

      setPendingUploads(prev => [...prev, {
        id: uploadId,
        file: audioBlob,
        status: 'uploading',
        type: 'voice',
        duration,
      }]);

      try {
        // Upload to storage
        await mediaService.uploadMedia({
          profileId: selectedProfile.id,
          file: audioBlob,
          type: 'voice',
        });

        // Refetch entries
        await refetch();

        // Remove from pending
        setPendingUploads(prev => prev.filter(u => u.id !== uploadId));
      } catch (error: any) {
        setPendingUploads(prev => prev.map(u =>
          u.id === uploadId
            ? { ...u, status: 'error', error: error.message }
            : u
        ));
      }
    } else {
      // Start recording
      await startRecording();
    }
  };

  if (!selectedProfile) {
    return (
      <>
        <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
          <ProfileSwitcher />
        </header>
        <div className="flex items-center justify-center h-64 text-subtle-light dark:text-subtle-dark">
          Please select or create a profile
        </div>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <ProfileSwitcher />
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* Recording Error */}
        {recordingError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {recordingError}
          </div>
        )}

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : null}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border-2 border-red-500 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-foreground-light dark:text-foreground-dark font-medium">Recording...</span>
              </div>
              <span className="text-2xl font-mono text-foreground-light dark:text-foreground-dark">
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Pending Uploads */}
        {pendingUploads.map((upload) => (
          <div
            key={upload.id}
            className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-subtle-light dark:text-subtle-dark">
                    {upload.type === 'photo' ? 'Photo' : 'Voice Note'}
                  </p>
                  {upload.status === 'uploading' && (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-primary">Uploading...</span>
                    </>
                  )}
                  {upload.status === 'error' && (
                    <span className="text-xs text-red-500">Failed</span>
                  )}
                </div>
                {upload.type === 'photo' && upload.previewUrl && (
                  <img
                    src={upload.previewUrl}
                    alt="Uploading"
                    className="mt-3 rounded-lg max-w-full h-auto opacity-75"
                  />
                )}
                {upload.type === 'voice' && upload.duration !== undefined && (
                  <p className="text-lg font-medium text-foreground-light dark:text-foreground-dark mt-2">
                    {Math.floor(upload.duration / 60)}:{(upload.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
                {upload.error && (
                  <p className="text-xs text-red-500 mt-2">{upload.error}</p>
                )}
                {upload.status === 'error' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleRetryUpload(upload)}
                      className="text-xs text-primary hover:text-primary/80 underline"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => handleCancelUpload(upload.id)}
                      className="text-xs text-red-500 hover:text-red-400 underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-subtle-light dark:text-subtle-dark">Now</p>
              </div>
            </div>
          </div>
        ))}

        {/* Real Entries */}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {entry.type === 'metric' && (
                  <>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">
                      {entry.metricType ? metricLabels[entry.metricType] : 'Unknown'}
                    </p>
                    <p className="text-2xl font-bold text-foreground-light dark:text-foreground-dark mt-1">
                      {entry.value} {entry.unit}
                    </p>
                  </>
                )}
                {entry.type === 'media' && entry.mediaType === 'photo' && (
                  <>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">Photo</p>
                    <img
                      src={entry.thumbnailUrl || entry.mediaUrl}
                      alt="Photo"
                      className="mt-3 rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(entry.mediaUrl, '_blank')}
                    />
                  </>
                )}
                {entry.type === 'media' && entry.mediaType === 'voice' && (
                  <>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">Voice Note</p>
                    {entry.mediaUrl && (
                      <audio
                        controls
                        className="mt-3 w-full max-w-md"
                        preload="metadata"
                      >
                        <source src={entry.mediaUrl} type="audio/webm" />
                        <source src={entry.mediaUrl} type="audio/mp4" />
                        Your browser does not support audio playback.
                      </audio>
                    )}
                  </>
                )}
                {entry.notes && (
                  <p className="text-sm text-subtle-light dark:text-subtle-dark mt-2">{entry.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-subtle-light dark:text-subtle-dark">{entry.date}</p>
                <p className="text-xs text-subtle-light dark:text-subtle-dark">{entry.time}</p>
              </div>
            </div>
          </div>
        ))}

        {!loading && entries.length === 0 && pendingUploads.length === 0 && (
          <div className="text-center py-12 text-subtle-light dark:text-subtle-dark">
            <p className="text-lg mb-2">No entries yet</p>
            <p className="text-sm">Start tracking by adding photos or metrics</p>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-3 z-20">
        {/* Voice Recording Button */}
        <button
          onClick={handleVoiceRecord}
          disabled={!selectedProfile}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-red-500 text-white'
              : 'bg-primary text-black hover:scale-105'
          }`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
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
          disabled={!selectedProfile || isRecording}
          className="w-14 h-14 bg-primary text-black rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
