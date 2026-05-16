import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎌 AniGram</h1>
        <p>Anime Sosyal Medya Platformu</p>
      </header>
      <main>
        <section className="welcome">
          <h2>Hoş Geldiniz!</h2>
          <p>AniGram'a başlamak için hazırsınız mı?</p>
          <button className="btn-primary">Giriş Yap</button>
          <button className="btn-secondary">Kayıt Ol</button>
        </section>
      </main>
    </div>
  );
}

export default App;
