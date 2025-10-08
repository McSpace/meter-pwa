import { useState, useRef, useEffect } from 'react';
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
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const { isRecording, duration, startRecording, stopRecording, error: recordingError } = useAudioRecorder();

  // Listen for analysis completion events
  useEffect(() => {
    const handleAnalysisCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Feed] Analysis completed:', customEvent.detail);
      refetch();
    };

    window.addEventListener('media-analysis-completed', handleAnalysisCompleted);
    return () => window.removeEventListener('media-analysis-completed', handleAnalysisCompleted);
  }, [refetch]);

  // Pull-to-refresh functionality
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if we're at the top of the scroll
      if (container.scrollTop === 0) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartY === null || container.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;

      // Only allow pulling down (positive distance)
      if (distance > 0) {
        setPullDistance(Math.min(distance, 150)); // Max 150px
        // Prevent default scroll when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 80) {
        // Trigger refresh if pulled more than 80px
        setIsRefreshing(true);
        await refetch();
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      }
      setPullStartY(null);
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullStartY, pullDistance, refetch]);

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

      // Wait a bit for DB to update, then refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetch();

      // Wait another bit for data to appear in feed before removing pending
      await new Promise(resolve => setTimeout(resolve, 500));
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

      // Wait for DB and refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetch();
      await new Promise(resolve => setTimeout(resolve, 500));

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

        // Wait for DB to update, then refetch
        await new Promise(resolve => setTimeout(resolve, 500));
        await refetch();

        // Wait for data to appear in feed before removing pending
        await new Promise(resolve => setTimeout(resolve, 500));
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

  const handleRetryAnalysis = async (mediaId: string) => {
    try {
      await mediaService.retryAnalysis(mediaId);
      // Refetch to get updated status
      await refetch();
    } catch (error: any) {
      console.error('Retry analysis failed:', error);
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
    <div
      ref={feedContainerRef}
      className="overflow-y-auto h-screen"
      style={{
        WebkitOverflowScrolling: 'touch',
        transform: pullDistance > 0 ? `translateY(${pullDistance * 0.5}px)` : 'none',
        transition: pullStartY === null ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center"
          style={{
            height: `${pullDistance}px`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <div className={`${isRefreshing || pullDistance > 80 ? 'animate-spin' : ''}`}>
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}

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
            className={`bg-card-light dark:bg-card-dark p-4 rounded-lg border-2 transition-colors ${
              upload.status === 'uploading'
                ? 'border-primary animate-pulse'
                : 'border-border-light dark:border-border-dark'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground-light dark:text-foreground-dark">
                    {upload.type === 'photo' ? 'Photo' : 'Voice Note'}
                  </p>
                  {upload.status === 'uploading' && (
                    <>
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium text-primary">Uploading & Analyzing...</span>
                    </>
                  )}
                  {upload.status === 'error' && (
                    <span className="text-sm font-medium text-red-500">Failed</span>
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
                    <div className="mt-3 flex gap-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={entry.thumbnailUrl || entry.mediaUrl}
                          alt="Photo"
                          className={`rounded-lg max-w-[200px] h-auto cursor-pointer transition-opacity ${
                            entry.analysisStatus === 'analyzing' ? 'opacity-75' : 'hover:opacity-90'
                          }`}
                          onClick={() => window.open(entry.mediaUrl, '_blank')}
                        />
                        {entry.analysisStatus === 'analyzing' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 rounded-full p-3">
                              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Analysis Results */}
                      <div className="flex-1 min-w-0">
                        {entry.analysisStatus === 'analyzing' && (
                          <div className="flex items-center gap-2 text-primary">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Analyzing...</span>
                          </div>
                        )}

                        {entry.analysisStatus === 'completed' && entry.detectedMetrics && entry.detectedMetrics.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-subtle-light dark:text-subtle-dark flex items-center gap-1">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Detected:
                            </p>
                            {entry.detectedMetrics.map((metric, idx) => (
                              <div key={idx} className="bg-background-light dark:bg-background-dark rounded-lg p-2">
                                <p className="text-xs text-subtle-light dark:text-subtle-dark">{metric.type}</p>
                                <p className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
                                  {metric.value} {metric.unit}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.analysisStatus === 'completed' && (!entry.detectedMetrics || entry.detectedMetrics.length === 0) && (
                          <p className="text-xs text-subtle-light dark:text-subtle-dark">No metrics detected</p>
                        )}

                        {entry.analysisStatus === 'failed' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1 text-red-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-xs">Analysis failed</span>
                            </div>
                            {entry.analysisError && (
                              <p className="text-xs text-red-500">{entry.analysisError}</p>
                            )}
                            <button
                              onClick={() => handleRetryAnalysis(entry.id)}
                              className="text-xs text-primary hover:text-primary/80 underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {entry.analysisStatus === 'pending' && (
                          <p className="text-xs text-subtle-light dark:text-subtle-dark">Waiting for analysis...</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {entry.type === 'media' && entry.mediaType === 'voice' && (
                  <>
                    <p className="text-sm text-subtle-light dark:text-subtle-dark">Voice Note</p>
                    <div className="mt-3 flex gap-4">
                      {/* Compact Audio Player */}
                      {entry.mediaUrl && (
                        <div className="flex-shrink-0">
                          <audio
                            id={`audio-${entry.id}`}
                            preload="metadata"
                            className="hidden"
                            onEnded={() => setPlayingAudioId(null)}
                            onPause={() => setPlayingAudioId(null)}
                            onPlay={() => setPlayingAudioId(entry.id)}
                          >
                            <source src={entry.mediaUrl} type="audio/webm" />
                            <source src={entry.mediaUrl} type="audio/mp4" />
                          </audio>
                          <button
                            onClick={() => {
                              const audio = document.getElementById(`audio-${entry.id}`) as HTMLAudioElement;
                              if (audio.paused) {
                                audio.play();
                              } else {
                                audio.pause();
                              }
                            }}
                            className="w-12 h-12 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            {playingAudioId === entry.id ? (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      )}

                      {/* AI Analysis Results */}
                      <div className="flex-1 min-w-0">
                        {entry.analysisStatus === 'analyzing' && (
                          <div className="flex items-center gap-2 text-primary">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Analyzing audio...</span>
                          </div>
                        )}

                        {entry.analysisStatus === 'completed' && entry.detectedMetrics && entry.detectedMetrics.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-subtle-light dark:text-subtle-dark flex items-center gap-1">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Detected:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {entry.detectedMetrics.map((metric, idx) => (
                                <div key={idx} className="bg-background-light dark:bg-background-dark rounded-lg p-2">
                                  <p className="text-xs text-subtle-light dark:text-subtle-dark">{metric.type}</p>
                                  <p className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
                                    {metric.value} {metric.unit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.analysisStatus === 'completed' && (!entry.detectedMetrics || entry.detectedMetrics.length === 0) && (
                          <p className="text-xs text-subtle-light dark:text-subtle-dark">No metrics detected</p>
                        )}

                        {entry.analysisStatus === 'failed' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1 text-red-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-xs">Analysis failed</span>
                            </div>
                            {entry.analysisError && (
                              <p className="text-xs text-red-500">{entry.analysisError}</p>
                            )}
                            <button
                              onClick={() => handleRetryAnalysis(entry.id)}
                              className="text-xs text-primary hover:text-primary/80 underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {entry.analysisStatus === 'pending' && (
                          <p className="text-xs text-subtle-light dark:text-subtle-dark">Waiting for analysis...</p>
                        )}
                      </div>
                    </div>
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
    </div>
  );
}
