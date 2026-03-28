import { type ReactNode, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useDisplays } from '../hooks/useDisplays';
import { useWebSocket } from '../hooks/useWebSocket';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SettingsModal } from '../components/modals/SettingsModal';
import { HotkeysModal } from '../components/modals/HotkeysModal';
import { DisplayStatus } from '@screen-commander/shared';
import './AppShell.css';

const navItems = [
  { to: '/', label: 'לוח בקרה', icon: '▦' },
  { to: '/messages', label: 'הודעות', icon: '✉' },
  { to: '/running-messages', label: 'הודעות רצות', icon: '📰' },
  { to: '/scheduler', label: 'תזמון', icon: '⏱' },
  { to: '/detect', label: 'זיהוי מסכים', icon: '🖥' },
  { to: '/alerts', label: 'התרעות', icon: '🚨' },
];

const systemItems = [
  { to: '/analytics', label: 'אנליטיקס', icon: '📊' },
];

export function AppShell() {
  const { data: displays } = useDisplays();
  const { connected } = useWebSocket();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);

  const activeCount = displays?.filter((d) => d.status === DisplayStatus.ONLINE || d.status === DisplayStatus.PLAYING).length ?? 0;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">ScreenCommander</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-label">ניהול</div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                }
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">מסכים פעילים</div>
            <div className="sidebar-displays">
              {displays && displays.length > 0 ? (
                displays
                  .filter((d) => d.isEnabled)
                  .map((d) => (
                    <div key={d.id} className="sidebar-display-item">
                      <span
                        className={`sidebar-display-dot sidebar-display-dot--${
                          d.status === DisplayStatus.ERROR
                            ? 'error'
                            : d.status === DisplayStatus.ONLINE || d.status === DisplayStatus.PLAYING
                              ? 'online'
                              : 'offline'
                        }`}
                      />
                      {d.name}
                    </div>
                  ))
              ) : (
                <div className="sidebar-display-item" style={{ color: 'var(--text-muted)' }}>
                  אין מסכים פעילים
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">מערכת</div>
            {systemItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                }
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/detect" style={{ textDecoration: 'none' }}>
            <Button variant="primary" fullWidth size="sm">
              + הוסף מסך חדש
            </Button>
          </NavLink>
        </div>
      </aside>

      {/* Main area */}
      <div className="app-main-wrapper">
        <header className="app-topnav">
          <div className="topnav-left">
            <div className="topnav-status">
              <Badge variant={connected ? 'accent' : 'red'} pulse={connected}>
                {connected ? 'מחובר' : 'מנותק'}
              </Badge>
              <Badge variant="default">
                {activeCount} מסכים פעילים
              </Badge>
            </div>
          </div>
          <div className="topnav-right">
            <button
              className="topnav-icon-btn"
              onClick={() => setHotkeysOpen(true)}
              title="קיצורי מקלדת"
            >
              ⌨
            </button>
            <button
              className="topnav-icon-btn"
              onClick={() => setSettingsOpen(true)}
              title="הגדרות"
            >
              ⚙
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HotkeysModal open={hotkeysOpen} onClose={() => setHotkeysOpen(false)} />
    </div>
  );
}
