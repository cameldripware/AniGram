import React from 'react';
import './Explore.css';

function Kesfet({ user }) {
  return (
    <div className="kesfet-sayfa">
      <div className="kesfet-baslik">
        <h2 className="kesfet-baslik-yazi">Keşfet</h2>
      </div>

      <div className="kesfet-yakinda-kapsayici">
        <div className="kesfet-yakinda-ikon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h2 className="kesfet-yakinda-baslik">Keşfet</h2>
        <p className="kesfet-yakinda-aciklama">
          Keşfet özelliğimiz çok yakında sizlerle!
        </p>
        <p className="kesfet-yakinda-alt-aciklama">
          Şu anda ana sayfada en güncel anime içeriklerini görebilir, beğenebilir ve yorum yapabilirsiniz.
          Keşfet sayfası için ekibimiz harıl harıl çalışıyor.
        </p>
        <div className="kesfet-yakinda-ayrac"></div>
        <p className="kesfet-yakinda-tahmin">
          Tahmini yayın tarihi: Çok yakında
        </p>
      </div>
    </div>
  );
}

export default Kesfet;