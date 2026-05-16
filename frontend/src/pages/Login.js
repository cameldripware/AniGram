import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const navigate = useNavigate();

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Email ve sifre gereklidir.', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error('JSON parse hatasi. Gelen:', text.substring(0, 100));
        showToast('Sunucu hatasi. Lutfen tekrar deneyin.', 'error');
        setLoading(false);
        return;
      }

      if (data.hata) {
        showToast(data.mesaj || 'Giris basarisiz.', 'error');
        setLoading(false);
        return;
      }

      if (!data.token || !data.kullanici) {
        showToast('Giris basarisiz. Eksik veri.', 'error');
        setLoading(false);
        return;
      }

      localStorage.setItem('anigram_token', data.token);
      onLogin(data.kullanici, data.token);
      navigate('/');
    } catch (err) {
      console.error('Giris hatasi:', err);
      showToast('Baglanti hatasi. Internetinizi kontrol edin.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'info' })} />

      <div className="login-container">
        <div className="login-logo-section">
          <div className="logo-wrapper">
            <h1 className="login-logo">
              <span className="logo-char">A</span><span className="logo-char">n</span><span className="logo-char">i</span><span className="logo-char">G</span><span className="logo-char">r</span><span className="logo-char">a</span><span className="logo-char">m</span>
            </h1>
            <div className="logo-underline"></div>
          </div>
          <p className="login-subtitle">Anime Dunyasina Hos Geldin</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleLogin}>
            <div className="form-group-register">
              <label className="form-label-register">E-posta</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input type="email" className="form-input-register" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="form-group-register">
              <label className="form-label-register">Sifre</label>
              <div className="input-wrapper">
                <span className="input-icon">*</span>
                <input type={showPassword ? 'text' : 'password'} className="form-input-register" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Gizle' : 'Goster'}</button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Giris Yapiliyor...' : 'Giris Yap'}
            </button>
          </form>

          <div className="login-footer">
            <div className="login-divider"><span>Hesabin yok mu?</span></div>
            <Link to="/register" className="login-register-link">Kayit Ol</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;