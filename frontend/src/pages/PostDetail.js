import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './PostDetail.css';

function PostDetail({ user }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [gonderi, setGonderi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [begenildi, setBegenildi] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [yorumMetni, setYorumMetni] = useState('');
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false);
  const [begenenPopup, setBegenenPopup] = useState({ acik: false, begenenler: [], yukleniyor: false });

  useEffect(() => {
    if (postId) gonderiGetir();
  }, [postId]);

  const gonderiGetir = async () => {
    try {
      setYukleniyor(true);
      const token = localStorage.getItem('anigram_token');
      const yanit = await fetch('http://localhost:3001/api/posts/' + postId, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        setGonderi(veri.gonderi);
      }
    } catch (hata) {
      console.error('Gonderi detay hatasi:', hata);
    } finally {
      setYukleniyor(false);
    }
  };

  const begeniYap = async () => {
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    try {
      const yanit = await fetch('http://localhost:3001/api/posts/like/' + postId, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        setBegenildi(veri.durum === 'liked');
        setGonderi(onceki => ({ ...onceki, begeni_sayisi: veri.begeni_sayisi }));
      }
    } catch (hata) {}
  };

  const kaydetYap = async () => {
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    try {
      const yanit = await fetch('http://localhost:3001/api/posts/save/' + postId, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        setKaydedildi(veri.durum === 'saved');
      }
    } catch (hata) {}
  };

  const yorumYap = async () => {
    const token = localStorage.getItem('anigram_token');
    if (!token || !yorumMetni.trim()) return;
    try {
      setYorumGonderiliyor(true);
      const yanit = await fetch('http://localhost:3001/api/posts/comment/' + postId, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: yorumMetni.trim() })
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        setYorumMetni('');
        gonderiGetir();
      }
    } catch (hata) {
      console.error('Yorum hatasi:', hata);
    } finally {
      setYorumGonderiliyor(false);
    }
  };

  const begenenleriGoster = async () => {
    setBegenenPopup({ acik: true, begenenler: [], yukleniyor: true });
    try {
      const token = localStorage.getItem('anigram_token');
      const yanit = await fetch('http://localhost:3001/api/posts/' + postId, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      const veri = await yanit.json();
      if (!veri.hata && veri.gonderi) {
        setBegenenPopup({ acik: true, begenenler: veri.gonderi.begenenler || [], yukleniyor: false });
      }
    } catch (hata) {
      setBegenenPopup(onceki => ({ ...onceki, yukleniyor: false }));
    }
  };

  const zamaniFormatla = (tarih) => {
    if (!tarih) return '';
    const fark = Date.now() - new Date(tarih).getTime();
    const dakika = Math.floor(fark / 60000);
    const saat = Math.floor(fark / 3600000);
    const gun = Math.floor(fark / 86400000);
    if (dakika < 1) return 'Az once';
    if (dakika < 60) return dakika + ' dk';
    if (saat < 24) return saat + ' sa';
    if (gun < 7) return gun + ' g';
    return new Date(tarih).toLocaleDateString('tr-TR');
  };

  if (yukleniyor) {
    return (
      <div className="detay-yukleniyor">
        <div className="yukleniyor-spinner"></div>
        <p>Yukleniyor...</p>
      </div>
    );
  }

  if (!gonderi) {
    return (
      <div className="detay-bulunamadi">
        <h2>Gonderi bulunamadi</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Ana Sayfaya Don</button>
      </div>
    );
  }

  return (
    <div className="detay-sayfa">
      <div className="detay-kapsayici">
        <div className="detay-sol">
          {gonderi.post_media?.[0] && (
            gonderi.post_media[0].media_type === 'video' ? (
              gonderi.post_media[0].media_url?.includes('youtube.com/embed/') ? (
                <iframe
                  src={gonderi.post_media[0].media_url + '?autoplay=1&mute=0'}
                  className="detay-medya"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title="YouTube"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <video
                  src={gonderi.post_media[0].media_url}
                  controls
                  className="detay-medya"
                  autoPlay
                  playsInline
                  loop
                />
              )
            ) : (
              <img src={gonderi.post_media[0].media_url} alt="" className="detay-medya" />
            )
          )}
        </div>

        <div className="detay-sag">
          <div className="detay-baslik">
            <Link to={'/profil/' + gonderi.kullanici?.username} className="detay-kullanici-link">
              <div className="avatar avatar-sm">
                {gonderi.kullanici?.avatar_url ? (
                  <img src={gonderi.kullanici.avatar_url} alt="" />
                ) : (
                  <div className="avatar-placeholder">
                    {(gonderi.kullanici?.username || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="detay-kullanici-adi">{gonderi.kullanici?.username}</span>
            </Link>
            <button className="detay-kapat-buton" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="detay-yorum-alani">
            {gonderi.caption && (
              <div className="detay-aciklama">
                <Link to={'/profil/' + gonderi.kullanici?.username} className="detay-aciklama-kullanici">{gonderi.kullanici?.username}</Link>
                <span className="detay-aciklama-metin">{gonderi.caption}</span>
              </div>
            )}

            {gonderi.yorumlar && gonderi.yorumlar.length > 0 ? (
              <div className="detay-yorum-listesi">
                {gonderi.yorumlar.map(yorum => (
                  <div key={yorum.id} className="detay-yorum-oge">
                    <Link to={'/profil/' + yorum.users?.username} className="detay-yorum-kullanici">{yorum.users?.username}</Link>
                    <span className="detay-yorum-icerik">{yorum.content}</span>
                    <span className="detay-yorum-zaman">{zamaniFormatla(yorum.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detay-yorum-bos">
                <p>Henuz yorum yok. Ilk yorumu sen yap!</p>
              </div>
            )}
          </div>

          <div className="detay-alt">
            <div className="detay-aksiyonlar">
              <div className="detay-aksiyon-sol">
                <button className={'detay-aksiyon-buton' + (begenildi ? ' begenildi' : '')} onClick={begeniYap}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={begenildi ? '#FF3040' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <button className="detay-aksiyon-buton">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button className="detay-aksiyon-buton">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
              <button className={'detay-aksiyon-buton' + (kaydedildi ? ' kaydedildi' : '')} onClick={kaydetYap}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={kaydedildi ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>

            <div className="detay-begeni-sayisi" onClick={begenenleriGoster}>
              {gonderi.begeni_sayisi || 0} begeni
            </div>
            <div className="detay-tarih">{zamaniFormatla(gonderi.created_at)}</div>

            <div className="detay-yorum-ekle">
              <input
                type="text"
                className="detay-yorum-input"
                placeholder="Yorum ekle..."
                value={yorumMetni}
                onChange={(e) => setYorumMetni(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !yorumGonderiliyor) yorumYap(); }}
              />
              <button
                className="detay-yorum-gonder"
                onClick={yorumYap}
                disabled={!yorumMetni.trim() || yorumGonderiliyor}
              >
                {yorumGonderiliyor ? '...' : 'Paylas'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {begenenPopup.acik && (
        <div className="popup-ortu" onClick={() => setBegenenPopup({ acik: false })}>
          <div className="popup-kart" onClick={(e) => e.stopPropagation()}>
            <div className="popup-baslik">
              <h3>Begenenler</h3>
              <button className="popup-kapat" onClick={() => setBegenenPopup({ acik: false })}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="popup-icerik">
              {begenenPopup.yukleniyor ? (
                <div className="popup-yukleniyor"><div className="yukleniyor-spinner-kucuk"></div></div>
              ) : begenenPopup.begenenler.length === 0 ? (
                <p className="popup-bos">Henuz begenen yok.</p>
              ) : (
                begenenPopup.begenenler.map((begeni, i) => (
                  <Link key={i} to={'/profil/' + (begeni.users?.username || begeni.username)} className="popup-kullanici-oge" onClick={() => setBegenenPopup({ acik: false })}>
                    <div className="avatar avatar-sm"><div className="avatar-placeholder">{(begeni.users?.username || begeni.username || 'A').charAt(0).toUpperCase()}</div></div>
                    <span className="popup-kullanici-ad">{begeni.users?.username || begeni.username}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostDetail;