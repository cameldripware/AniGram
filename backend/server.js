const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'http://localhost:3002',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const { startBotLoop, stopBotLoop, runBot, getBotState, getApiCount } = require('./botEngine');

console.log('Bot motoru baslatiliyor...');
startBotLoop();
console.log('Bot aktif! ' + getApiCount() + ' API kayitli.');

app.get('/', (req, res) => {
  res.json({
    baslik: 'AniGram API Sunucusu',
    durum: 'Calisiyor',
    versiyon: '1.0.0',
    bot_durum: getBotState(),
    api_sayisi: getApiCount(),
    zaman: new Date().toLocaleString('tr-TR')
  });
});

app.get('/api/bot/status', (req, res) => {
  res.json({ hata: false, bot_durum: getBotState(), api_sayisi: getApiCount() });
});

app.post('/api/bot/run', (req, res) => {
  res.json({ hata: false, mesaj: 'Bot calistiriliyor...' });
  runBot().catch(err => console.error('Bot hatasi:', err));
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
console.log('Auth route yuklendi.');

const postRoutes = require('./routes/posts');
app.use('/api/posts', postRoutes);
console.log('Post route yuklendi.');

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
console.log('User route yuklendi.');

const storyRoutes = require('./routes/stories');
app.use('/api/stories', storyRoutes);
console.log('Story route yuklendi.');

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);
console.log('Message route yuklendi.');

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
console.log('Admin route yuklendi.');

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);
console.log('Notification route yuklendi.');

app.listen(PORT, () => {
  console.log('============================================');
  console.log('  ANIGRAM BACKEND - Port: ' + PORT);
  console.log('  Bot: Aktif (' + getApiCount() + ' API)');
  console.log('  Admin: Aktif');
  console.log('  Bildirim: Aktif');
  console.log('  Mesaj: Aktif');
  console.log('============================================');
});