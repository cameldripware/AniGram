const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

router.get('/explore', async (req, res) => {
  try {
    const sayfa = parseInt(req.query.sayfa) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const baslangic = (sayfa - 1) * limit;
    const { data: gonderiler, error, count } = await supabase
      .from('posts')
      .select('*, users:user_id (username, name, avatar_url), post_media (*), post_tags (*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(baslangic, baslangic + limit - 1);
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    if (!gonderiler || gonderiler.length === 0) return res.json({ hata: false, gonderiler: [], toplam: 0, sayfa: sayfa, toplam_sayfa: 0 });
    const gonderiIdleri = gonderiler.map(g => g.id);
    const { data: tumBegeniler } = await supabase.from('likes').select('post_id').in('post_id', gonderiIdleri);
    const { data: tumYorumlar } = await supabase.from('comments').select('*, users:user_id (username, name, avatar_url)').in('post_id', gonderiIdleri).order('created_at', { ascending: true }).limit(100);
    const begeniSayilari = {};
    if (tumBegeniler) { tumBegeniler.forEach(b => { begeniSayilari[b.post_id] = (begeniSayilari[b.post_id] || 0) + 1; }); }
    const yorumMap = {};
    if (tumYorumlar) { tumYorumlar.forEach(y => { if (!yorumMap[y.post_id]) yorumMap[y.post_id] = []; if (yorumMap[y.post_id].length < 3) yorumMap[y.post_id].push(y); }); }
    const islenmisGonderiler = gonderiler.map(gonderi => {
      const medyalar = gonderi.post_media || [];
      const etiketler = gonderi.post_tags || [];
      const kullanici = gonderi.users || { username: 'bilinmiyor', name: 'Bilinmiyor', avatar_url: '' };
      return { id: gonderi.id, user_id: gonderi.user_id, caption: gonderi.caption || '', created_at: gonderi.created_at, kullanici: kullanici, users: kullanici, post_media: medyalar, post_tags: etiketler, begeni_sayisi: begeniSayilari[gonderi.id] || 0, yorumlar: yorumMap[gonderi.id] || [], yorum_sayisi: (yorumMap[gonderi.id] || []).length };
    });
    res.json({ hata: false, gonderiler: islenmisGonderiler, toplam: count || 0, sayfa: sayfa, toplam_sayfa: Math.ceil((count || 0) / limit) });
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

router.get('/feed', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const sayfa = parseInt(req.query.sayfa) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const baslangic = (sayfa - 1) * limit;
    let gonderiSorgu = supabase.from('posts').select('*, users:user_id (username, name, avatar_url), post_media (*), post_tags (*)').order('created_at', { ascending: false }).range(baslangic, baslangic + limit - 1);
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const takipEdilenIdler = [user.id];
          const { data: takipData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
          if (takipData) { takipData.forEach(t => takipEdilenIdler.push(t.following_id)); }
          const { data: botKullanici } = await supabase.from('users').select('id').eq('username', 'anigram_bot').single();
          if (botKullanici) takipEdilenIdler.push(botKullanici.id);
          gonderiSorgu = gonderiSorgu.in('user_id', takipEdilenIdler);
        }
      } catch (authHatasi) {}
    }
    const { data: gonderiler, error } = await gonderiSorgu;
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    if (!gonderiler || gonderiler.length === 0) return res.json({ hata: false, gonderiler: [], sayfa: sayfa });
    const gonderiIdleri = gonderiler.map(g => g.id);
    const { data: tumBegeniler } = await supabase.from('likes').select('post_id').in('post_id', gonderiIdleri);
    const { data: tumYorumlar } = await supabase.from('comments').select('*, users:user_id (username, name, avatar_url)').in('post_id', gonderiIdleri).order('created_at', { ascending: true }).limit(50);
    const begeniSayilari = {};
    if (tumBegeniler) { tumBegeniler.forEach(b => { begeniSayilari[b.post_id] = (begeniSayilari[b.post_id] || 0) + 1; }); }
    const yorumMap = {};
    if (tumYorumlar) { tumYorumlar.forEach(y => { if (!yorumMap[y.post_id]) yorumMap[y.post_id] = []; if (yorumMap[y.post_id].length < 2) yorumMap[y.post_id].push(y); }); }
    const islenmisGonderiler = gonderiler.map(gonderi => {
      const medyalar = gonderi.post_media || [];
      const etiketler = gonderi.post_tags || [];
      const kullanici = gonderi.users || { username: 'bilinmiyor', name: 'Bilinmiyor', avatar_url: '' };
      return { id: gonderi.id, user_id: gonderi.user_id, caption: gonderi.caption || '', created_at: gonderi.created_at, kullanici: kullanici, users: kullanici, post_media: medyalar, post_tags: etiketler, begeni_sayisi: begeniSayilari[gonderi.id] || 0, yorumlar: yorumMap[gonderi.id] || [], yorum_sayisi: (yorumMap[gonderi.id] || []).length };
    });
    res.json({ hata: false, gonderiler: islenmisGonderiler, sayfa: sayfa });
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

router.get('/trending', async (req, res) => {
  try {
    const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: gonderiler, error } = await supabase.from('posts').select('*, users:user_id (username, name, avatar_url), post_media (*), post_tags (*)').gte('created_at', yediGunOnce).order('created_at', { ascending: false }).limit(50);
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    if (!gonderiler || gonderiler.length === 0) return res.json({ hata: false, gonderiler: [] });
    const gonderiIdleri = gonderiler.map(g => g.id);
    const { data: tumBegeniler } = await supabase.from('likes').select('post_id').in('post_id', gonderiIdleri);
    const begeniSayilari = {};
    if (tumBegeniler) { tumBegeniler.forEach(b => { begeniSayilari[b.post_id] = (begeniSayilari[b.post_id] || 0) + 1; }); }
    const siralanmis = gonderiler.map(g => ({ ...g, begeni_sayisi: begeniSayilari[g.id] || 0 })).sort((a, b) => b.begeni_sayisi - a.begeni_sayisi).slice(0, 10);
    res.json({ hata: false, gonderiler: siralanmis });
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

router.get('/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    if (['explore', 'feed', 'trending'].includes(postId)) return res.status(400).json({ hata: true, mesaj: 'Geçersiz istek.' });
    const { data: gonderi, error } = await supabase.from('posts').select('*, users:user_id (username, name, avatar_url), post_media (*), post_tags (*)').eq('id', postId).single();
    if (error || !gonderi) return res.status(404).json({ hata: true, mesaj: 'Gönderi bulunamadı.' });
    let begeniSayisi = 0;
    const { count: begeniCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    begeniSayisi = begeniCount || 0;
    const { data: yorumlar } = await supabase.from('comments').select('*, users:user_id (username, name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true }).limit(20);
    const { data: begenenler } = await supabase.from('likes').select('*, users:user_id (username, name, avatar_url)').eq('post_id', postId).limit(10);
    res.json({ hata: false, gonderi: { ...gonderi, begeni_sayisi: begeniSayisi, yorumlar: yorumlar || [], begenenler: begenenler || [], yorum_sayisi: (yorumlar || []).length } });
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

router.post('/like/:postId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Geçersiz oturum.' });
    const postId = req.params.postId;
    const { data: mevcut } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', postId).single();
    if (mevcut) {
      await supabase.from('likes').delete().eq('id', mevcut.id);
      const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
      return res.json({ hata: false, durum: 'unliked', begeni_sayisi: count || 0 });
    } else {
      await supabase.from('likes').insert([{ user_id: user.id, post_id: postId, created_at: new Date().toISOString() }]);
      const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
      try {
        const { data: gonderi } = await supabase.from('posts').select('user_id').eq('id', postId).single();
        if (gonderi && gonderi.user_id !== user.id) {
          await supabase.from('notifications').insert([{ user_id: gonderi.user_id, from_user_id: user.id, type: 'begeni', message: 'gonderini begendi.', post_id: postId, is_read: false, created_at: new Date().toISOString() }]);
        }
      } catch (notifHatasi) {}
      return res.json({ hata: false, durum: 'liked', begeni_sayisi: count || 0 });
    }
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

router.post('/comment/:postId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Geçersiz oturum.' });
    const { content } = req.body;
    if (!content || content.trim().length === 0) return res.status(400).json({ hata: true, mesaj: 'Yorum içeriği gerekli.' });
    const { data: yorum, error } = await supabase.from('comments').insert([{ user_id: user.id, post_id: req.params.postId, content: content.trim(), created_at: new Date().toISOString() }]).select('*, users:user_id (username, name, avatar_url)').single();
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    try {
      const { data: gonderi } = await supabase.from('posts').select('user_id').eq('id', req.params.postId).single();
      if (gonderi && gonderi.user_id !== user.id) {
        await supabase.from('notifications').insert([{ user_id: gonderi.user_id, from_user_id: user.id, type: 'yorum', message: 'gonderine yorum yapti: ' + content.trim().substring(0, 50), post_id: req.params.postId, is_read: false, created_at: new Date().toISOString() }]);
      }
    } catch (notifHatasi) {}
    res.status(201).json({ hata: false, yorum });
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

router.post('/save/:postId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Geçersiz oturum.' });
    const postId = req.params.postId;
    const { data: mevcut } = await supabase.from('saved_posts').select('id').eq('user_id', user.id).eq('post_id', postId).single();
    if (mevcut) {
      await supabase.from('saved_posts').delete().eq('id', mevcut.id);
      return res.json({ hata: false, durum: 'unsaved' });
    } else {
      await supabase.from('saved_posts').insert([{ user_id: user.id, post_id: postId, created_at: new Date().toISOString() }]);
      return res.json({ hata: false, durum: 'saved' });
    }
  } catch (hata) { res.status(500).json({ hata: true, mesaj: hata.message }); }
});

module.exports = router;