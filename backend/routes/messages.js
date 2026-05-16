const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

router.get('/konusmalar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const { data: mesajlar, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id (username, name, avatar_url), receiver:receiver_id (username, name, avatar_url)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return res.status(400).json({ hata: true, mesaj: error.message });

    const konusmalar = new Map();
    (mesajlar || []).forEach(msg => {
      const digerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!konusmalar.has(digerId)) {
        const digerKullanici = msg.sender_id === user.id ? (msg.receiver || {}) : (msg.sender || {});
        konusmalar.set(digerId, {
          kullanici: digerKullanici,
          kullanici_id: digerId,
          son_mesaj: msg.content?.substring(0, 100) || (msg.media_url ? '[Medya]' : ''),
          son_mesaj_zamani: msg.created_at,
          okunmamis_sayisi: 0,
          son_mesaj_tipi: msg.media_type || 'text'
        });
      }
      const kon = konusmalar.get(digerId);
      if (!msg.is_read && msg.receiver_id === user.id) kon.okunmamis_sayisi++;
    });

    const { data: ayarlar } = await supabase.from('chat_settings').select('*').eq('user_id', user.id);
    const ayarMap = {};
    (ayarlar || []).forEach(a => { ayarMap[a.chat_user_id] = a; });

    const sonuc = Array.from(konusmalar.values()).map(kon => ({
      ...kon,
      tema_rengi: ayarMap[kon.kullanici_id]?.theme_color || '#00D4FF',
      susturuldu: ayarMap[kon.kullanici_id]?.is_muted || false,
      sabitlendi: ayarMap[kon.kullanici_id]?.is_pinned || false,
      arsivlendi: ayarMap[kon.kullanici_id]?.is_archived || false
    }));

    sonuc.sort((a, b) => {
      if (a.sabitlendi && !b.sabitlendi) return -1;
      if (!a.sabitlendi && b.sabitlendi) return 1;
      return new Date(b.son_mesaj_zamani) - new Date(a.son_mesaj_zamani);
    });

    res.json({ hata: false, konusmalar: sonuc });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const digerId = req.params.userId;

    const { data: mesajlar, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id (username, name, avatar_url), receiver:receiver_id (username, name, avatar_url), reply_to:reply_to_id (id, content, sender_id, sender:sender_id (username))')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${digerId}),and(sender_id.eq.${digerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) return res.status(400).json({ hata: true, mesaj: error.message });

    await supabase.from('messages').update({ is_read: true }).eq('receiver_id', user.id).eq('sender_id', digerId).eq('is_read', false);

    const { data: digerKullanici } = await supabase.from('users').select('id, username, name, avatar_url').eq('id', digerId).single();

    res.json({ hata: false, mesajlar: mesajlar || [], diger_kullanici: digerKullanici || { username: 'bilinmiyor' } });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.post('/gonder', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const { alici_id, content, media_url, reply_to_id } = req.body;
    if (!alici_id) return res.status(400).json({ hata: true, mesaj: 'Alici gerekli.' });
    if (!content && !media_url) return res.status(400).json({ hata: true, mesaj: 'Mesaj icerigi gerekli.' });

    const { data: mesaj, error } = await supabase.from('messages').insert([{
      sender_id: user.id, receiver_id: alici_id, content: content || '', media_url: media_url || null,
      media_type: media_url ? 'image' : 'text', reply_to_id: reply_to_id || null, is_read: false, created_at: new Date().toISOString()
    }]).select('*, sender:sender_id (username, name, avatar_url), receiver:receiver_id (username, name, avatar_url)').single();

    if (error) return res.status(400).json({ hata: true, mesaj: error.message });

    try {
      await supabase.from('notifications').insert([{
        user_id: alici_id, from_user_id: user.id, type: 'mesaj',
        message: content ? content.substring(0, 100) : 'Medya gonderdi.', is_read: false, created_at: new Date().toISOString()
      }]);
    } catch (e) {}

    res.status(201).json({ hata: false, mesaj: mesaj });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.delete('/sil/:messageId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const { data: mesaj } = await supabase.from('messages').select('sender_id').eq('id', req.params.messageId).single();
    if (!mesaj) return res.status(404).json({ hata: true, mesaj: 'Mesaj bulunamadi.' });
    if (mesaj.sender_id !== user.id) return res.status(403).json({ hata: true, mesaj: 'Sadece kendi mesajini silebilirsin.' });

    await supabase.from('messages').delete().eq('id', req.params.messageId);
    res.json({ hata: false, mesaj: 'Mesaj silindi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.put('/duzenle/:messageId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const { data: mesaj } = await supabase.from('messages').select('sender_id').eq('id', req.params.messageId).single();
    if (!mesaj) return res.status(404).json({ hata: true, mesaj: 'Mesaj bulunamadi.' });
    if (mesaj.sender_id !== user.id) return res.status(403).json({ hata: true, mesaj: 'Sadece kendi mesajini duzenleyebilirsin.' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ hata: true, mesaj: 'Icerik gerekli.' });

    const { data: guncel, error } = await supabase.from('messages').update({ content, is_edited: true, edited_at: new Date().toISOString() }).eq('id', req.params.messageId).select().single();
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    res.json({ hata: false, mesaj: guncel });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/ara/kullanici', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const arama = (req.query.q || '').trim();
    if (arama.length < 1) return res.json({ hata: false, kullanicilar: [] });

    const { data: kullanicilar, error } = await supabase.from('users').select('id, username, name, avatar_url, category').or(`username.ilike.${arama}%,name.ilike.${arama}%`).neq('id', user.id).limit(15);
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });

    const sonuc = (kullanicilar || []).map(k => ({ ...k, eslesme_tipi: k.username?.toLowerCase().startsWith(arama.toLowerCase()) ? 'kullanici_adi' : 'isim' }));
    sonuc.sort((a, b) => { if (a.eslesme_tipi === 'kullanici_adi' && b.eslesme_tipi !== 'kullanici_adi') return -1; if (a.eslesme_tipi !== 'kullanici_adi' && b.eslesme_tipi === 'kullanici_adi') return 1; return 0; });
    res.json({ hata: false, kullanicilar: sonuc });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.post('/istek', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { to_user_id } = req.body;
    if (!to_user_id) return res.status(400).json({ hata: true, mesaj: 'Alici gerekli.' });
    const { data: mevcut } = await supabase.from('message_requests').select('id').eq('from_user_id', user.id).eq('to_user_id', to_user_id).single();
    if (mevcut) return res.json({ hata: false, mesaj: 'Zaten istek var.' });
    await supabase.from('message_requests').insert([{ from_user_id: user.id, to_user_id: to_user_id, status: 'pending' }]);
    res.status(201).json({ hata: false, mesaj: 'Mesaj istegi gonderildi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/istekler/liste', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { data: istekler, error } = await supabase.from('message_requests').select('*, from_user:from_user_id (username, name, avatar_url)').eq('to_user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    res.json({ hata: false, istekler: istekler || [] });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.put('/istek/:requestId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { status } = req.body;
    if (!status || !['accepted', 'rejected'].includes(status)) return res.status(400).json({ hata: true, mesaj: 'Gecersiz durum.' });
    const { data: istek } = await supabase.from('message_requests').select('*').eq('id', req.params.requestId).eq('to_user_id', user.id).single();
    if (!istek) return res.status(404).json({ hata: true, mesaj: 'Istek bulunamadi.' });
    await supabase.from('message_requests').update({ status }).eq('id', req.params.requestId);
    res.json({ hata: false, mesaj: status === 'accepted' ? 'Istek kabul edildi.' : 'Istek reddedildi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

module.exports = router;