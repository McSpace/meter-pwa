import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProfiles } from '@/hooks/useProfiles'
import * as profileService from '@/services/profile.service'

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Settings({ darkMode, setDarkMode }: SettingsProps) {
  const { user, signOut } = useAuth()
  const { profiles, refetch } = useProfiles()
  const navigate = useNavigate()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M')
  const [dateOfBirth, setDateOfBirth] = useState('')

  // Auto-open create form if no profiles
  useEffect(() => {
    if (profiles.length === 0 && !showCreateForm) {
      setShowCreateForm(true)
    }
  }, [profiles.length, showCreateForm])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

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
      setShowCreateForm(false)
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
      setShowCreateForm(false)
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
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <h1 className="text-xl font-bold text-center text-foreground-light dark:text-foreground-dark">
          Settings
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Profiles Management */}
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
          <h2 className="font-medium text-foreground-light dark:text-foreground-dark mb-3">Profiles</h2>

          {/* Profile List */}
          <div className="space-y-2 mb-4">
            {profiles.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-primary/10"
              >
                <div>
                  <p className="font-medium text-foreground-light dark:text-foreground-dark">{profile.name}</p>
                  <p className="text-sm text-subtle-light dark:text-subtle-dark">
                    {profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Other'}, {profile.age} years old
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(profile.id)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    disabled={loading}
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

          {/* Create/Edit Form */}
          {(showCreateForm || editingId) ? (
            <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-primary/20">
              <h3 className="text-sm font-medium text-foreground-light dark:text-foreground-dark">
                {editingId ? 'Edit Profile' : 'Create Profile'}
              </h3>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Name"
                className="w-full px-3 py-2 rounded-lg bg-card-light dark:bg-card-dark border border-border-light dark:border-primary/20 text-foreground-light dark:text-foreground-dark placeholder:text-subtle-light dark:placeholder:text-subtle-dark focus:outline-none focus:border-primary transition-colors text-sm"
              />

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}
                required
                className="w-full px-3 py-2 rounded-lg bg-card-light dark:bg-card-dark border border-border-light dark:border-primary/20 text-foreground-light dark:text-foreground-dark focus:outline-none focus:border-primary transition-colors text-sm"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>

              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-lg bg-card-light dark:bg-card-dark border border-border-light dark:border-primary/20 text-foreground-light dark:text-foreground-dark focus:outline-none focus:border-primary transition-colors text-sm"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setShowCreateForm(false)
                  }}
                  className="flex-1 py-2 rounded-lg bg-card-light dark:bg-card-dark border border-border-light dark:border-primary/20 text-foreground-light dark:text-foreground-dark font-medium hover:bg-background-light dark:hover:bg-primary/10 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-primary text-background-dark font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2 bg-primary text-background-dark rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
            >
              Add New Profile
            </button>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
          <h2 className="font-medium text-foreground-light dark:text-foreground-dark mb-3">Account</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-light dark:text-foreground-dark">
                  {user?.email || 'Anonymous'}
                </p>
                <p className="text-xs text-subtle-light dark:text-subtle-dark">
                  {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-foreground-light dark:text-foreground-dark">Dark Mode</p>
              <p className="text-sm text-subtle-light dark:text-subtle-dark">Toggle dark theme</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary' : 'bg-subtle-light dark:bg-subtle-dark'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
          <h2 className="font-medium text-foreground-light dark:text-foreground-dark mb-2">About</h2>
          <p className="text-sm text-subtle-light dark:text-subtle-dark">
            Health Dashboard v1.0
          </p>
          <p className="text-sm text-subtle-light dark:text-subtle-dark mt-1">
            Track your health metrics
          </p>
        </div>
      </div>
    </>
  );
}
