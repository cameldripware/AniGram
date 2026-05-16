import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import './Register.css';

function Register({ onLogin }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const emailRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (emailRef.current) emailRef.current.focus();
  }, []);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const handleBirthDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
    setBirthDate(value);
  };

  const validateBirthDate = (dateStr) => {
    if (dateStr.length === 0) return true;
    if (dateStr.length !== 10) return false;
    const parts = dateStr.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (month < 1 || month > 12) return false;
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    const birthDateObj = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    if (today.getMonth() < birthDateObj.getMonth() || (today.getMonth() === birthDateObj.getMonth() && today.getDate() < birthDateObj.getDate())) age--;
    if (age < 13 || age > 120) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptedTerms) { showToast('Kullanici Sozlesmesini onaylayin.', 'warning'); return; }
    if (!email) { showToast('Email gerekli.', 'error'); emailRef.current.focus(); return; }
    if (!username || username.length < 3) { showToast('Kullanici adi en az 3 karakter.', 'error'); return; }
    if (!password || password.length < 6) { showToast('Sifre en az 6 karakter.', 'error'); return; }
    if (password !== confirmPassword) { showToast('Sifreler uyusmuyor.', 'error'); return; }
    if (birthDate && !validateBirthDate(birthDate)) { showToast('Gecerli dogum tarihi girin.', 'error'); return; }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, name: name || username })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        showToast('Sunucu hatasi.', 'error');
        setLoading(false);
        return;
      }

      if (data.hata) {
        showToast(data.mesaj, 'error');
        setLoading(false);
        return;
      }

      showToast('Kayit basarili! Giris yapiliyor...', 'success');

      setTimeout(async () => {
        const res2 = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const text2 = await res2.text();
        let data2;
        try { data2 = JSON.parse(text2); } catch {
          navigate('/login');
          return;
        }
        if (!data2.hata && data2.token) {
          localStorage.setItem('anigram_token', data2.token);
          onLogin(data2.kullanici, data2.token);
          navigate('/');
        } else {
          navigate('/login');
        }
      }, 1000);

    } catch (err) {
      console.error('Kayit hatasi:', err);
      showToast('Baglanti hatasi.', 'error');
      setLoading(false);
    }
  };

  const termsText = `KULLANICI SOZLESMESI\n\n1. Platformu kullanarak tum kurallari kabul etmis olursunuz.\n2. Baska kullanicilara saygili olun.\n3. Telif haklarina dikkat edin.\n4. AniGram sorumluluk kabul etmez.`;

  return (
    <div className="register-page">
      <div className="bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-orb bg-orb-4"></div>
        <div className="bg-particles"></div>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'info' })} />

      <div className="register-container">
        <div className="register-logo-section">
          <div className="logo-wrapper">
            <h1 className="register-logo">
              <span className="logo-char">A</span><span className="logo-char">n</span><span className="logo-char">i</span><span className="logo-char">G</span><span className="logo-char">r</span><span className="logo-char">a</span><span className="logo-char">m</span>
            </h1>
            <div className="logo-underline"></div>
          </div>
          <p className="register-subtitle">Anime Dunyasina Adim At</p>
        </div>

        <div className="register-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group-register">
              <label className="form-label-register">E-posta</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input ref={emailRef} type="email" className="form-input-register" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="form-group-register">
              <label className="form-label-register">Kullanici Adi</label>
              <div className="input-wrapper">
                <span className="input-icon">~</span>
                <input type="text" className="form-input-register" placeholder="kullanici_adin" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} disabled={loading} maxLength={30} />
              </div>
            </div>

            <div className="form-group-register">
              <label className="form-label-register">Isim (Istege Bagli)</label>
              <div className="input-wrapper">
                <span className="input-icon">*</span>
                <input type="text" className="form-input-register" placeholder="Gorunecek isim" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} maxLength={50} />
              </div>
            </div>

            <div className="form-group-register">
              <label className="form-label-register">Dogum Tarihi (Istege Bagli)</label>
              <div className="input-wrapper">
                <span className="input-icon">#</span>
                <input type="text" className="form-input-register" placeholder="GG/AA/YYYY" value={birthDate} onChange={handleBirthDateChange} disabled={loading} maxLength={10} />
              </div>
            </div>

            <div className="form-group-register">
              <label className="form-label-register">Sifre</label>
              <div className="input-wrapper">
                <span className="input-icon">!</span>
                <input type={showPassword ? 'text' : 'password'} className="form-input-register" placeholder="En az 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Gizle' : 'Goster'}</button>
              </div>
            </div>

            <div className="form-group-register">
              <label className="form-label-register">Sifre Tekrari</label>
              <div className="input-wrapper">
                <span className="input-icon">!</span>
                <input type={showConfirmPassword ? 'text' : 'password'} className="form-input-register" placeholder="Tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? 'Gizle' : 'Goster'}</button>
              </div>
            </div>

            <div className="terms-section">
              <label className="terms-checkbox-label">
                <input type="checkbox" className="terms-checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} disabled={loading} />
                <span className="terms-checkbox-custom"></span>
                <span className="terms-text">
                  <span className="terms-link" onClick={(e) => { e.preventDefault(); setShowTerms(true); }}>Kullanici Sozlesmesi</span>'ni okudum ve kabul ediyorum.
                </span>
              </label>
            </div>

            <button type="submit" className={`register-submit-btn ${!acceptedTerms ? 'disabled' : ''}`} disabled={!acceptedTerms || loading}>
              {loading ? 'Olusturuluyor...' : 'Kayit Ol'}
            </button>
          </form>

          <div className="register-footer">
            <span className="footer-text">Hesabin var mi?</span>
            <Link to="/login" className="footer-link">Giris Yap</Link>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="terms-modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="terms-modal-header">
              <h2>Kullanici Sozlesmesi</h2>
              <button className="terms-modal-close" onClick={() => setShowTerms(false)}>X</button>
            </div>
            <div className="terms-modal-body">
              <pre className="terms-modal-text">{termsText}</pre>
            </div>
            <div className="terms-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowTerms(false)}>Kapat</button>
              <button className="btn btn-primary" onClick={() => { setAcceptedTerms(true); setShowTerms(false); }}>Kabul Et</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;