import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Kesfet from './pages/Explore';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import PostDetail from './pages/PostDetail';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';

function App() {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [banli, setBanli] = useState(false);
  const [banBilgi, setBanBilgi] = useState(null);
  const [mobil, setMobil] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const kayitliToken = localStorage.getItem('anigram_token');
    if (kayitliToken) { tokenKontrol(kayitliToken); }
    else { setYukleniyor(false); }
    const boyutKontrol = () => setMobil(window.innerWidth <= 768);
    window.addEventListener('resize', boyutKontrol);
    return () => window.removeEventListener('resize', boyutKontrol);
  }, []);

  const tokenKontrol = async (token) => {
    try {
      const yanit = await fetch('http://localhost:3001/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
      if (yanit.ok) {
        const veri = await yanit.json();
        if (!veri.hata && veri.kullanici) { banKontrol(veri.kullanici.id); setKullanici(veri.kullanici); setYukleniyor(false); return; }
      }
      localStorage.removeItem('anigram_token'); setYukleniyor(false);
    } catch (hata) { setYukleniyor(false); }
  };

  const banKontrol = async (userId) => {
    try {
      const yanit = await fetch('http://localhost:3001/api/admin/check-ban/' + userId);
      const veri = await yanit.json();
      if (veri.banned) { setBanli(true); setBanBilgi({ sebep: veri.ban_sebebi, kalan: veri.kalan_saat }); localStorage.removeItem('anigram_token'); setKullanici(null); }
      else { setBanli(false); setBanBilgi(null); }
    } catch (hata) { setBanli(false); }
  };

  const girisYap = (kullaniciVerisi, token) => {
    banKontrol(kullaniciVerisi.id);
    if (!banli) { localStorage.setItem('anigram_token', token); setKullanici(kullaniciVerisi); }
  };

  const cikisYap = () => { localStorage.removeItem('anigram_token'); setKullanici(null); };

  if (yukleniyor) {
    return (<div className="yukleniyor-ekran"><div className="yukleniyor-icerik"><div className="yukleniyor-spinner"></div><p className="yukleniyor-yazi">AniGram Yukleniyor...</p></div></div>);
  }

  if (banli) {
    return (
      <div className="banli-ekran">
        <div className="banli-icerik">
          <div className="banli-ikon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF4757" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <h1 className="banli-baslik">Hesabınız Banlandı</h1>
          {banBilgi?.kalan && <p className="banli-kalan">{banBilgi.kalan} saat sonra banınız açılacak</p>}
          {banBilgi?.sebep && <p className="banli-sebep">Sebep: {banBilgi.sebep}</p>}
          <p className="banli-alt">Topluluk kurallarımızı ihlal ettiğiniz için hesabınız geçici olarak askıya alınmıştır.</p>
          <button className="banli-buton" onClick={() => { localStorage.removeItem('anigram_token'); window.location.href = '/login'; }}>Giris Sayfasina Don</button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="uygulama">
        {!kullanici ? (
          <div className="kimlik-duzeni">
            <Routes>
              <Route path="/login" element={<Login onLogin={girisYap} />} />
              <Route path="/register" element={<Register onLogin={girisYap} />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        ) : (
          <div className="ana-duzen">
            {!mobil && <Navbar user={kullanici} onLogout={cikisYap} />}
            <main className="ana-icerik">
              <Routes>
                <Route path="/" element={<Feed user={kullanici} />} />
                <Route path="/explore" element={<Kesfet user={kullanici} />} />
                <Route path="/notifications" element={<Notifications user={kullanici} />} />
                <Route path="/messages" element={<Messages user={kullanici} />} />
                <Route path="/messages/:userId" element={<Messages user={kullanici} />} />
                <Route path="/profil/:username" element={<Profile user={kullanici} />} />
                <Route path="/profile/:username" element={<Profile user={kullanici} />} />
                <Route path="/post/:postId" element={<PostDetail user={kullanici} />} />
                <Route path="/settings" element={<Settings user={kullanici} onLogout={cikisYap} />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            {mobil && <MobileNav user={kullanici} />}
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;