// ============================================
// TOAST BİLDİRİM BİLEŞENİ
// Premium görünümlü, anime ruhlu bildirimler
// ============================================

import React, { useEffect, useState } from 'react';
import './Toast.css';

function Toast({ show, message, type = 'info', onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsLeaving(false);
    } else if (isVisible) {
      setIsLeaving(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsLeaving(false);
      }, 400);
    }
  }, [show]);

  if (!isVisible) return null;

  // Toast tipine göre ikon ve renk belirleme
  const toastIcons = {
    success: '✓',
    error: '!',
    warning: '△',
    info: 'i'
  };

  const toastColors = {
    success: 'var(--basarili-yesil)',
    error: 'var(--hata-kirmizi)',
    warning: 'var(--uyari-sari)',
    info: 'var(--vurgu-renk)'
  };

  return (
    <div className={`toast-container ${isLeaving ? 'toast-leaving' : 'toast-entering'}`}>
      <div 
        className={`toast-content toast-${type}`}
        style={{ '--toast-color': toastColors[type] }}
      >
        <div className="toast-icon-wrapper">
          <span className="toast-icon">{toastIcons[type]}</span>
          <div className="toast-icon-ring"></div>
        </div>
        <p className="toast-message">{message}</p>
        <button className="toast-close" onClick={onClose}>
          ×
        </button>
        <div className="toast-progress-bar">
          <div className="toast-progress-fill"></div>
        </div>
      </div>
    </div>
  );
}

export default Toast;