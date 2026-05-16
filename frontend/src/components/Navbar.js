import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const [daralt, setDaralt] = useState(false);
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const location = useLocation();

  const bildirimSayisiniGetir = async () => {
    try {
      const token = localStorage.getItem('anigram_token');
      if (!token) return;
      const yanit = await fetch('http://localhost:3001/api/notifications/sayi', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const veri = await yanit.json();
      if (!veri.hata) setBildirimSayisi(veri.okunmamis_sayisi || 0);
    } catch (hata) {}
  };

  useEffect(() => {
    bildirimSayisiniGetir();
    const aralik = setInterval(bildirimSayisiniGetir, 5000);
    const handleBildirimOkundu = () => bildirimSayisiniGetir();
    window.addEventListener('bildirimOkundu', handleBildirimOkundu);
    return () => {
      clearInterval(aralik);
      window.removeEventListener('bildirimOkundu', handleBildirimOkundu);
    };
  }, []);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={'sidebar-premium' + (daralt ? ' daraltilmis' : '')}>
      <div className="sidebar-logo-alan">
        <Link to="/" className="sidebar-logo-link">
          <span className="logo-text-gradient">{daralt ? 'A' : 'AniGram'}</span>
        </Link>
        <button
          className="sidebar-daralt-buton"
          onClick={() => setDaralt(!daralt)}
          title={daralt ? 'Genislet' : 'Daralt'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: daralt ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div className="sidebar-nav-premium">
        <Link
          to="/"
          className={'nav-link-premium' + (isActive('/') ? ' active' : '')}
          title={daralt ? 'Ana Sayfa' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Ana Sayfa</span>}
        </Link>

        <Link
          to="/explore"
          className={'nav-link-premium' + (isActive('/explore') ? ' active' : '')}
          title={daralt ? 'Kesfet' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Kesfet</span>}
        </Link>

        <Link
          to="/messages"
          className={'nav-link-premium' + (isActive('/messages') ? ' active' : '')}
          title={daralt ? 'Mesajlar' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Mesajlar</span>}
        </Link>

        <Link
          to="/notifications"
          className={'nav-link-premium' + (isActive('/notifications') ? ' active' : '')}
          title={daralt ? 'Bildirimler' : ''}
        >
          <span className="nav-icon-premium" style={{ position: 'relative' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {bildirimSayisi > 0 && (
              <span className="bildirim-sayisi-badge">
                {bildirimSayisi > 99 ? '99+' : bildirimSayisi}
              </span>
            )}
          </span>
          {!daralt && <span className="nav-label-premium">Bildirimler</span>}
        </Link>

        <Link
          to="/create"
          className="nav-link-premium nav-special"
          title={daralt ? 'Olustur' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Olustur</span>}
        </Link>

        <Link
          to={'/profil/' + user?.username}
          className={'nav-link-premium' + (isActive('/profil') ? ' active' : '')}
          title={daralt ? 'Profil' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Profil</span>}
        </Link>
      </div>

      <div className="sidebar-bottom-premium">
        <Link
          to="/settings"
          className={'nav-link-premium' + (isActive('/settings') ? ' active' : '')}
          title={daralt ? 'Ayarlar' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Ayarlar</span>}
        </Link>

        <button
          className="logout-btn-premium"
          onClick={onLogout}
          title={daralt ? 'Cikis' : ''}
        >
          <span className="nav-icon-premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          {!daralt && <span className="nav-label-premium">Cikis</span>}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;