interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Settings({ darkMode, setDarkMode }: SettingsProps) {
  return (
    <>
      <header className="sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 p-4">
        <h1 className="text-xl font-bold text-center text-foreground-light dark:text-foreground-dark">
          Settings
        </h1>
      </header>

      <div className="p-4 space-y-4">
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
            Track your health metrics offline
          </p>
        </div>

        {/* Data Management */}
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
          <h2 className="font-medium text-foreground-light dark:text-foreground-dark mb-2">Data</h2>
          <button className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            Clear All Data
          </button>
        </div>
      </div>
    </>
  );
}
