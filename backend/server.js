require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB bağlantısı başarılı');
})
.catch((err) => {
  console.error('❌ MongoDB bağlantı hatası:', err);
  process.exit(1);
});

// Temel Rota
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AniGram Backend çalışıyor! 🚀'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota bulunamadı',
    path: req.path
  });
});

// Sunucu Başlatma
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu ${PORT} portunda çalışıyor`);
});

module.exports = app;
