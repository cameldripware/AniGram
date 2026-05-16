import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Notifications.css';

function Notifications({ user }) {
  const [bildirimler, setBildirimler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifFiltre, setAktifFiltre] = useState('tumu');
  const [ayarlar, setAyarlar] = useState({ begeni: true, yorum: true, takip: true, mesaj: true, mention: true });
  const [ayarlarAcik, setAyarlarAcik] = useState(false);

  useEffect(() => { bildirimleriGetir(); bildirimAyarlariniGetir(); }, [aktifFiltre]);

  const bildirimleriGetir = async () => {
    try {
      setYukleniyor(true);
      const token = localStorage.getItem('anigram_token');
      const url = aktifFiltre !== 'tumu' 
        ? 'http://localhost:3001/api/notifications?tip=' + aktifFiltre 
        : 'http://localhost:3001/api/notifications';
      const yanit = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) setBildirimler(veri.bildirimler || []);
    } catch (hata) {} finally { setYukleniyor(false); }
  };

  const bildirimAyarlariniGetir = async () => {
    try {
      const token = localStorage.getItem('anigram_token');
      const yanit = await fetch('http://localhost:3001/api/notifications/ayarlar', { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) setAyarlar(veri.ayarlar);
    } catch (hata) {}
  };

  const bildirimOku = async (bildirimId) => {
    const token = localStorage.getItem('anigram_token');
    try {
      await fetch('http://localhost:3001/api/notifications/okundu', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bildirim_id: bildirimId })
      });
      setBildirimler(onceki => onceki.map(b => b.id === bildirimId ? { ...b, is_read: true } : b));
    } catch (hata) {}
  };

  const tumunuOku = async () => {
    const token = localStorage.getItem('anigram_token');
    try {
      await fetch('http://localhost:3001/api/notifications/okundu', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      setBildirimler(onceki => onceki.map(b => ({ ...b, is_read: true })));
    } catch (hata) {}
  };

  const ayarlariGuncelle = async (alan, deger) => {
    const yeniAyarlar = { ...ayarlar, [alan]: deger };
    setAyarlar(yeniAyarlar);
    const token = localStorage.getItem('anigram_token');
    try {
      await fetch('http://localhost:3001/api/notifications/ayarlar', {
        method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniAyarlar)
      });
    } catch (hata) {}
  };

  const filtreler = [
    { key: 'tumu', label: 'Tümü' },
    { key: 'begeni', label: 'Beğeni' },
    { key: 'yorum', label: 'Yorum' },
    { key: 'takip', label: 'Takip' },
    { key: 'mesaj', label: 'Mesaj' },
  ];

  const bildirimIkonu = (tip) => ({
    begeni: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    yorum: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    takip: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M17 11l2 2 4-4',
    mesaj: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  })[tip] || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z';

  const bildirimRengi = (tip) => ({ begeni: '#FF3040', yorum: '#00D4FF', takip: '#2ED573', mesaj: '#8B5CF6' })[tip] || '#00D4FF';

  const zamaniFormatla = (tarih) => {
    if (!tarih) return '';
    const fark = Date.now() - new Date(tarih).getTime();
    const dk = Math.floor(fark / 60000);
    if (dk < 1) return 'Az önce';
    if (dk < 60) return dk + ' dk';
    const sa = Math.floor(fark / 3600000);
    if (sa < 24) return sa + ' sa';
    return new Date(tarih).toLocaleDateString('tr-TR');
  };

  if (yukleniyor) {
    return (<div className="bildirim-yukleniyor"><div className="yukleniyor-spinner"></div><p>Bildirimler yükleniyor...</p></div>);
  }

  return (
    <div className="bildirim-sayfa">
      <div className="bildirim-baslik">
        <h2>Bildirimler</h2>
        <div className="bildirim-baslik-sag">
          {bildirimler.some(b => !b.is_read) && (
            <button className="bildirim-tumunu-oku" onClick={tumunuOku}>Tümünü Oku</button>
          )}
          <button className="bildirim-ayarlar-buton" onClick={() => setAyarlarAcik(!ayarlarAcik)} title="Bildirim Ayarları">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>

      {ayarlarAcik && (
        <div className="bildirim-ayarlar-paneli">
          <h3>Bildirim Tercihleri</h3>
          <div className="ayar-oge"><span>Beğeni Bildirimleri</span><label className="toggle-switch"><input type="checkbox" checked={ayarlar.begeni} onChange={(e) => ayarlariGuncelle('begeni', e.target.checked)} /><span className="toggle-slider"></span></label></div>
          <div className="ayar-oge"><span>Yorum Bildirimleri</span><label className="toggle-switch"><input type="checkbox" checked={ayarlar.yorum} onChange={(e) => ayarlariGuncelle('yorum', e.target.checked)} /><span className="toggle-slider"></span></label></div>
          <div className="ayar-oge"><span>Takip Bildirimleri</span><label className="toggle-switch"><input type="checkbox" checked={ayarlar.takip} onChange={(e) => ayarlariGuncelle('takip', e.target.checked)} /><span className="toggle-slider"></span></label></div>
          <div className="ayar-oge"><span>Mesaj Bildirimleri</span><label className="toggle-switch"><input type="checkbox" checked={ayarlar.mesaj} onChange={(e) => ayarlariGuncelle('mesaj', e.target.checked)} /><span className="toggle-slider"></span></label></div>
        </div>
      )}

      <div className="bildirim-filtreler">
        {filtreler.map(f => (
          <button key={f.key} className={'filtre-buton' + (aktifFiltre === f.key ? ' aktif' : '')} onClick={() => setAktifFiltre(f.key)}>{f.label}</button>
        ))}
      </div>

      {bildirimler.length === 0 ? (
        <div className="bildirim-bos">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <h3>{aktifFiltre === 'tumu' ? 'Henüz bildirim yok' : 'Bu kategoride bildirim yok'}</h3>
        </div>
      ) : (
        <div className="bildirim-listesi">
          {bildirimler.map(bildirim => (
            <Link key={bildirim.id}
              to={bildirim.post_id ? '/post/' + bildirim.post_id : bildirim.type === 'takip' ? '/profil/' + bildirim.from_user?.username : '/messages'}
              className={'bildirim-oge' + (!bildirim.is_read ? ' okunmamis' : '')}
              onClick={() => !bildirim.is_read && bildirimOku(bildirim.id)}>
              <div className="bildirim-oge-ikon" style={{ backgroundColor: bildirimRengi(bildirim.type) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d={bildirimIkonu(bildirim.type)} /></svg>
              </div>
              <div className="bildirim-oge-icerik">
                <div className="bildirim-oge-ust">
                  <span className="bildirim-kullanici">{bildirim.from_user?.username || 'bilinmiyor'}</span>
                  {!bildirim.is_read && <span className="bildirim-okunmamis-nokta"></span>}
                </div>
                <p className="bildirim-mesaj">{bildirim.message}</p>
                <span className="bildirim-zaman">{zamaniFormatla(bildirim.created_at)}</span>
              </div>
              {bildirim.from_user?.avatar_url ? (
                <img src={bildirim.from_user.avatar_url} alt="" className="bildirim-avatar" />
              ) : (
                <div className="bildirim-avatar-placeholder">{(bildirim.from_user?.username || '?').charAt(0).toUpperCase()}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;