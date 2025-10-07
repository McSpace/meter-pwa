import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProfiles } from '@/hooks/useProfiles'
import { useProfile } from '@/contexts/ProfileContext'

export default function ProfileSwitcher() {
  const { profiles, loading } = useProfiles()
  const { selectedProfile, setSelectedProfile } = useProfile()

  // Auto-select first profile or restore from localStorage
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile) {
      const savedProfileId = localStorage.getItem('selectedProfileId')
      const profileToSelect = savedProfileId
        ? profiles.find(p => p.id === savedProfileId)
        : profiles[0]

      if (profileToSelect) {
        setSelectedProfile(profileToSelect)
      } else {
        setSelectedProfile(profiles[0])
      }
    }
  }, [profiles, selectedProfile, setSelectedProfile])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-foreground-dark/60">Loading...</span>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <Link
        to="/settings"
        className="text-center text-primary hover:text-primary/80 transition-colors"
      >
        Create Profile →
      </Link>
    )
  }

  const currentIndex = profiles.findIndex(p => p.id === selectedProfile?.id)

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : profiles.length - 1
    setSelectedProfile(profiles[newIndex])
  }

  const handleNext = () => {
    const newIndex = currentIndex < profiles.length - 1 ? currentIndex + 1 : 0
    setSelectedProfile(profiles[newIndex])
  }

  const showArrows = profiles.length > 1

  return (
    <div className="flex items-center justify-center gap-3 pt-10">
      {showArrows && (
        <button
          onClick={handlePrevious}
          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          aria-label="Previous profile"
        >
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="text-center min-w-[120px]">
        <h1 className="text-xl font-bold text-foreground-dark">
          {selectedProfile?.name || 'No Profile'}
        </h1>
        {selectedProfile && (
          <p className="text-xs text-foreground-dark/60 mt-0.5">
            {selectedProfile.age} years old
          </p>
        )}
      </div>

      {showArrows && (
        <button
          onClick={handleNext}
          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          aria-label="Next profile"
        >
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
