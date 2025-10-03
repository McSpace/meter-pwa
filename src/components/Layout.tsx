import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen justify-between bg-background-light dark:bg-background-dark font-display">
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>

      <nav className="bg-card-light dark:bg-card-dark border-t border-border-light dark:border-border-dark p-2">
        <div className="flex justify-around items-center">
          <Link
            to="/feed"
            className={`flex flex-col items-center gap-1 p-2 ${
              location.pathname === '/feed'
                ? 'text-primary'
                : 'text-subtle-light dark:text-subtle-dark'
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-3 8h.01M17 10h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`text-xs ${location.pathname === '/feed' ? 'font-bold' : ''}`}>Feed</span>
          </Link>

          <Link
            to="/"
            className={`flex flex-col items-center gap-1 p-2 ${
              location.pathname === '/'
                ? 'text-primary'
                : 'text-subtle-light dark:text-subtle-dark'
            }`}
          >
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
            </svg>
            <span className={`text-xs ${location.pathname === '/' ? 'font-bold' : ''}`}>Dashboard</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 p-2 ${
              location.pathname === '/settings'
                ? 'text-primary'
                : 'text-subtle-light dark:text-subtle-dark'
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`text-xs ${location.pathname === '/settings' ? 'font-bold' : ''}`}>Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
