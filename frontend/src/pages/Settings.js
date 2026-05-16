import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

function Settings({ user, onLogout }) {
  const navigate = useNavigate();
  const [aktifPanel, setAktifPanel] = useState('genel');
  const [bildirimAyarlar, setBildirimAyarlar] = useState({
    begeni: true,
    yorum: true,
    takip: true,
    mesaj: true,
    mention: true
  });
  const [kaydedildi, setKaydedildi] = useState(false);

  useEffect(() => {
    bildirimAyarlariniGetir();
  }, []);

  const bildirimAyarlariniGetir = async () => {
    const token = localStorage.getItem('anigram_token');
    try {
      const yanit = await fetch('http://localhost:3001/api/notifications/ayarlar', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const veri = await yanit.json();
      if (!veri.hata && veri.ayarlar) {
        setBildirimAyarlar(veri.ayarlar);
      }
    } catch (hata) {}
  };

  const ayarGuncelle = async (alan, deger) => {
    const yeni = { ...bildirimAyarlar, [alan]: deger };
    setBildirimAyarlar(yeni);
    const token = localStorage.getItem('anigram_token');
    try {
      await fetch('http://localhost:3001/api/notifications/ayarlar', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(yeni)
      });
      setKaydedildi(true);
      setTimeout(() => setKaydedildi(false), 2000);
    } catch (hata) {}
  };

  const paneller = [
    { key: 'genel', label: 'Genel', ikon: 'G' },
    { key: 'bildirim', label: 'Bildirim', ikon: 'B' },
    { key: 'guvenlik', label: 'Guvenlik', ikon: 'K' },
    { key: 'abonelik', label: 'Abonelik', ikon: 'A' },
    { key: 'tehlike', label: 'Tehlike Bolgesi', ikon: '!' },
  ];

  return (
    <div className="ayarlar-sayfa">
      <div className="ayarlar-header">
        <h1 className="ayarlar-logo">AniGram</h1>
        <span className="ayarlar-subtitle">SISTEM AYARLARI</span>
      </div>

      <div className="ayarlar-kokpit">
        <nav className="ayarlar-sidebar">
          {paneller.map(p => (
            <button
              key={p.key}
              className={'ayarlar-sekme' + (aktifPanel === p.key ? ' aktif' : '')}
              onClick={() => setAktifPanel(p.key)}
            >
              <span className="ayarlar-sekme-ikon">{p.ikon}</span>
              <span className="ayarlar-sekme-yazi">{p.label}</span>
            </button>
          ))}
        </nav>

        <main className="ayarlar-icerik">
          {kaydedildi && (
            <div className="ayarlar-toast">Ayarlar kaydedildi</div>
          )}

          {aktifPanel === 'genel' && (
            <div className="ayarlar-panel">
              <h2>Genel Ayarlar</h2>
              <div className="ayar-kart">
                <span>Kullanici Adi</span>
                <span className="ayar-deger">@{user?.username}</span>
              </div>
              <div className="ayar-kart">
                <span>Email</span>
                <span className="ayar-deger">{user?.email}</span>
              </div>
              <div className="ayar-kart">
                <span>Hesap Durumu</span>
                <span className="ayar-deger aktif">Aktif</span>
              </div>
              <div className="ayar-kart">
                <span>Kayit Tarihi</span>
                <span className="ayar-deger">{new Date(user?.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          )}

          {aktifPanel === 'bildirim' && (
            <div className="ayarlar-panel">
              <h2>Bildirim Tercihleri</h2>
              {Object.entries(bildirimAyarlar).map(([key, val]) => (
                <div key={key} className="ayar-kart">
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)} Bildirimleri</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => ayarGuncelle(key, e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {aktifPanel === 'guvenlik' && (
            <div className="ayarlar-panel">
              <h2>Guvenlik</h2>
              <div className="ayar-kart">
                <span>Iki Faktorlu Dogrulama</span>
                <span className="ayar-deger yakinda">Yakinda</span>
              </div>
              <div className="ayar-kart">
                <span>Sifre Degistir</span>
                <button className="ayar-buton">Degistir</button>
              </div>
              <div className="ayar-kart">
                <span>Aktif Oturumlar</span>
                <button className="ayar-buton">Goruntule</button>
              </div>
            </div>
          )}

          {aktifPanel === 'abonelik' && (
            <div className="ayarlar-panel">
              <h2>Abonelik Plani</h2>
              <div className="abonelik-plan-karti">
                <h3>Ucretsiz</h3>
                <p>0 TL/ay</p>
                <button className="ayar-buton">Yukselt</button>
              </div>
            </div>
          )}

          {aktifPanel === 'tehlike' && (
            <div className="ayarlar-panel">
              <h2>Tehlike Bolgesi</h2>
              <div className="ayar-kart tehlike">
                <span>Hesabi Dondur</span>
                <button className="ayar-buton kirmizi">Dondur</button>
              </div>
              <div className="ayar-kart tehlike">
                <span>Hesabi Sil</span>
                <button className="ayar-buton kirmizi">Sil</button>
              </div>
              <button className="cikis-buton" onClick={onLogout}>Cikis Yap</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Settings;