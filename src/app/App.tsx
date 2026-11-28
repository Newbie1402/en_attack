import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { BattlefieldPage } from '../pages/BattlefieldPage';
import { BestiaryPage } from '../pages/BestiaryPage';
import { CampaignPage } from '../pages/CampaignPage';
import { HomePage } from '../pages/HomePage';
import { SandboxPage } from '../pages/SandboxPage';
import { SettingsPage } from '../pages/SettingsPage';

const navigation = [
  { href: '/', label: 'Trang chủ' },
  { href: '/campaign', label: 'Chiến dịch' },
  { href: '/sandbox', label: 'Phòng thí nghiệm' },
  { href: '/bestiary', label: 'Bách khoa' },
  { href: '/settings', label: 'Cài đặt' },
];

export function App(): React.JSX.Element {
  const location = useLocation();
  const isGameplay = location.pathname.startsWith('/play/');
  return (
    <div className={isGameplay ? 'app-shell gameplay-shell' : 'app-shell'}>
      {!isGameplay && (
        <header className="topbar">
          <NavLink className="brand-lockup" to="/" aria-label="SnowGraph trang chủ">
            <span className="brand-mark" aria-hidden="true">
              ✦
            </span>
            <span>
              <strong>SnowGraph</strong>
              <small>The Swallow Defense</small>
            </span>
          </NavLink>
          <nav aria-label="Điều hướng chính">
            {navigation.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                end={item.href === '/'}
                key={item.href}
                to={item.href}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
      )}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/play/:levelId" element={<BattlefieldPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
          <Route path="/bestiary" element={<BestiaryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
