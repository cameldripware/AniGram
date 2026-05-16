import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import './Messages.css';

function Messages({ user }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [konusmalar, setKonusmalar] = useState([]);
  const [aktifMesajlar, setAktifMesajlar] = useState([]);
  const [digerKullanici, setDigerKullanici] = useState(null);
  const [mesajMetni, setMesajMetni] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaSonuclari, setAramaSonuclari] = useState([]);
  const [aramaYapiliyor, setAramaYapiliyor] = useState(false);
  const [duzenlenenMesaj, setDuzenlenenMesaj] = useState(null);
  const [yanitlananMesaj, setYanitlananMesaj] = useState(null);
  const [mesajIstekleri, setMesajIstekleri] = useState([]);
  const [istekleriGor, setIstekleriGor] = useState(false);
  const mesajSonuRef = useRef(null);
  const mesajInputRef = useRef(null);
  const yenilemeAraligiRef = useRef(null);

  useEffect(() => {
    if (userId) {
      mesajlariGetir(userId);
      yenilemeAraligiRef.current = setInterval(() => mesajlariGetir(userId, true), 2000);
    } else {
      konusmalariGetir();
      mesajIstekleriniGetir();
    }
    return () => {
      if (yenilemeAraligiRef.current) clearInterval(yenilemeAraligiRef.current);
    };
  }, [userId]);

  useEffect(() => {
    if (mesajSonuRef.current) mesajSonuRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [aktifMesajlar]);

  useEffect(() => {
    if (userId && mesajInputRef.current) mesajInputRef.current.focus();
  }, [userId]);

  const konusmalariGetir = async () => {
    try {
      setYukleniyor(true);
      const token = localStorage.getItem('anigram_token');
      if (!token) { setYukleniyor(false); return; }
      const yanit = await fetch('http://localhost:3001/api/messages/konusmalar', { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) setKonusmalar(veri.konusmalar || []);
    } catch (hata) { console.error('Konusmalar yuklenemedi:', hata); }
    finally { setYukleniyor(false); }
  };

  const mesajlariGetir = async (digerId, sessiz = false) => {
    try {
      if (!sessiz) setYukleniyor(true);
      const token = localStorage.getItem('anigram_token');
      if (!token) { setYukleniyor(false); return; }
      const yanit = await fetch('http://localhost:3001/api/messages/' + digerId, { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) { setAktifMesajlar(veri.mesajlar || []); setDigerKullanici(veri.diger_kullanici); }
    } catch (hata) { console.error('Mesajlar yuklenemedi:', hata); }
    finally { if (!sessiz) setYukleniyor(false); }
  };

  const mesajIstekleriniGetir = async () => {
    try {
      const token = localStorage.getItem('anigram_token');
      if (!token) return;
      const yanit = await fetch('http://localhost:3001/api/messages/istekler/liste', { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) setMesajIstekleri(veri.istekler || []);
    } catch (hata) {}
  };

  const mesajGonder = useCallback(async () => {
    const metin = mesajMetni.trim();
    if ((!metin && !yanitlananMesaj) || !digerKullanici?.id) return;
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    const body = { alici_id: digerKullanici.id, content: metin };
    if (yanitlananMesaj) body.reply_to_id = yanitlananMesaj.id;
    try {
      const yanit = await fetch('http://localhost:3001/api/messages/gonder', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const veri = await yanit.json();
      if (!veri.hata) { setAktifMesajlar(onceki => [...onceki, veri.mesaj]); setMesajMetni(''); setYanitlananMesaj(null); }
    } catch (hata) { console.error('Mesaj gonderilemedi:', hata); }
  }, [mesajMetni, yanitlananMesaj, digerKullanici]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); duzenlenenMesaj ? mesajDuzenle(duzenlenenMesaj) : mesajGonder(); }
    if (e.key === 'Escape') { setYanitlananMesaj(null); setDuzenlenenMesaj(null); setMesajMetni(''); }
  };

  const mesajSil = async (messageId) => {
    if (!window.confirm('Bu mesaji silmek istediginizden emin misiniz?')) return;
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    try { await fetch('http://localhost:3001/api/messages/sil/' + messageId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }); setAktifMesajlar(onceki => onceki.filter(m => m.id !== messageId)); }
    catch (hata) {}
  };

  const mesajDuzenle = async (messageId) => {
    const metin = mesajMetni.trim();
    if (!metin) return;
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    try {
      const yanit = await fetch('http://localhost:3001/api/messages/duzenle/' + messageId, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: metin }) });
      const veri = await yanit.json();
      if (!veri.hata) { setAktifMesajlar(onceki => onceki.map(m => m.id === messageId ? veri.mesaj : m)); setDuzenlenenMesaj(null); setMesajMetni(''); }
    } catch (hata) {}
  };

  const duzenlemeyeBasla = (mesaj) => { setDuzenlenenMesaj(mesaj.id); setMesajMetni(mesaj.content || ''); if (mesajInputRef.current) mesajInputRef.current.focus(); };
  const yanitla = (mesaj) => { setYanitlananMesaj(mesaj); if (mesajInputRef.current) mesajInputRef.current.focus(); };

  const kullaniciAra = async (metin) => {
    setAramaMetni(metin);
    if (metin.trim().length < 1) { setAramaSonuclari([]); return; }
    try {
      setAramaYapiliyor(true);
      const token = localStorage.getItem('anigram_token');
      if (!token) return;
      const yanit = await fetch('http://localhost:3001/api/messages/ara/kullanici?q=' + encodeURIComponent(metin), { headers: { 'Authorization': 'Bearer ' + token } });
      const veri = await yanit.json();
      if (!veri.hata) setAramaSonuclari((veri.kullanicilar || []).filter(k => k.id !== user?.id));
    } catch (hata) {} finally { setAramaYapiliyor(false); }
  };

  const kullaniciyaGit = (kullanici) => { setAramaMetni(''); setAramaSonuclari([]); navigate('/messages/' + kullanici.id); };

  const mesajIstegiKabul = async (requestId, status) => {
    const token = localStorage.getItem('anigram_token');
    if (!token) return;
    try { await fetch('http://localhost:3001/api/messages/istek/' + requestId, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); mesajIstekleriniGetir(); konusmalariGetir(); }
    catch (hata) {}
  };

  const zamaniFormatla = (tarih) => {
    if (!tarih) return '';
    const fark = Date.now() - new Date(tarih).getTime();
    const dk = Math.floor(fark / 60000);
    if (dk < 1) return 'Simdi';
    if (dk < 60) return dk + ' dk';
    const sa = Math.floor(fark / 3600000);
    if (sa < 24) return sa + ' sa';
    return new Date(tarih).toLocaleDateString('tr-TR');
  };

  const tarihFormatla = (tarih) => {
    if (!tarih) return '';
    const d = new Date(tarih); const simdi = new Date(); const dun = new Date(simdi); dun.setDate(dun.getDate() - 1);
    if (d.toDateString() === simdi.toDateString()) return 'Bugun';
    if (d.toDateString() === dun.toDateString()) return 'Dun';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const gruplanmisMesajlar = () => {
    const gruplar = [];
    let sonTarih = null;
    let sonGonderen = null;
    aktifMesajlar.forEach((mesaj) => {
      const mesajTarih = new Date(mesaj.created_at).toDateString();
      if (mesajTarih !== sonTarih) { gruplar.push({ tip: 'tarih', tarih: mesaj.created_at }); sonTarih = mesajTarih; sonGonderen = null; }
      const yeniGrup = sonGonderen !== mesaj.sender_id;
      if (yeniGrup) { gruplar.push({ tip: 'mesaj', ...mesaj, grupBasi: true }); }
      else { if (gruplar.length > 0) gruplar[gruplar.length - 1].devam = true; gruplar.push({ tip: 'mesaj', ...mesaj, grupBasi: false }); }
      sonGonderen = mesaj.sender_id;
    });
    return gruplar;
  };

  if (yukleniyor && !userId) return (<div className="mesaj-yukleniyor"><div className="yukleniyor-spinner"></div><p>Yukleniyor...</p></div>);

  return (
    <div className="mesaj-sayfa">
      {!userId ? (
        <>
          <div className="mesaj-baslik"><h2>Mesajlar</h2>{mesajIstekleri.length > 0 && <button className="mesaj-istek-buton" onClick={() => setIstekleriGor(!istekleriGor)}>Istekler ({mesajIstekleri.length})</button>}</div>
          {istekleriGor && mesajIstekleri.length > 0 && (
            <div className="mesaj-istekleri-alani"><h3>Mesaj Istekleri</h3>
              {mesajIstekleri.map(istek => (
                <div key={istek.id} className="istek-oge"><div className="istek-bilgi"><span className="istek-kullanici">@{istek.from_user?.username}</span><span className="istek-isim">{istek.from_user?.name}</span></div><div className="istek-butonlar"><button className="istek-kabul" onClick={() => mesajIstegiKabul(istek.id, 'accepted')}>Kabul</button><button className="istek-red" onClick={() => mesajIstegiKabul(istek.id, 'rejected')}>Reddet</button></div></div>
              ))}
            </div>
          )}
          <div className="mesaj-arama-alani">
            <div className="mesaj-arama-input-kapsayici"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" className="mesaj-arama-input" placeholder="Kullanici adi veya isim ile ara..." value={aramaMetni} onChange={(e) => kullaniciAra(e.target.value)} /></div>
            {aramaSonuclari.length > 0 && (
              <div className="mesaj-arama-sonuclari">
                {aramaSonuclari.map(k => (
                  <div key={k.id} className="arama-sonuc-oge" onClick={() => kullaniciyaGit(k)}><div className="konusma-avatar" style={{ width: 40, height: 40 }}>{k.avatar_url ? <img src={k.avatar_url} alt="" /> : <div className="konusma-avatar-placeholder" style={{ fontSize: 16 }}>{(k.username || '?').charAt(0).toUpperCase()}</div>}</div><div className="arama-sonuc-bilgi"><span className="arama-sonuc-username">@{k.username}</span><span className="arama-sonuc-isim">{k.name || ''}</span></div></div>
                ))}
              </div>
            )}
          </div>
          {aramaSonuclari.length === 0 && !aramaYapiliyor && aramaMetni.length < 1 && (
            konusmalar.length === 0 ? (
              <div className="mesaj-bos"><div className="mesaj-bos-ikon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><h3>Henuz mesaj yok</h3><p>Yukaridan kullanici arayarak mesajlasmaya baslayabilirsin.</p></div>
            ) : (
              <div className="konusma-listesi">{konusmalar.map((kon, i) => (<div key={i} className="konusma-oge" onClick={() => navigate('/messages/' + kon.kullanici_id)}><div className="konusma-avatar">{kon.kullanici?.avatar_url ? <img src={kon.kullanici.avatar_url} alt="" /> : <div className="konusma-avatar-placeholder">{(kon.kullanici?.username || '?').charAt(0).toUpperCase()}</div>}</div><div className="konusma-icerik"><div className="konusma-ust"><span className="konusma-isim">{kon.kullanici?.username}</span><span className="konusma-zaman">{zamaniFormatla(kon.son_mesaj_zamani)}</span></div><p className="konusma-son-mesaj">{kon.son_mesaj}</p></div>{kon.okunmamis_sayisi > 0 && <span className="konusma-okunmamis">{kon.okunmamis_sayisi}</span>}</div>))}</div>
            )
          )}
        </>
      ) : (
        <div className="mesaj-detay">
          <div className="mesaj-detay-baslik">
            <button className="mesaj-geri" onClick={() => navigate('/messages')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
            <Link to={'/profil/' + digerKullanici?.username} className="mesaj-detay-kullanici"><div className="mesaj-detay-avatar">{digerKullanici?.avatar_url ? <img src={digerKullanici.avatar_url} alt="" /> : <div className="konusma-avatar-placeholder" style={{ fontSize: 14 }}>{(digerKullanici?.username || '?').charAt(0).toUpperCase()}</div>}</div><span className="mesaj-detay-isim">{digerKullanici?.username}</span></Link>
          </div>
          <div className="mesaj-listesi">
            {aktifMesajlar.length === 0 ? <p className="mesaj-baslangic">Mesajlasmaya baslayin!</p> : gruplanmisMesajlar().map((item, i) => {
              if (item.tip === 'tarih') return <div key={'tarih-' + i} className="mesaj-tarih-ayrac"><span>{tarihFormatla(item.tarih)}</span></div>;
              const kendiMesaji = item.sender_id === user?.id;
              return (
                <div key={item.id || i} className={'mesaj-oge-container ' + (kendiMesaji ? 'sagda' : 'solda') + (item.grupBasi ? ' grup-basi' : ' grup-devam')}>
                  {!kendiMesaji && item.grupBasi && <Link to={'/profil/' + digerKullanici?.username} className="mesaj-grup-avatar">{digerKullanici?.avatar_url ? <img src={digerKullanici.avatar_url} alt="" /> : <div className="konusma-avatar-placeholder" style={{ width: 28, height: 28, fontSize: 12 }}>{(digerKullanici?.username || '?').charAt(0).toUpperCase()}</div>}</Link>}
                  <div className={'mesaj-oge ' + (kendiMesaji ? 'gonderilen' : 'alinan')}>
                    {item.reply_to && <div className="mesaj-yanit"><span className="yanit-kullanici">{item.reply_to.sender?.username || item.reply_to.sender_id}</span><span className="yanit-icerik">{item.reply_to.content?.substring(0, 60)}</span></div>}
                    <p className="mesaj-icerik">{item.content || '[Medya]'}</p>
                    {item.media_url && <div className="mesaj-medya">{item.media_type === 'image' ? <img src={item.media_url} alt="" className="mesaj-medya-gorsel" /> : <video src={item.media_url} controls className="mesaj-medya-video" />}</div>}
                    <div className="mesaj-alt">{item.is_edited && <span className="mesaj-duzenlendi">duzenlendi</span>}<span className="mesaj-zaman">{zamaniFormatla(item.created_at)}</span>{kendiMesaji && item.is_read && <svg className="mesaj-okundu-ikon" width="16" height="16" viewBox="0 0 24 24" fill="var(--vurgu-renk)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}</div>
                  </div>
                  {kendiMesaji && <div className="mesaj-hover-aksiyonlar"><button onClick={() => duzenlemeyeBasla(item)} title="Duzenle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button onClick={() => mesajSil(item.id)} title="Sil"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button><button onClick={() => yanitla(item)} title="Yanitla"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg></button></div>}
                </div>
              );
            })}
            <div ref={mesajSonuRef}></div>
          </div>
          {yanitlananMesaj && <div className="mesaj-yanitlaniyor"><span>Yanitlaniyor: {yanitlananMesaj.content?.substring(0, 50)}</span><button onClick={() => setYanitlananMesaj(null)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>}
          <div className="mesaj-gonder-alani">
            <button className="mesaj-sesli-buton" title="Sesli mesaj (yakinda)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
            <input ref={mesajInputRef} type="text" className="mesaj-input" placeholder="Mesaj yaz..." value={mesajMetni} onChange={(e) => setMesajMetni(e.target.value)} onKeyDown={handleKeyDown} />
            {duzenlenenMesaj ? (
              <><button className="mesaj-gonder-buton" onClick={() => mesajDuzenle(duzenlenenMesaj)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></button><button className="mesaj-iptal-buton" onClick={() => { setDuzenlenenMesaj(null); setMesajMetni(''); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></>
            ) : (
              <button className="mesaj-gonder-buton" onClick={mesajGonder} disabled={!mesajMetni.trim()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;