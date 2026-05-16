import React, { useState, useEffect } from 'react';
import './Admin.css';

function Admin() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [girisHatasi, setGirisHatasi] = useState('');
  const [girisYukleniyor, setGirisYukleniyor] = useState(false);

  const [aktifSekme, setAktifSekme] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [kullaniciArama, setKullaniciArama] = useState('');
  const [gonderiler, setGonderiler] = useState([]);
  const [konusmalar, setKonusmalar] = useState([]);
  const [konusmaDetay, setKonusmaDetay] = useState({ acik: false, k1: '', k2: '', mesajlar: [] });
  const [seciliKullanici, setSeciliKullanici] = useState(null);
  const [botDurum, setBotDurum] = useState(null);
  const [loglar, setLoglar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [toast, setToast] = useState({ goster: false, mesaj: '', tip: 'success' });
  const [banPopup, setBanPopup] = useState({ acik: false, userId: null, username: '' });
  const [banSure, setBanSure] = useState('24');
  const [banOzelSure, setBanOzelSure] = useState('');
  const [banSebep, setBanSebep] = useState('');

  const toastGoster = (mesaj, tip = 'success') => {
    setToast({ goster: true, mesaj, tip });
    setTimeout(() => setToast({ goster: false, mesaj: '', tip: 'success' }), 4000);
  };

  useEffect(() => {
    if (adminToken) tokenKontrol();
  }, []);

  const tokenKontrol = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/admin/dashboard', {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) { setGirisYapildi(true); dashboardYukle(); }
      else { localStorage.removeItem('admin_token'); setAdminToken(''); }
    } catch (err) { setGirisYapildi(false); }
  };

  const adminGiris = async (e) => {
    e.preventDefault();
    setGirisYukleniyor(true);
    setGirisHatasi('');
    try {
      const res = await fetch('http://localhost:3001/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.hata) { setGirisHatasi(data.mesaj); }
      else {
        localStorage.setItem('admin_token', data.token);
        setAdminToken(data.token);
        setGirisYapildi(true);
        dashboardYukle();
        toastGoster('Giris basarili. Hos geldiniz.', 'success');
      }
    } catch (err) { setGirisHatasi('Baglanti hatasi.'); }
    finally { setGirisYukleniyor(false); }
  };

  const apiGetir = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': 'Bearer ' + adminToken } });
    return await res.json();
  };

  const dashboardYukle = async () => {
    setYukleniyor(true);
    const data = await apiGetir('http://localhost:3001/api/admin/dashboard');
    if (!data.hata) { setDashboard(data); setLoglar(data.admin_loglari || []); }
    setYukleniyor(false);
  };

  const kullanicilariYukle = async () => {
    setYukleniyor(true);
    const url = kullaniciArama ? 'http://localhost:3001/api/admin/users?ara=' + encodeURIComponent(kullaniciArama) : 'http://localhost:3001/api/admin/users';
    const data = await apiGetir(url);
    if (!data.hata) setKullanicilar(data.kullanicilar);
    setYukleniyor(false);
  };

  const gonderileriYukle = async () => {
    setYukleniyor(true);
    const data = await apiGetir('http://localhost:3001/api/admin/posts');
    if (!data.hata) setGonderiler(data.gonderiler);
    setYukleniyor(false);
  };

  const konusmalariYukle = async () => {
    setYukleniyor(true);
    const data = await apiGetir('http://localhost:3001/api/admin/conversations');
    if (!data.hata) setKonusmalar(data.konusmalar);
    setYukleniyor(false);
  };

  const konusmaDetayGetir = async (k1, k2) => {
    setYukleniyor(true);
    const data = await apiGetir('http://localhost:3001/api/admin/messages?kullanici1=' + k1 + '&kullanici2=' + k2);
    if (!data.hata) setKonusmaDetay({ acik: true, k1, k2, mesajlar: data.mesajlar });
    setYukleniyor(false);
  };

  const kullaniciDetayGetir = async (userId) => {
    setYukleniyor(true);
    const data = await apiGetir('http://localhost:3001/api/admin/users/' + userId);
    if (!data.hata) setSeciliKullanici(data);
    setYukleniyor(false);
  };

  const kullaniciGuncelle = async (userId, updateData) => {
    const data = await apiGetir('http://localhost:3001/api/admin/users/' + userId, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!data.hata) { toastGoster(data.mesaj, 'success'); kullanicilariYukle(); }
    else { toastGoster(data.mesaj, 'error'); }
  };

  const kullaniciBanla = async (userId, ban, sure, sebep) => {
    const data = await apiGetir('http://localhost:3001/api/admin/users/' + userId + '/ban', {
      method: 'POST',
      body: JSON.stringify({ ban, sure: sure || null, sebep: sebep || null }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!data.hata) { toastGoster(data.mesaj, ban ? 'warning' : 'success'); kullanicilariYukle(); setBanPopup({ acik: false }); }
    else { toastGoster(data.mesaj, 'error'); }
  };

  const gonderiSil = async (postId) => {
    if (!window.confirm('Bu gonderiyi silmek istediginizden emin misiniz?')) return;
    const data = await apiGetir('http://localhost:3001/api/admin/posts/' + postId, { method: 'DELETE' });
    if (!data.hata) { toastGoster(data.mesaj, 'success'); gonderileriYukle(); }
    else { toastGoster(data.mesaj, 'error'); }
  };

  const mesajSil = async (messageId) => {
    const data = await apiGetir('http://localhost:3001/api/admin/messages/' + messageId, { method: 'DELETE' });
    if (!data.hata) { toastGoster(data.mesaj, 'success'); konusmalariYukle(); }
  };

  const botKontrol = async () => { const data = await apiGetir('http://localhost:3001/api/admin/bot/status'); if (!data.hata) setBotDurum(data); };
  const botBaslat = async () => { const data = await apiGetir('http://localhost:3001/api/admin/bot/start', { method: 'POST' }); toastGoster(data.mesaj, 'success'); botKontrol(); };
  const botDurdur = async () => { const data = await apiGetir('http://localhost:3001/api/admin/bot/stop', { method: 'POST' }); toastGoster(data.mesaj, 'warning'); botKontrol(); };
  const botCalistir = async () => { const data = await apiGetir('http://localhost:3001/api/admin/bot/run', { method: 'POST' }); toastGoster(data.mesaj, 'success'); botKontrol(); };

  const loglariYukle = async () => {
    const data = await apiGetir('http://localhost:3001/api/admin/logs');
    if (!data.hata) setLoglar(data.loglar);
  };

  const cikisYap = () => { localStorage.removeItem('admin_token'); setAdminToken(''); setGirisYapildi(false); };

  const banPopupAc = (userId, username) => { setBanPopup({ acik: true, userId, username }); setBanSure('24'); setBanOzelSure(''); setBanSebep(''); };
  const banIslemiYap = () => {
    const finalSure = banSure === 'ozel' ? banOzelSure : (banSure === 'kalici' ? 'kalici' : banSure);
    kullaniciBanla(banPopup.userId, true, finalSure, banSebep);
  };

  const rozetler = ['Beta Kullanicisi', 'Ilk 1000', 'Edit Krali', 'Cosplay Ustasi', 'Koleksiyoncu', 'VIP', 'Premium', 'Ultra VIP', 'Dogrulanmis Hesap', 'Moderator', 'Tasarimci', 'Yazar', 'Elmas Uye', 'Altin Uye', 'Gumus Uye'];
  const abonelikler = ['Ucretsiz', 'Premium', 'VIP', 'Ultra VIP'];
  const banSureleri = [
    { value: '1', label: '1 Saat' },
    { value: '6', label: '6 Saat' },
    { value: '12', label: '12 Saat' },
    { value: '24', label: '24 Saat' },
    { value: '72', label: '3 Gun' },
    { value: '168', label: '7 Gun' },
    { value: '720', label: '30 Gun' },
    { value: 'kalici', label: 'Kalici' },
    { value: 'ozel', label: 'Ozel Suresi' }
  ];

  const sekmeButonlari = [
    { key: 'dashboard', label: 'Kontrol Paneli', ikon: 'II' },
    { key: 'kullanicilar', label: 'Kullanicilar', ikon: 'KK' },
    { key: 'gonderiler', label: 'Gonderiler', ikon: 'GG' },
    { key: 'mesajlar', label: 'Mesajlar', ikon: 'MM' },
    { key: 'bot', label: 'Bot Kontrol', ikon: 'BB' },
    { key: 'loglar', label: 'Islem Kayitlari', ikon: 'LL' }
  ];

  if (!girisYapildi) {
    return (
      <div className="admin-giris-sayfa">
        <div className="admin-giris-kart">
          <div className="admin-giris-logo-container">
            <div className="admin-giris-logo-cizgi"></div>
            <h1 className="admin-giris-logo">AniGram</h1>
            <div className="admin-giris-logo-cizgi"></div>
          </div>
          <h2 className="admin-giris-baslik">SISTEM YONETIM KONSOLU</h2>
          <p className="admin-giris-aciklama">Yetkisiz giris tespitinde IP adresiniz kaydedilir ve yasal islem baslatilir.</p>
          <form onSubmit={adminGiris} className="admin-giris-form">
            <div className="admin-input-grup">
              <label className="admin-input-etiket">KULLANICI ADI</label>
              <input type="text" className="admin-input" placeholder="Admin kullanici adi" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="admin-input-grup">
              <label className="admin-input-etiket">GUVENLIK KODU</label>
              <input type="password" className="admin-input" placeholder="Guvenlik kodu" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {girisHatasi && <p className="admin-hata">{girisHatasi}</p>}
            <button type="submit" className="admin-buton" disabled={girisYukleniyor}>
              {girisYukleniyor ? 'DOGRULANIYOR...' : 'KONSOLA GIRIS'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {toast.goster && (
        <div className={`admin-toast admin-toast-${toast.tip}`}>
          <span className="admin-toast-ikon">{toast.tip === 'success' ? 'OK' : toast.tip === 'error' ? 'XX' : '!!'}</span>
          <span className="admin-toast-mesaj">{toast.mesaj}</span>
          <button className="admin-toast-kapat" onClick={() => setToast({ goster: false })}>X</button>
        </div>
      )}

      <header className="admin-header">
        <div className="admin-header-sol">
          <h1 className="admin-logo">ANIGRAM</h1>
          <span className="admin-versiyon">v2.0.4</span>
          <span className="admin-durum">SISTEM AKTIF</span>
        </div>
        <div className="admin-header-orta">
          <span className="admin-saat">{new Date().toLocaleString('tr-TR')}</span>
        </div>
        <div className="admin-header-sag">
          <button className="admin-header-buton" onClick={dashboardYukle}>YENILE</button>
          <button className="admin-header-buton cikis" onClick={cikisYap}>CIKIS</button>
        </div>
      </header>

      <div className="admin-govde">
        <nav className="admin-sidebar">
          {sekmeButonlari.map(btn => (
            <button key={btn.key} className={'admin-sekme' + (aktifSekme === btn.key ? ' aktif' : '')} onClick={() => { setAktifSekme(btn.key); setSeciliKullanici(null); if (btn.key === 'kullanicilar') kullanicilariYukle(); if (btn.key === 'gonderiler') gonderileriYukle(); if (btn.key === 'mesajlar') konusmalariYukle(); if (btn.key === 'bot') botKontrol(); if (btn.key === 'loglar') loglariYukle(); if (btn.key === 'dashboard') dashboardYukle(); }}>
              <span className="admin-sekme-ikon">{btn.ikon}</span>
              <span className="admin-sekme-yazi">{btn.label}</span>
            </button>
          ))}
          <div className="admin-sidebar-alt">
            <span className="admin-sidebar-yazi">Yetki: TAM YETKILI</span>
            <span className="admin-sidebar-yazi">Oturum: AKTIF</span>
          </div>
        </nav>

        <main className="admin-icerik">
          {aktifSekme === 'dashboard' && (
            <div className="admin-dashboard">
              <div className="admin-bolumbaslik-container">
                <h2 className="admin-bolumbaslik">SISTEM DURUMU</h2>
                <span className="admin-bolum-cizgi"></span>
              </div>
              {dashboard && (
                <>
                  <div className="admin-istatistik-grid">
                    <div className="admin-istatistik-kart"><span className="istatistik-sayi">{dashboard.istatistikler.kullanici_sayisi}</span><span className="istatistik-etiket">AKTIF KULLANICI</span></div>
                    <div className="admin-istatistik-kart"><span className="istatistik-sayi">{dashboard.istatistikler.gonderi_sayisi}</span><span className="istatistik-etiket">TOPLAM GONDERI</span></div>
                    <div className="admin-istatistik-kart"><span className="istatistik-sayi">{dashboard.istatistikler.yorum_sayisi}</span><span className="istatistik-etiket">TOPLAM YORUM</span></div>
                    <div className="admin-istatistik-kart"><span className="istatistik-sayi">{dashboard.istatistikler.begeni_sayisi}</span><span className="istatistik-etiket">TOPLAM BEGENI</span></div>
                    <div className="admin-istatistik-kart"><span className="istatistik-sayi">{dashboard.istatistikler.mesaj_sayisi}</span><span className="istatistik-etiket">TOPLAM MESAJ</span></div>
                    <div className="admin-istatistik-kart banli"><span className="istatistik-sayi">{dashboard.istatistikler.banli_sayisi}</span><span className="istatistik-etiket">BANLI KULLANICI</span></div>
                  </div>
                  <div className="admin-son-islemler">
                    <h3>SON ISLEM KAYITLARI</h3>
                    <div className="admin-log-listesi">
                      {loglar.slice(0, 10).map((log, i) => (
                        <div key={i} className="admin-log-oge">
                          <span className="log-zaman">{new Date(log.tarih).toLocaleString('tr-TR')}</span>
                          <span className="log-islem">{log.islem}</span>
                          <span className="log-detay">{log.detay}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {aktifSekme === 'kullanicilar' && (
            <div className="admin-kullanicilar">
              <div className="admin-bolumbaslik-container">
                <h2 className="admin-bolumbaslik">KULLANICI YONETIMI</h2>
                <span className="admin-bolum-cizgi"></span>
              </div>
              <div className="admin-arama-cubugu">
                <input type="text" placeholder="Kullanici ara (isim, email, kullanici adi)..." value={kullaniciArama} onChange={(e) => setKullaniciArama(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && kullanicilariYukle()} />
                <button onClick={kullanicilariYukle}>TARA</button>
              </div>

              {seciliKullanici ? (
                <div className="admin-kullanici-detay">
                  <button className="admin-geri-buton" onClick={() => setSeciliKullanici(null)}>LISTEYE DON</button>
                  <div className="kullanici-detay-ust">
                    <h3>{seciliKullanici.kullanici?.username} - DETAYLI BILGI</h3>
                    <div className="kullanici-detay-bilgiler">
                      <div className="detay-bilgi-oge"><span>ID:</span><span>{seciliKullanici.kullanici?.id}</span></div>
                      <div className="detay-bilgi-oge"><span>EMAIL:</span><span>{seciliKullanici.kullanici?.email}</span></div>
                      <div className="detay-bilgi-oge"><span>KULLANICI ADI:</span><span>@{seciliKullanici.kullanici?.username}</span></div>
                      <div className="detay-bilgi-oge"><span>ISIM:</span><span>{seciliKullanici.kullanici?.name || '-'}</span></div>
                      <div className="detay-bilgi-oge"><span>KATEGORI:</span><span>{seciliKullanici.kullanici?.category || '-'}</span></div>
                      <div className="detay-bilgi-oge"><span>KAYIT TARIHI:</span><span>{new Date(seciliKullanici.kullanici?.created_at).toLocaleString('tr-TR')}</span></div>
                      <div className="detay-bilgi-oge"><span>BAN DURUMU:</span><span style={{color: seciliKullanici.kullanici?.is_banned ? '#FF4757' : '#2ED573'}}>{seciliKullanici.kullanici?.is_banned ? 'BANLI' : 'AKTIF'}</span></div>
                      {seciliKullanici.kullanici?.ban_sebebi && <div className="detay-bilgi-oge"><span>BAN SEBEBI:</span><span>{seciliKullanici.kullanici.ban_sebebi}</span></div>}
                      <div className="detay-bilgi-oge"><span>GONDERI SAYISI:</span><span>{seciliKullanici.kullanici?.gonderi_sayisi || 0}</span></div>
                      <div className="detay-bilgi-oge"><span>TAKIPCI:</span><span>{seciliKullanici.kullanici?.takipci_sayisi || 0}</span></div>
                      <div className="detay-bilgi-oge"><span>TAKIP:</span><span>{seciliKullanici.kullanici?.takip_sayisi || 0}</span></div>
                    </div>
                    <div className="kullanici-detay-aksiyonlar">
                      <button className="admin-buton kirmizi" onClick={() => banPopupAc(seciliKullanici.kullanici.id, seciliKullanici.kullanici.username)}>BANLA</button>
                      {seciliKullanici.kullanici?.is_banned && <button className="admin-buton yesil" onClick={() => kullaniciBanla(seciliKullanici.kullanici.id, false)}>BAN AÇ</button>}
                    </div>
                  </div>
                  {seciliKullanici.mesajlar && seciliKullanici.mesajlar.length > 0 && (
                    <div className="kullanici-detay-mesajlar">
                      <h4>SON MESAJLAR</h4>
                      {seciliKullanici.mesajlar.slice(0, 10).map(m => (
                        <div key={m.id} className="admin-mesaj-oge">
                          <span className="mesaj-gonderen">{m.sender?.username || m.sender_id}</span>
                          <span className="mesaj-icerik">{m.content || '[Medya]'}</span>
                          <span className="mesaj-tarih">{new Date(m.created_at).toLocaleString('tr-TR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="admin-kullanici-listesi">
                  {kullanicilar.map(k => (
                    <div key={k.id} className="admin-kullanici-kart">
                      <div className="kullanici-kart-ust" onClick={() => kullaniciDetayGetir(k.id)} style={{cursor: 'pointer'}}>
                        <span className="kullanici-adi">@{k.username}</span>
                        <span className="kullanici-email">{k.email}</span>
                        <span className={'kullanici-ban-durum' + (k.is_banned ? ' banli' : ' aktif')}>{k.is_banned ? 'BANLI' : 'AKTIF'}</span>
                      </div>
                      <div className="kullanici-kart-alt">
                        <select value={k.category || 'Anime Izleyici'} onChange={(e) => kullaniciGuncelle(k.id, { category: e.target.value })}>
                          {rozetler.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={k.abonelik_seviyesi || 'Ucretsiz'} onChange={(e) => kullaniciGuncelle(k.id, { abonelik_seviyesi: e.target.value })}>
                          {abonelikler.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <button className="admin-kucuk-buton banla" onClick={() => banPopupAc(k.id, k.username)}>BANLA</button>
                        <button className="admin-kucuk-buton detay" onClick={() => kullaniciDetayGetir(k.id)}>DETAY</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {aktifSekme === 'gonderiler' && (
            <div className="admin-gonderiler">
              <div className="admin-bolumbaslik-container">
                <h2 className="admin-bolumbaslik">GONDERI YONETIMI</h2>
                <span className="admin-bolum-cizgi"></span>
              </div>
              <div className="admin-gonderi-listesi">
                {gonderiler.map(g => (
                  <div key={g.id} className="admin-gonderi-oge">
                    <div className="gonderi-oge-bilgi">
                      <span>@{g.users?.username || 'bilinmiyor'}</span>
                      <span className="gonderi-oge-tarih">{new Date(g.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                    <p className="gonderi-oge-caption">{(g.caption || '[Medya]').substring(0, 80)}</p>
                    <button className="admin-sil-buton" onClick={() => gonderiSil(g.id)}>SIL</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aktifSekme === 'mesajlar' && (
            <div className="admin-mesajlar">
              <div className="admin-bolumbaslik-container">
                <h2 className="admin-bolumbaslik">MESAJ IZLEME</h2>
                <span className="admin-bolum-cizgi"></span>
              </div>
              {!konusmaDetay.acik ? (
                <div className="admin-konusma-listesi">
                  {konusmalar.map((kon, i) => (
                    <div key={i} className="admin-konusma-oge" onClick={() => konusmaDetayGetir(kon.kullanici1, kon.kullanici2)}>
                      <span className="konusma-kullanicilar">{kon.kullanici1} - {kon.kullanici2}</span>
                      <span className="konusma-son-mesaj">{kon.son_mesaj}</span>
                      <span className="konusma-sayisi">{kon.toplam_mesaj} mesaj</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-konusma-detay">
                  <button className="admin-geri-buton" onClick={() => setKonusmaDetay({ acik: false, k1: '', k2: '', mesajlar: [] })}>KONUSMALARA DON</button>
                  <h3>{konusmaDetay.k1} - {konusmaDetay.k2} ARASI MESAJLASMA</h3>
                  <div className="admin-mesaj-listesi">
                    {konusmaDetay.mesajlar.map(m => (
                      <div key={m.id} className="admin-mesaj-oge">
                        <div className="mesaj-oge-bilgi">
                          <span className="mesaj-gonderen">{m.sender?.username || m.sender_id}</span>
                          <span className="mesaj-alici"> - {m.receiver?.username || m.receiver_id}</span>
                          <span className="mesaj-tarih">{new Date(m.created_at).toLocaleString('tr-TR')}</span>
                        </div>
                        <p className="mesaj-icerik">{m.content || '[Medya]'}</p>
                        <button className="admin-sil-buton" onClick={() => mesajSil(m.id)}>SIL</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {aktifSekme === 'bot' && (
            <div className="admin-bot">
              <div className="admin-bolumbaslik-container">
                <h2 className="admin-bolumbaslik">BOT KONTROL</h2>
                <span className="admin-bolum-cizgi"></span>
              </div>
              <div className="admin-bot-butonlar">
                <button className="admin-buton yesil" onClick={botBaslat}>BOTU BASLAT</button>
                <button className="admin-buton kirmizi" onClick={botDurdur}>BOTU DURDUR</button>
                <button className="admin-buton mavi" onClick={botCalistir}>MANUEL CALISTIR</button>
              </div>
              {botDurum && (
                <div className="admin-bot-durum">
                  <div className="bot-durum-oge"><span>DURUM:</span><span className={botDurum.bot_durum?.isRunning ? 'aktif' : 'durduruldu'}>{botDurum.bot_durum?.isRunning ? 'CALISIYOR' : 'DURDURULDU'}</span></div>
                  <div className="bot-durum-oge"><span>API SAYISI:</span><span>{botDurum.api_sayisi}</span></div>
                  <div className="bot-durum-oge"><span>TOPLAM BOT GONDERISI:</span><span>{botDurum.bot_gonderi_sayisi}</span></div>
                  <div className="bot-durum-oge"><span>TOPLAM CEKILEN:</span><span>{botDurum.bot_durum?.totalPostsCreated}</span></div>
                </div>
              )}
            </div>
          )}

          {aktifSekme === 'loglar' && (
            <div className="admin-loglar">
              <div className="admin-bolumbaslik-container">
                <h2 className="admin-bolumbaslik">ISLEM KAYITLARI</h2>
                <span className="admin-bolum-cizgi"></span>
              </div>
              <div className="admin-log-listesi tam">
                {loglar.map((log, i) => (
                  <div key={i} className="admin-log-oge">
                    <span className="log-id">#{log.id}</span>
                    <span className="log-zaman">{new Date(log.tarih).toLocaleString('tr-TR')}</span>
                    <span className="log-islem">{log.islem}</span>
                    <span className="log-detay">{log.detay}</span>
                    <span className="log-ip">{log.adminIp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {banPopup.acik && (
        <div className="admin-popup-ortu" onClick={() => setBanPopup({ acik: false })}>
          <div className="admin-popup-kart" onClick={(e) => e.stopPropagation()}>
            <div className="admin-popup-baslik">
              <h3>KULLANICI BANLA: @{banPopup.username}</h3>
              <button className="admin-popup-kapat" onClick={() => setBanPopup({ acik: false })}>X</button>
            </div>
            <div className="admin-popup-icerik">
              <div className="admin-popup-form-grup">
                <label>BAN SURESI</label>
                <select value={banSure} onChange={(e) => setBanSure(e.target.value)}>
                  {banSureleri.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {banSure === 'ozel' && (
                <div className="admin-popup-form-grup">
                  <label>OZEL SURE (SAAT)</label>
                  <input type="number" placeholder="Saat olarak girin" value={banOzelSure} onChange={(e) => setBanOzelSure(e.target.value)} />
                </div>
              )}
              <div className="admin-popup-form-grup">
                <label>BAN SEBEBI</label>
                <textarea placeholder="Kullaniciya gosterilecek ban sebebini yazin..." value={banSebep} onChange={(e) => setBanSebep(e.target.value)} rows={3} />
              </div>
              <button className="admin-buton kirmizi tam-genislik" onClick={banIslemiYap}>BANI UYGULA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;