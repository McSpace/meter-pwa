import { useState, useEffect } from 'react'
import { useProfiles } from '@/hooks/useProfiles'
import * as profileService from '@/services/profile.service'

interface ProfileManagerProps {
  onClose: () => void
}

export default function ProfileManager({ onClose }: ProfileManagerProps) {
  const { profiles, refetch } = useProfiles()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Block body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Form state
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M')
  const [dateOfBirth, setDateOfBirth] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await profileService.createProfile({
        name,
        gender,
        date_of_birth: dateOfBirth,
      })
      await refetch()
      resetForm()
      setMode('list')
    } catch (err: any) {
      setError(err.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId)
    if (profile) {
      setEditingId(profileId)
      setName(profile.name)
      setGender(profile.gender)
      setDateOfBirth(profile.date_of_birth)
      setMode('edit')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    setLoading(true)
    setError(null)

    try {
      await profileService.updateProfile(editingId, {
        name,
        gender,
        date_of_birth: dateOfBirth,
      })
      await refetch()
      resetForm()
      setMode('list')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return

    setLoading(true)
    setError(null)

    try {
      await profileService.deleteProfile(profileId)
      await refetch()
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setGender('M')
    setDateOfBirth('')
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card-dark rounded-2xl max-w-md w-full my-8 border border-primary/20">
        {/* Header */}
        <div className="bg-card-dark border-b border-primary/20 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-foreground-dark">
            {mode === 'create' ? 'Create Profile' : mode === 'edit' ? 'Edit Profile' : 'Manage Profiles'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-foreground-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {mode === 'list' && (
            <>
              <div className="space-y-2 mb-4">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 bg-background-dark rounded-lg border border-primary/10"
                  >
                    <div>
                      <p className="font-medium text-foreground-dark">{profile.name}</p>
                      <p className="text-sm text-foreground-dark/60">
                        {profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Other'}, {profile.age} years old
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(profile.id)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMode('create')}
                className="w-full py-3 bg-primary text-background-dark rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Add New Profile
              </button>
            </>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <form onSubmit={mode === 'create' ? handleCreate : handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground-dark mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-background-dark border border-primary/20 text-foreground-dark placeholder:text-foreground-dark/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-foreground-dark mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-background-dark border border-primary/20 text-foreground-dark focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-foreground-dark mb-2">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-lg bg-background-dark border border-primary/20 text-foreground-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setMode('list')
                  }}
                  className="flex-1 py-3 rounded-lg bg-background-dark border border-primary/20 text-foreground-dark font-medium hover:bg-primary/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-primary text-background-dark font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
