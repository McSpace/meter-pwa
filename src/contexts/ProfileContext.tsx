import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { ProfileWithAge } from '@/types/database'

interface ProfileContextType {
  selectedProfile: ProfileWithAge | null
  setSelectedProfile: (profile: ProfileWithAge | null) => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithAge | null>(null)

  // Load selected profile from localStorage on mount
  useEffect(() => {
    const savedProfileId = localStorage.getItem('selectedProfileId')
    if (savedProfileId) {
      // Will be loaded from the profile list once available
      console.log('Saved profile ID:', savedProfileId)
    }
  }, [])

  // Save selected profile to localStorage when it changes
  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem('selectedProfileId', selectedProfile.id)
    } else {
      localStorage.removeItem('selectedProfileId')
    }
  }, [selectedProfile])

  return (
    <ProfileContext.Provider value={{ selectedProfile, setSelectedProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return context
}
