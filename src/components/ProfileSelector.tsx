import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProfiles } from '@/hooks/useProfiles'
import { useProfile } from '@/contexts/ProfileContext'

export default function ProfileSelector() {
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
      <div className="flex items-center gap-2 px-4 py-2 bg-card-dark rounded-lg border border-primary/20">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-foreground-dark/60">Loading profiles...</span>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <Link
        to="/settings"
        className="block px-4 py-3 bg-card-dark rounded-lg border border-primary/20 text-center hover:border-primary/40 transition-colors"
      >
        <p className="text-sm text-foreground-dark/60 mb-2">No profiles yet</p>
        <span className="text-primary font-medium">Create Profile in Settings →</span>
      </Link>
    )
  }

  return (
    <select
      value={selectedProfile?.id || ''}
      onChange={(e) => {
        const profile = profiles.find(p => p.id === e.target.value)
        if (profile) setSelectedProfile(profile)
      }}
      className="w-full px-4 py-2 bg-card-dark border border-primary/20 text-foreground-dark rounded-lg focus:outline-none focus:border-primary transition-colors"
    >
      {profiles.map(profile => (
        <option key={profile.id} value={profile.id}>
          {profile.name} ({profile.age} y.o.)
        </option>
      ))}
    </select>
  )
}
