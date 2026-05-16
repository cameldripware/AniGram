import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './Profile.css';

function Profile({ user }) {
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [profil, setProfil] = useState(null);
  const [gonderiler, setGonderiler] = useState([]);
  const [favoriAnimeler, setFavoriAnimeler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kendiProfili, setKendiProfili] = useState(false);
  const [takipEdiliyor, setTakipEdiliyor] = useState(false);
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [aktifSekme, setAktifSekme] = useState('gonderiler');
  const [takipciPopup, setTakipciPopup] = useState({ acik: false, tip: '' });
  const [begenenPopup, setBegenenPopup] = useState({ acik: false, gonderiId: null, begenenler: [], yukleniyor: false });
  const [abonelikPopup, setAbonelikPopup] = useState(false);
  const [favoriArama, setFavoriArama] = useState('');
  const [favoriAramaSonuc, setFavoriAramaSonuc] = useState([]);
  const [favoriEkleniyor, setFavoriEkleniyor] = useState(false);
  
  const [duzenleForm, setDuzenleForm] = useState({
    name: '',
    bio: '',
    website: '',
    category: 'Anime İzleyici',
    is_private: false
  });

  useEffect(() => {
    if (username) {
      profilGetir();
    }
  }, [username]);

  useEffect(() => {
    if (user && profil) {
      setKendiProfili(user.username === profil.kullanici?.username || user.username === username);
    }
  }, [user, profil, username]);

  const profilGetir = async () => {
    try {
      setYukleniyor(true);
      const token = localStorage.getItem('anigram_token');
      if (!username || username === 'undefined') {
        setYukleniyor(false);
        return;
      }
      const url = 'http://localhost:3001/api/users/' + encodeURIComponent(username);
      const yanit = await fetch(url, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      const contentType = yanit.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setYukleniyor(false);
        return;
      }
      const veri = await yanit.json();
      if (!veri.hata) {
        setProfil(veri);
        setGonderiler(veri.gonderiler || []);
        setFavoriAnimeler(veri.favori_animeler || []);
        setDuzenleForm({
          name: veri.kullanici?.name || '',
          bio: veri.kullanici?.bio || '',
          website: veri.kullanici?.website || '',
          category: veri.kullanici?.category || 'Anime İzleyici',
          is_private: veri.kullanici?.is_private || false
        });
      }
    } catch (hata) {
      console.error('Profil yükleme hatası:', hata);
    } finally {
      setYukleniyor(false);
    }
  };

  const profilGuncelle = async () => {
    try {
      const token = localStorage.getItem('anigram_token');
      const yanit = await fetch('http://localhost:3001/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duzenleForm)
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        setProfil(onceki => ({
          ...onceki,
          kullanici: { ...onceki.kullanici, ...duzenleForm }
        }));
        setDuzenlemeModu(false);
      }
    } catch (hata) {
      console.error('Profil güncelleme hatası:', hata);
    }
  };

  const takipEt = async () => {
    try {
      const token = localStorage.getItem('anigram_token');
      if (!token || !profil?.kullanici?.id) return;
      const yanit = await fetch('http://localhost:3001/api/users/follow/' + profil.kullanici.id, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        setTakipEdiliyor(veri.durum === 'followed');
        profilGetir();
      }
    } catch (hata) {}
  };

  const mesajGonder = () => {
    if (profil?.kullanici?.username) {
      navigate('/messages/' + profil.kullanici.username);
    }
  };

  const favoriAnimeAra = async (metin) => {
    setFavoriArama(metin);
    if (metin.length < 2) {
      setFavoriAramaSonuc([]);
      return;
    }
    setFavoriEkleniyor(true);
    try {
      const token = localStorage.getItem('anigram_token');
      const yanit = await fetch('http://localhost:3001/api/users/anime-ara?q=' + encodeURIComponent(metin), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const veri = await yanit.json();
      if (!veri.hata) setFavoriAramaSonuc(veri.animeler || []);
    } catch (hata) {
    } finally {
      setFavoriEkleniyor(false);
    }
  };

  const favoriEkleCikar = async (anime) => {
    const token = localStorage.getItem('anigram_token');
    try {
      const yanit = await fetch('http://localhost:3001/api/users/favori-anime', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          anime_id: anime.anime_id,
          anime_name: anime.anime_name,
          anime_image: anime.anime_image
        })
      });
      const veri = await yanit.json();
      if (!veri.hata) {
        profilGetir();
        setFavoriArama('');
        setFavoriAramaSonuc([]);
      }
    } catch (hata) {}
  };

  const begenenleriGoster = async (gonderiId) => {
    setBegenenPopup({ acik: true, gonderiId, begenenler: [], yukleniyor: true });
    try {
      const token = localStorage.getItem('anigram_token');
      const yanit = await fetch('http://localhost:3001/api/posts/' + gonderiId, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      const veri = await yanit.json();
      if (!veri.hata && veri.gonderi) {
        setBegenenPopup(onceki => ({ ...onceki, begenenler: veri.gonderi.begenenler || [], yukleniyor: false }));
      }
    } catch (hata) {
      setBegenenPopup(onceki => ({ ...onceki, yukleniyor: false }));
    }
  };

  const rozetler = [
    { ad: 'Beta Kullanıcı', ikon: 'B', renk: '#FFD700', aciklama: 'AniGram beta sürümüne katıldı' },
    { ad: 'İlk 1000', ikon: '1K', renk: '#00D4FF', aciklama: 'İlk 1000 kullanıcı arasında' },
    { ad: 'Edit Kralı', ikon: 'E', renk: '#FF4757', aciklama: '10 harika edit paylaştı' },
    { ad: 'Cosplay Ustası', ikon: 'C', renk: '#8B5CF6', aciklama: 'Cosplay kategorisinde uzman' },
    { ad: 'Koleksiyoncu', ikon: 'K', renk: '#2ED573', aciklama: '100 gönderi kaydetti' },
  ];

  const kategoriler = [
    'Fan Art Sanatçısı', 'Cosplayer', 'Editçi', 'Koleksiyoncu', 'Manga Okuyucu', 'Anime İzleyici'
  ];

  if (yukleniyor) {
    return (
      <div className="profil-yukleniyor">
        <div className="yukleniyor-spinner"></div>
        <p>Profil yükleniyor...</p>
      </div>
    );
  }

  if (!profil || !profil.kullanici) {
    return (
      <div className="profil-bulunamadi">
        <h2>Kullanıcı bulunamadı</h2>
        <p>Aradığınız kullanıcı mevcut değil veya hesabını kapatmış olabilir.</p>
        <Link to="/" className="btn btn-primary">Ana Sayfaya Dön</Link>
      </div>
    );
  }

  const k = profil.kullanici;

  return (
    <div className="profil-sayfa">
      <div className="profil-banner">
        {k.banner_url ? (
          <img src={k.banner_url} alt="" className="profil-banner-gorsel" />
        ) : (
          <div className="profil-banner-varsayilan"></div>
        )}
        {kendiProfili && duzenlemeModu && (
          <button className="profil-banner-degistir">Banner Değiştir</button>
        )}
      </div>

      <div className="profil-ust-bilgi">
        <div className="profil-avatar-alan">
          <div className="avatar avatar-xl profil-avatar-cerceve">
            {k.avatar_url ? (
              <img src={k.avatar_url} alt="" />
            ) : (
              <div className="avatar-placeholder büyük">{k.username?.charAt(0).toUpperCase()}</div>
            )}
          </div>
          {kendiProfili && duzenlemeModu && (
            <button className="profil-avatar-degistir">Fotoğraf Değiştir</button>
          )}
        </div>

        <div className="profil-bilgiler">
          {duzenlemeModu ? (
            <div className="profil-duzenle-form">
              <input type="text" className="duzenle-input" value={duzenleForm.name} onChange={(e) => setDuzenleForm({ ...duzenleForm, name: e.target.value })} placeholder="İsim" />
              <input type="text" className="duzenle-input" value={k.username} disabled placeholder="Kullanıcı adı" />
              <textarea className="duzenle-textarea" value={duzenleForm.bio} onChange={(e) => setDuzenleForm({ ...duzenleForm, bio: e.target.value })} placeholder="Biyografi" maxLength={150} />
              <input type="text" className="duzenle-input" value={duzenleForm.website} onChange={(e) => setDuzenleForm({ ...duzenleForm, website: e.target.value })} placeholder="Web sitesi" />
              <select className="duzenle-select" value={duzenleForm.category} onChange={(e) => setDuzenleForm({ ...duzenleForm, category: e.target.value })}>
                {kategoriler.map(kat => (<option key={kat} value={kat}>{kat}</option>))}
              </select>
              <label className="duzenle-toggle-label">
                <input type="checkbox" checked={duzenleForm.is_private} onChange={(e) => setDuzenleForm({ ...duzenleForm, is_private: e.target.checked })} />
                <span>Hesap Gizliliği (Kapalı Hesap)</span>
              </label>
              <div className="duzenle-butonlar">
                <button className="btn btn-primary" onClick={profilGuncelle}>Kaydet</button>
                <button className="btn btn-ghost" onClick={() => setDuzenlemeModu(false)}>İptal</button>
              </div>
            </div>
          ) : (
            <>
              <div className="profil-isim-satir">
                <h1 className="profil-isim">{k.name || k.username}</h1>
                <span className="profil-kategori-rozeti">{k.category}</span>
              </div>
              <p className="profil-kullanici-adi">@{k.username}</p>
              {k.bio && <p className="profil-bio">{k.bio}</p>}
              {k.website && <a href={k.website} target="_blank" rel="noopener noreferrer" className="profil-website">{k.website}</a>}
              <div className="profil-istatistikler">
                <span className="istatistik-oge"><strong>{k.gonderi_sayisi || gonderiler.length}</strong> gönderi</span>
                <span className="istatistik-oge tiklanabilir" onClick={() => setTakipciPopup({ acik: true, tip: 'followers' })}><strong>{k.takipci_sayisi || 0}</strong> takipçi</span>
                <span className="istatistik-oge tiklanabilir" onClick={() => setTakipciPopup({ acik: true, tip: 'following' })}><strong>{k.takip_edilen_sayisi || 0}</strong> takip</span>
              </div>
              <div className="profil-aksiyonlar">
                {kendiProfili ? (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => setDuzenlemeModu(true)}>Profili Düzenle</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setAbonelikPopup(true)}>Abonelik</button>
                  </>
                ) : (
                  <>
                    <button className={'btn btn-sm ' + (takipEdiliyor ? 'btn-outline' : 'btn-primary')} onClick={takipEt}>
                      {takipEdiliyor ? 'Takibi Bırak' : 'Takip Et'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={mesajGonder}>
                      Mesaj Gönder
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="profil-rozetler">
        <h3 className="rozet-baslik">Rozetler ve Başarılar</h3>
        <div className="rozet-listesi">
          {rozetler.map((rozet, index) => (
            <div key={index} className="rozet-oge" title={rozet.aciklama}>
              <div className="rozet-ikon" style={{ backgroundColor: rozet.renk }}>{rozet.ikon}</div>
              <span className="rozet-ad">{rozet.ad}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="profil-favori-animeler">
        <h3 className="rozet-baslik">
          Favori Animeler
          {kendiProfili && <span className="favori-duzenle-aciklama"> (Ara ve ekle, en fazla 5)</span>}
        </h3>
        {kendiProfili && (
          <div className="favori-arama-alani">
            <input
              type="text"
              className="favori-arama-input"
              placeholder="Anime ara..."
              value={favoriArama}
              onChange={(e) => favoriAnimeAra(e.target.value)}
            />
            {favoriAramaSonuc.length > 0 && (
              <div className="favori-arama-sonuclari">
                {favoriAramaSonuc.map(anime => (
                  <div key={anime.anime_id} className="favori-arama-oge" onClick={() => favoriEkleCikar(anime)}>
                    <img src={anime.anime_image} alt={anime.anime_name} className="favori-arama-gorsel" />
                    <span className="favori-arama-isim">{anime.anime_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="favori-listesi">
          {favoriAnimeler.length === 0 && !kendiProfili && (
            <p className="favori-bos">Henüz favori anime eklenmemiş.</p>
          )}
          {favoriAnimeler.map((anime, i) => (
            <div
              key={i}
              className="favori-oge"
              onClick={() => kendiProfili && favoriEkleCikar(anime)}
              title={kendiProfili ? 'Kaldırmak için tıkla' : anime.anime_name}
            >
              <img src={anime.anime_image} alt={anime.anime_name} className="favori-gorsel" />
              <span className="favori-ad">{anime.anime_name}</span>
              {kendiProfili && <span className="favori-kaldir">X</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="profil-sekmeler">
        <button className={'sekmeler-buton' + (aktifSekme === 'gonderiler' ? ' aktif' : '')} onClick={() => setAktifSekme('gonderiler')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Gönderiler
        </button>
        {kendiProfili && (
          <button className={'sekmeler-buton' + (aktifSekme === 'kaydedilenler' ? ' aktif' : '')} onClick={() => setAktifSekme('kaydedilenler')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Kaydedilenler
          </button>
        )}
      </div>

      <div className="profil-gonderi-grid">
        {gonderiler.length === 0 ? (
          <div className="profil-bos">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <h3>Henüz gönderi yok</h3>
            {kendiProfili && <p>İlk gönderini paylaş!</p>}
          </div>
        ) : (
          gonderiler.map(gonderi => (
            <div key={gonderi.id} className="grid-oge" onClick={() => navigate('/post/' + gonderi.id)}>
              {gonderi.post_media?.[0] && (
                gonderi.post_media[0].media_type === 'video' ? (
                  <video src={gonderi.post_media[0].media_url} className="grid-medya" muted />
                ) : (
                  <img src={gonderi.post_media[0].media_url} alt="" className="grid-medya" loading="lazy" />
                )
              )}
              <div className="grid-overlay">
                <span className="grid-begeni">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  {gonderi.begeni_sayisi || 0}
                </span>
              </div>
              {gonderi.post_media?.[0]?.media_type === 'video' && (
                <div className="grid-video-ikon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {takipciPopup.acik && (
        <div className="popup-ortu" onClick={() => setTakipciPopup({ acik: false })}>
          <div className="popup-kart" onClick={(e) => e.stopPropagation()}>
            <div className="popup-baslik">
              <h3>{takipciPopup.tip === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}</h3>
              <button className="popup-kapat" onClick={() => setTakipciPopup({ acik: false })}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="popup-icerik"><p className="popup-bos">Bu özellik yakında eklenecek.</p></div>
          </div>
        </div>
      )}

      {abonelikPopup && (
        <div className="popup-ortu" onClick={() => setAbonelikPopup(false)}>
          <div className="popup-kart abonelik-kart" onClick={(e) => e.stopPropagation()}>
            <div className="popup-baslik">
              <h3>Abonelik Yükselt</h3>
              <button className="popup-kapat" onClick={() => setAbonelikPopup(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="abonelik-icerik">
              <div className="abonelik-kart-item"><h4>Ucretsiz</h4><p className="abonelik-fiyat">0 TL/ay</p><p>Temel ozellikler</p><button className="btn btn-outline btn-block" disabled>Mevcut</button></div>
              <div className="abonelik-kart-item premium"><h4>Premium</h4><p className="abonelik-fiyat">29 TL/ay</p><p>Rozetler, ozel cerceve, temalar</p><button className="btn btn-primary btn-block">Yukselt</button></div>
              <div className="abonelik-kart-item vip"><h4>VIP</h4><p className="abonelik-fiyat">79 TL/ay</p><p>Hareketli banner, profil muzigi, 15 rozet</p><button className="btn btn-primary btn-block">Yukselt</button></div>
              <div className="abonelik-kart-item ultra"><h4>Ultra VIP</h4><p className="abonelik-fiyat">149 TL/ay</p><p>Tam ozellestirme, rozet pazari, analitik</p><button className="btn btn-primary btn-block">Yukselt</button></div>
            </div>
          </div>
        </div>
      )}

      {begenenPopup.acik && (
        <div className="popup-ortu" onClick={() => setBegenenPopup({ acik: false })}>
          <div className="popup-kart" onClick={(e) => e.stopPropagation()}>
            <div className="popup-baslik">
              <h3>Beğenenler</h3>
              <button className="popup-kapat" onClick={() => setBegenenPopup({ acik: false })}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="popup-icerik">
              {begenenPopup.yukleniyor ? (
                <div className="popup-yukleniyor"><div className="yukleniyor-spinner-kucuk"></div></div>
              ) : begenenPopup.begenenler.length === 0 ? (
                <p className="popup-bos">Henüz beğenen yok.</p>
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

export default Profile;