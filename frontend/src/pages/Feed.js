import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Feed.css';

// ─── Sabitler ────────────────────────────────────────────────────────────────
const AYARLAR = {
  ONBELLEK_MESAFE: 2,
  TEMIZLEME_MESAFE: 5,
  GORUNTU_ESIK: 0.6,       // Videonun %60'ı görünürse başlasın
  MAX_ESLEZAMANLI: 1,
};

// Global ref — yalnızca DOM elemanını tutar, React state'i yok
let aktifVideo = null;

// ─── Yardımcı: zaman formatla ────────────────────────────────────────────────
function zamaniFormatla(tarih) {
  const fark = Date.now() - new Date(tarih).getTime();
  const dk = Math.floor(fark / 60000);
  const sa = Math.floor(fark / 3600000);
  const gun = Math.floor(fark / 86400000);
  if (dk < 1) return 'Az önce';
  if (dk < 60) return dk + ' dk';
  if (sa < 24) return sa + ' sa';
  if (gun < 7) return gun + ' g';
  return new Date(tarih).toLocaleDateString('tr-TR');
}

// ─── Video Kartı Alt Bileşeni ─────────────────────────────────────────────────
// Her video için ayrı bileşen → kendi observer'ı, kendi state'i
function VideoKart({ gonderi, onTamEkran }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [oynuyor, setOynuyor] = useState(false);
  const [sesli, setSesli] = useState(false);
  const [ilerleme, setIlerleme] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const progressRef = useRef(null);

  // Progress bar animasyonu
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.duration) {
        setIlerleme((video.currentTime / video.duration) * 100);
      }
    };
    const onPlay = () => setOynuyor(true);
    const onPause = () => setOynuyor(false);
    const onLoaded = () => setYuklendi(true);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('canplay', onLoaded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('canplay', onLoaded);
    };
  }, []);

  // IntersectionObserver: ekrana girince otomatik başlat
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const gozlemci = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          // Başka video oynuyorsa durdur
          if (aktifVideo && aktifVideo !== video) {
            aktifVideo.pause();
            aktifVideo.currentTime = 0;
          }

          const oynat = () => {
            video.currentTime = 0;
            video.muted = true;
            setSesli(false);
            video.play()
              .then(() => { aktifVideo = video; })
              .catch(() => {});
          };

          if (video.readyState >= 3) {
            oynat();
          } else {
            video.load();
            video.addEventListener('canplay', oynat, { once: true });
          }
        } else {
          // Ekrandan çıktı → durdur
          if (aktifVideo === video) {
            video.pause();
            video.currentTime = 0;
            aktifVideo = null;
          }
          setOynuyor(false);
          setIlerleme(0);
        }
      },
      { threshold: AYARLAR.GORUNTU_ESIK }
    );

    gozlemci.observe(container);
    return () => gozlemci.disconnect();
  }, []);

  const toggleOynat = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => { aktifVideo = video; }).catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleSes = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setSesli(!video.muted);
  };

  return (
    <div className="video-kapsayici" ref={containerRef}>
      <video
        ref={videoRef}
        src={gonderi.post_media[0].media_url}
        className="gonderi-medya-video"
        playsInline
        muted
        loop
        preload="auto"
      />

      {/* Progress bar */}
      <div className="video-ilerleme-cubugu">
        <div className="video-ilerleme-dolgu" style={{ width: ilerleme + '%' }} />
      </div>

      {/* Ortadaki play/pause butonu — sadece duraklatılmışsa göster */}
      {!oynuyor && (
        <div className="video-ortala-buton" onClick={toggleOynat}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white" opacity="0.9">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      )}
      {/* Pause overlay: oynarken tıklayınca durdur */}
      {oynuyor && (
        <div className="video-pause-overlay" onClick={toggleOynat} />
      )}

      {/* Ses butonu */}
      <div className="video-ses-buton" onClick={toggleSes} title={sesli ? 'Sesi kapat' : 'Sesi aç'}>
        {sesli ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </div>

      {/* Tam ekran butonu */}
      <div className="video-tam-ekran-buton" onClick={(e) => onTamEkran(gonderi.id, e)} title="Tam ekran">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </div>
    </div>
  );
}

// ─── Carousel Bileşeni ────────────────────────────────────────────────────────
function Carousel({ medyalar, gonderiId, onNavigate }) {
  const [aktifIndex, setAktifIndex] = useState(0);

  const sonraki = (e) => {
    e.stopPropagation();
    setAktifIndex((i) => Math.min(i + 1, medyalar.length - 1));
  };
  const onceki = (e) => {
    e.stopPropagation();
    setAktifIndex((i) => Math.max(i - 1, 0));
  };

  const medya = medyalar[aktifIndex];

  return (
    <div className="gonderi-medya-kapsayici">
      {medya.media_type === 'image' ? (
        <img
          src={medya.media_url}
          alt=""
          className="gonderi-medya-gorsel"
          loading="lazy"
          onClick={() => onNavigate('/post/' + gonderiId)}
          style={{ cursor: 'pointer' }}
        />
      ) : (
        <img src={medya.media_url} alt="" className="gonderi-medya-gorsel" loading="lazy" />
      )}

      {medyalar.length > 1 && (
        <>
          {aktifIndex > 0 && (
            <button className="carousel-onceki-buton" onClick={onceki}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {aktifIndex < medyalar.length - 1 && (
            <button className="carousel-sonraki-buton" onClick={sonraki}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
          <div className="gonderi-carousel-noktalar">
            {medyalar.map((_, i) => (
              <span
                key={i}
                className={'carousel-nokta' + (i === aktifIndex ? ' aktif' : '')}
                onClick={(e) => { e.stopPropagation(); setAktifIndex(i); }}
              />
            ))}
          </div>
          <div className="carousel-sayac">{aktifIndex + 1}/{medyalar.length}</div>
        </>
      )}
    </div>
  );
}

// ─── Ana Feed Bileşeni ────────────────────────────────────────────────────────
function Feed({ user }) {
  const [gonderiler, setGonderiler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [dahaFazlaYukleniyor, setDahaFazlaYukleniyor] = useState(false);
  const [sayfa, setSayfa] = useState(1);
  const [dahaVar, setDahaVar] = useState(true);

  // Beğeni / kaydet state'leri
  const [begenilenler, setBegenilenler] = useState({});
  const [kaydedilenler, setKaydedilenler] = useState({});

  // Yorum
  const [yorumMetni, setYorumMetni] = useState({});

  // Beğenenler popup
  const [begenenPopup, setBegenenPopup] = useState({
    acik: false, gonderiId: null, begenenler: [], yukleniyor: false,
  });

  const beslemeSonuRef = useRef(null);
  const navigate = useNavigate();

  // ── Feed yükle ─────────────────────────────────────────────────────────────
  const beslemeyiGetir = useCallback(async (sayfaNo = 1) => {
    try {
      if (sayfaNo === 1) setYukleniyor(true);
      else setDahaFazlaYukleniyor(true);

      const token = localStorage.getItem('anigram_token');
      const res = await fetch(
        'http://localhost:3001/api/posts/feed?sayfa=' + sayfaNo + '&limit=10',
        { headers: token ? { Authorization: 'Bearer ' + token } : {} }
      );
      const veri = await res.json();

      if (!veri.hata) {
        const yeni = veri.gonderiler || [];
        setGonderiler((eski) => (sayfaNo === 1 ? yeni : [...eski, ...yeni]));
        setSayfa(sayfaNo);
        setDahaVar(yeni.length >= 10);

        // Beğeni ve kaydet durumlarını sync et
        if (veri.begenilenler) setBegenilenler((eski) => ({ ...eski, ...veri.begenilenler }));
        if (veri.kaydedilenler) setKaydedilenler((eski) => ({ ...eski, ...veri.kaydedilenler }));
      }
    } catch (err) {
      console.error('Feed hatası:', err);
    } finally {
      setYukleniyor(false);
      setDahaFazlaYukleniyor(false);
    }
  }, []);

  useEffect(() => { beslemeyiGetir(1); }, [beslemeyiGetir]);

  // ── Sonsuz scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && dahaVar && !dahaFazlaYukleniyor && !yukleniyor) {
          beslemeyiGetir(sayfa + 1);
        }
      },
      { threshold: 0.1 }
    );
    const el = beslemeSonuRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [dahaVar, dahaFazlaYukleniyor, yukleniyor, sayfa, beslemeyiGetir]);

  // ── Klavye navigasyon ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        window.scrollBy({ top: -window.innerHeight * 0.85, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Beğeni ─────────────────────────────────────────────────────────────────
  const begeniYap = async (gonderiId) => {
    const token = localStorage.getItem('anigram_token');
    if (!token) return;

    // Optimistic update
    const eskiDurum = begenilenler[gonderiId];
    setBegenilenler((eski) => ({ ...eski, [gonderiId]: !eskiDurum }));
    setGonderiler((eski) =>
      eski.map((g) =>
        g.id === gonderiId
          ? { ...g, begeni_sayisi: (g.begeni_sayisi || 0) + (eskiDurum ? -1 : 1) }
          : g
      )
    );

    try {
      const res = await fetch('http://localhost:3001/api/posts/like/' + gonderiId, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const veri = await res.json();
      if (!veri.hata) {
        setBegenilenler((eski) => ({ ...eski, [gonderiId]: veri.durum === 'liked' }));
        setGonderiler((eski) =>
          eski.map((g) => (g.id === gonderiId ? { ...g, begeni_sayisi: veri.begeni_sayisi } : g))
        );
      } else {
        // Geri al
        setBegenilenler((eski) => ({ ...eski, [gonderiId]: eskiDurum }));
      }
    } catch {
      setBegenilenler((eski) => ({ ...eski, [gonderiId]: eskiDurum }));
    }
  };

  // ── Kaydet ─────────────────────────────────────────────────────────────────
  const kaydetYap = async (gonderiId) => {
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    const eskiDurum = kaydedilenler[gonderiId];
    setKaydedilenler((eski) => ({ ...eski, [gonderiId]: !eskiDurum }));
    try {
      const res = await fetch('http://localhost:3001/api/posts/save/' + gonderiId, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const veri = await res.json();
      if (!veri.hata) {
        setKaydedilenler((eski) => ({ ...eski, [gonderiId]: veri.durum === 'saved' }));
      } else {
        setKaydedilenler((eski) => ({ ...eski, [gonderiId]: eskiDurum }));
      }
    } catch {
      setKaydedilenler((eski) => ({ ...eski, [gonderiId]: eskiDurum }));
    }
  };

  // ── Beğenenler popup ───────────────────────────────────────────────────────
  const begenenleriGoster = async (gonderiId) => {
    setBegenenPopup({ acik: true, gonderiId, begenenler: [], yukleniyor: true });
    try {
      const token = localStorage.getItem('anigram_token');
      const res = await fetch('http://localhost:3001/api/posts/' + gonderiId, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const veri = await res.json();
      if (!veri.hata && veri.gonderi) {
        const raw = veri.gonderi.begenenler || [];
        // Duplicate temizle
        const gorulen = new Set();
        const temiz = raw.filter((b) => {
          const id = b.user_id || b.users?.id;
          if (!id || gorulen.has(id)) return false;
          gorulen.add(id);
          return true;
        });
        setBegenenPopup((eski) => ({ ...eski, begenenler: temiz, yukleniyor: false }));
      }
    } catch {
      setBegenenPopup((eski) => ({ ...eski, yukleniyor: false }));
    }
  };

  // ── Yorum ─────────────────────────────────────────────────────────────────
  const yorumYap = async (gonderiId) => {
    const token = localStorage.getItem('anigram_token');
    const metin = yorumMetni[gonderiId]?.trim();
    if (!token || !metin) return;

    // Optimistic: yorumu hemen ekle, feed yeniden yükleme
    const geciciYorum = {
      id: 'temp-' + Date.now(),
      content: metin,
      users: { username: user?.username || 'sen' },
    };
    setGonderiler((eski) =>
      eski.map((g) =>
        g.id === gonderiId
          ? { ...g, yorumlar: [...(g.yorumlar || []), geciciYorum] }
          : g
      )
    );
    setYorumMetni((eski) => ({ ...eski, [gonderiId]: '' }));

    try {
      const res = await fetch('http://localhost:3001/api/posts/comment/' + gonderiId, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: metin }),
      });
      // Başarısız olursa geçici yorumu kaldır
      if (!res.ok) {
        setGonderiler((eski) =>
          eski.map((g) =>
            g.id === gonderiId
              ? { ...g, yorumlar: (g.yorumlar || []).filter((y) => y.id !== geciciYorum.id) }
              : g
          )
        );
      }
    } catch {
      setGonderiler((eski) =>
        eski.map((g) =>
          g.id === gonderiId
            ? { ...g, yorumlar: (g.yorumlar || []).filter((y) => y.id !== geciciYorum.id) }
            : g
        )
      );
    }
  };

  const tamEkranAc = (gonderiId, e) => {
    e?.stopPropagation();
    // Aktif videoyu durdur
    if (aktifVideo) { aktifVideo.pause(); aktifVideo = null; }
    navigate('/post/' + gonderiId);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (yukleniyor) {
    return (
      <div className="feed-yukleniyor">
        <div className="yukleniyor-spinner" />
        <p>Gönderiler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="feed-sayfa">
      <div className="feed-duzen">
        <div className="feed-ana">
          {gonderiler.length === 0 ? (
            <div className="feed-bos">
              <div className="feed-bos-ikon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3>Henüz gönderi yok</h3>
              <p>Bot içerik çekiyor, birazdan gönderiler burada görünecek.</p>
            </div>
          ) : (
            <div className="gonderi-listesi">
              {gonderiler.map((gonderi) => {
                const medyalar = gonderi.post_media || [];
                const ilkMedya = medyalar[0];
                const begenildi = !!begenilenler[gonderi.id];
                const kaydedildi = !!kaydedilenler[gonderi.id];

                return (
                  <article key={gonderi.id} className="gonderi-kart">
                    {/* Başlık */}
                    <div className="gonderi-baslik">
                      <Link to={'/profil/' + gonderi.kullanici?.username} className="gonderi-kullanici-link">
                        <div className="avatar avatar-sm">
                          {gonderi.kullanici?.avatar_url ? (
                            <img src={gonderi.kullanici.avatar_url} alt="" loading="lazy" />
                          ) : (
                            <div className="avatar-placeholder">
                              {(gonderi.kullanici?.username || 'A').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="gonderi-kullanici-bilgi">
                          <span className="gonderi-kullanici-adi">{gonderi.kullanici?.username}</span>
                          {gonderi.post_tags?.[0] && (
                            <span className="gonderi-anime-etiket">{gonderi.post_tags[0].anime_name}</span>
                          )}
                        </div>
                      </Link>
                      <span className="gonderi-zaman">{zamaniFormatla(gonderi.created_at)}</span>
                    </div>

                    {/* Medya */}
                    {ilkMedya && (
                      medyalar.length > 1 ? (
                        <Carousel medyalar={medyalar} gonderiId={gonderi.id} onNavigate={navigate} />
                      ) : ilkMedya.media_type === 'video' ? (
                        ilkMedya.media_url?.includes('youtube.com/embed/') ? (
                          // YouTube embed
                          <div className="gonderi-medya-kapsayici">
                            <div className="video-kapsayici">
                              <iframe
                                src={
                                  ilkMedya.media_url +
                                  '?autoplay=0&mute=1&loop=1&playlist=' +
                                  (ilkMedya.media_url.split('/embed/')[1]?.split('?')[0] || '')
                                }
                                className="gonderi-medya-video youtube-iframe"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                title={gonderi.caption || 'YouTube'}
                                style={{ width: '100%', maxHeight: '500px', border: 'none', aspectRatio: '16/9' }}
                                loading="lazy"
                              />
                              <div className="video-tam-ekran-buton" onClick={(e) => tamEkranAc(gonderi.id, e)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                  <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                                  <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Native video — kendi bileşeni
                          <div className="gonderi-medya-kapsayici">
                            <VideoKart gonderi={gonderi} onTamEkran={tamEkranAc} />
                          </div>
                        )
                      ) : (
                        // Tek resim
                        <div className="gonderi-medya-kapsayici">
                          <img
                            src={ilkMedya.media_url}
                            alt=""
                            className="gonderi-medya-gorsel"
                            loading="lazy"
                            onClick={() => navigate('/post/' + gonderi.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      )
                    )}

                    {/* Aksiyonlar */}
                    <div className="gonderi-aksiyonlar">
                      <div className="gonderi-aksiyon-sol">
                        {/* Beğeni */}
                        <button
                          className={'gonderi-aksiyon-buton' + (begenildi ? ' begenildi' : '')}
                          onClick={() => begeniYap(gonderi.id)}
                          title={begenildi ? 'Beğeniyi kaldır' : 'Beğen'}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24"
                            fill={begenildi ? '#FF3040' : 'none'}
                            stroke={begenildi ? '#FF3040' : 'currentColor'}
                            strokeWidth="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>

                        {/* Yorum */}
                        <button
                          className="gonderi-aksiyon-buton"
                          onClick={() => navigate('/post/' + gonderi.id)}
                          title="Yorum yap"
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>

                        {/* Paylaş */}
                        <button className="gonderi-aksiyon-buton" title="Paylaş">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        </button>
                      </div>

                      {/* Kaydet */}
                      <button
                        className={'gonderi-aksiyon-buton' + (kaydedildi ? ' kaydedildi' : '')}
                        onClick={() => kaydetYap(gonderi.id)}
                        title={kaydedildi ? 'Kaydı kaldır' : 'Kaydet'}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24"
                          fill={kaydedildi ? 'currentColor' : 'none'}
                          stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                    </div>

                    {/* Beğeni sayısı */}
                    {(gonderi.begeni_sayisi || 0) > 0 && (
                      <div
                        className="gonderi-begeni-sayisi"
                        onClick={() => begenenleriGoster(gonderi.id)}
                      >
                        {gonderi.begeni_sayisi} beğeni
                      </div>
                    )}

                    {/* Açıklama */}
                    {gonderi.caption && (
                      <div className="gonderi-aciklama">
                        <Link to={'/profil/' + gonderi.kullanici?.username} className="aciklama-kullanici-adi">
                          {gonderi.kullanici?.username}
                        </Link>
                        <span className="aciklama-metin">{gonderi.caption}</span>
                      </div>
                    )}

                    {/* Yorumlar */}
                    {gonderi.yorumlar && gonderi.yorumlar.length > 0 && (
                      <div className="gonderi-yorumlar">
                        {gonderi.yorumlar.slice(0, 2).map((yorum) => (
                          <div key={yorum.id} className="yorum-oge">
                            <Link to={'/profil/' + yorum.users?.username} className="yorum-kullanici-adi">
                              {yorum.users?.username}
                            </Link>
                            <span className="yorum-icerik">{yorum.content}</span>
                          </div>
                        ))}
                        {gonderi.yorumlar.length > 2 && (
                          <button
                            className="yorum-daha-fazla"
                            onClick={() => navigate('/post/' + gonderi.id)}
                          >
                            {gonderi.yorumlar.length - 2} yorum daha gör
                          </button>
                        )}
                      </div>
                    )}

                    {/* Yorum kutusu */}
                    <div className="gonderi-yorum-ekle">
                      <div className="avatar avatar-sm">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="" />
                        ) : (
                          <div className="avatar-placeholder">
                            {(user?.username || 'S').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        className="yorum-input"
                        placeholder="Yorum ekle..."
                        value={yorumMetni[gonderi.id] || ''}
                        onChange={(e) =>
                          setYorumMetni((eski) => ({ ...eski, [gonderi.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') yorumYap(gonderi.id);
                        }}
                      />
                      {yorumMetni[gonderi.id] && (
                        <button className="yorum-gonder-buton" onClick={() => yorumYap(gonderi.id)}>
                          Paylaş
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {/* Sonsuz scroll tetikleyici */}
              <div ref={beslemeSonuRef} className="feed-son">
                {dahaFazlaYukleniyor && (
                  <div className="daha-fazla-yukleniyor">
                    <div className="yukleniyor-spinner-kucuk" />
                    <span>Yükleniyor...</span>
                  </div>
                )}
                {!dahaVar && gonderiler.length > 0 && (
                  <p className="feed-son-mesaj">Tüm gönderileri gördün!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Beğenenler popup */}
      {begenenPopup.acik && (
        <div className="begenen-popup-ortu" onClick={() => setBegenenPopup({ acik: false, gonderiId: null, begenenler: [], yukleniyor: false })}>
          <div className="begenen-popup-kart" onClick={(e) => e.stopPropagation()}>
            <div className="begenen-popup-baslik">
              <h3>Beğenenler</h3>
              <button
                className="begenen-popup-kapat"
                onClick={() => setBegenenPopup({ acik: false, gonderiId: null, begenenler: [], yukleniyor: false })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="begenen-popup-icerik">
              {begenenPopup.yukleniyor ? (
                <div className="begenen-popup-yukleniyor">
                  <div className="yukleniyor-spinner-kucuk" />
                  <span>Yükleniyor...</span>
                </div>
              ) : begenenPopup.begenenler.length === 0 ? (
                <p className="begenen-popup-bos">Henüz beğenen yok.</p>
              ) : (
                <div className="begenen-listesi">
                  {begenenPopup.begenenler.map((begeni, i) => {
                    const k = begeni.users || begeni;
                    return (
                      <Link
                        key={k.id || i}
                        to={'/profil/' + k.username}
                        className="begenen-oge"
                        onClick={() => setBegenenPopup({ acik: false, gonderiId: null, begenenler: [], yukleniyor: false })}
                      >
                        <div className="avatar avatar-sm">
                          {k.avatar_url ? (
                            <img src={k.avatar_url} alt="" />
                          ) : (
                            <div className="avatar-placeholder">
                              {(k.username || 'A').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="begenen-bilgi">
                          <span className="begenen-kullanici-adi">{k.username}</span>
                          <span className="begenen-isim">{k.name || ''}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;