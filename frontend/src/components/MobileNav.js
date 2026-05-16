import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MobileNav.css';

function MobileNav({ user }) {
  const location = useLocation();
  const [bildirimSayisi, setBildirimSayisi] = useState(0);

  const bildirimSayisiniGetir = async () => {
    try {
      const token = localStorage.getItem('anigram_token');
      if (!token) return;
      const yanit = await fetch('http://localhost:3001/api/notifications/sayi', { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) setBildirimSayisi(veri.okunmamis_sayisi || 0);
    } catch (hata) {}
  };

  useEffect(() => {
    bildirimSayisiniGetir();
    const aralik = setInterval(bildirimSayisiniGetir, 5000);
    const handleBildirimOkundu = () => bildirimSayisiniGetir();
    window.addEventListener('bildirimOkundu', handleBildirimOkundu);
    return () => { clearInterval(aralik); window.removeEventListener('bildirimOkundu', handleBildirimOkundu); };
  }, []);

  const isActive = (path) => { if (path === '/') return location.pathname === '/'; return location.pathname.startsWith(path); };

  return (
    <nav className="mobile-nav-premium">
      <Link to="/" className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span className="mobile-nav-text">Ana</span></Link>
      <Link to="/explore" className={`mobile-nav-link ${isActive('/explore') ? 'active' : ''}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span className="mobile-nav-text">Kesfet</span></Link>
      <Link to="/" className="mobile-create-btn-premium"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></Link>
      <Link to="/notifications" className={`mobile-nav-link ${isActive('/notifications') ? 'active' : ''}`}>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {bildirimSayisi > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: '#FF3040', color: 'white', fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{bildirimSayisi > 99 ? '99+' : bildirimSayisi}</span>}
        </span>
        <span className="mobile-nav-text">Bildirim</span>
      </Link>
      <Link to={`/profil/${user?.username}`} className={`mobile-nav-link ${isActive('/profile') ? 'active' : ''}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="mobile-nav-text">Profil</span></Link>
    </nav>
  );
}

export default MobileNav;