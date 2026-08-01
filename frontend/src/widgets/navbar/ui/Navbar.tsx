import { FormEvent, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, Settings, X } from 'lucide-react';
import { useAuth } from '@/features/auth/model/AuthContext';
import { initialsFromUsername } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Patterns', to: '/patterns' },
  { label: 'Explorer', to: '/explorer' },
  { label: 'Pipeline', to: '/pipeline' },
];

function NavItem({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex h-12 items-center px-2 text-body-medium transition-colors duration-ui ease-out',
          isActive ? 'text-text-primary after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-accent' : 'text-text-secondary hover:text-text-primary',
        )
      }
    >
      {label}
    </NavLink>
  );
}

function GlobalSearch({ onSearch }: { onSearch?: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim().toUpperCase();
    if (!normalized) return;
    navigate(`/companies/${encodeURIComponent(normalized)}`);
    setQuery('');
    onSearch?.();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full md:w-sidebar">
      <Input
        aria-label="Search companies"
        name="global-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search companies"
        leftIcon={<Search className="h-icon w-icon" aria-hidden="true" />}
      />
    </form>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsSettingsOpen(false);
    showToast('success', 'Logged out.');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4 px-4 md:px-6">
        <IconButton className="md:hidden" label="Open navigation" onClick={() => setIsMenuOpen(true)}>
          <Menu className="h-icon w-icon" aria-hidden="true" />
        </IconButton>

        <Link to="/" className="shrink-0 text-h2 text-text-primary">
          Signal Chain
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <GlobalSearch />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-strong bg-surface-raised text-small-medium text-text-primary" aria-label="User initials">
              {initialsFromUsername(user?.username ?? 'Signal Chain')}
            </div>
            <div className="relative">
              <IconButton label="Open settings" onClick={() => setIsSettingsOpen((open) => !open)}>
                <Settings className="h-icon w-icon" aria-hidden="true" />
              </IconButton>
              {isSettingsOpen ? (
                <div className="absolute right-0 top-full mt-2 w-sidebar rounded-card border border-border-strong bg-surface-raised p-4 shadow-popover">
                  <div className="border-b border-border pb-4">
                    <div className="text-body-medium text-text-primary">{user?.username}</div>
                    <div className="mt-1 text-small text-text-secondary">{user?.email}</div>
                  </div>
                  <Link to="/settings" onClick={() => setIsSettingsOpen(false)} className="mt-3 flex h-9 items-center gap-2 rounded-control px-2 text-body-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
                    <Settings className="h-icon w-icon" aria-hidden="true" /> Settings
                  </Link>
                  <Button className="mt-4" variant="ghost" leftIcon={<LogOut className="h-icon w-icon" aria-hidden="true" />} onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-canvas md:hidden">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link to="/" className="text-h2 text-text-primary" onClick={() => setIsMenuOpen(false)}>
              Signal Chain
            </Link>
            <IconButton label="Close navigation" onClick={() => setIsMenuOpen(false)}>
              <X className="h-icon w-icon" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="space-y-4 p-4">
            <GlobalSearch onSearch={() => setIsMenuOpen(false)} />
            <nav className="border-t border-border pt-4" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <NavItem key={item.to} to={item.to} label={item.label} onClick={() => setIsMenuOpen(false)} />
              ))}
            </nav>
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-strong bg-surface-raised text-small-medium text-text-primary">
                  {initialsFromUsername(user?.username ?? 'Signal Chain')}
                </div>
                <div>
                  <div className="text-body-medium text-text-primary">{user?.username}</div>
                  <div className="text-small text-text-secondary">{user?.email}</div>
                </div>
              </div>
              <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="mt-4 flex h-9 items-center gap-2 rounded-control px-2 text-body-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary">
                <Settings className="h-icon w-icon" aria-hidden="true" /> Settings
              </Link>
              <Button className="mt-4" variant="secondary" leftIcon={<LogOut className="h-icon w-icon" aria-hidden="true" />} onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
