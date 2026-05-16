const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !user) return res.status(404).json({ hata: true, mesaj: 'Kullanici bulunamadi.' });

    const { data: posts } = await supabase.from('posts').select('*, post_media (*), post_tags (*)').eq('user_id', user.id).order('created_at', { ascending: false });
    const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
    const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
    const { data: favoriAnimeler } = await supabase.from('favorite_animes').select('*').eq('user_id', user.id).limit(5);

    const islenmisGonderiler = [];
    if (posts) {
      for (let i = 0; i < posts.length; i++) {
        const gonderi = posts[i];
        const { count: begeniCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', gonderi.id);
        islenmisGonderiler.push({ ...gonderi, begeni_sayisi: begeniCount || 0 });
      }
    }

    res.json({
      hata: false,
      kullanici: { ...user, gonderi_sayisi: posts ? posts.length : 0, takipci_sayisi: followersCount || 0, takip_edilen_sayisi: followingCount || 0 },
      gonderiler: islenmisGonderiler,
      favori_animeler: favoriAnimeler || []
    });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: 'Sunucu hatasi.' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { name, bio, website, category, is_private } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (category !== undefined) updateData.category = category;
    if (is_private !== undefined) updateData.is_private = is_private;
    const { data: updatedUser, error } = await supabase.from('users').update(updateData).eq('id', user.id).select().single();
    if (error) return res.status(400).json({ hata: true, mesaj: 'Profil guncellenemedi.' });
    res.json({ hata: false, kullanici: updatedUser });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: 'Sunucu hatasi.' });
  }
});

router.post('/follow/:userId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const followingId = req.params.userId;
    if (user.id === followingId) return res.status(400).json({ hata: true, mesaj: 'Kendini takip edemezsin.' });
    const { data: existing } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', followingId).single();
    if (existing) { await supabase.from('follows').delete().eq('id', existing.id); return res.json({ hata: false, durum: 'unfollowed' }); }
    else { await supabase.from('follows').insert([{ follower_id: user.id, following_id: followingId, created_at: new Date().toISOString() }]); return res.json({ hata: false, durum: 'followed' }); }
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: 'Sunucu hatasi.' });
  }
});

router.post('/favori-anime', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const { anime_id, anime_name, anime_image } = req.body;
    if (!anime_id) return res.status(400).json({ hata: true, mesaj: 'Anime ID gerekli.' });

    const { data: mevcut } = await supabase.from('favorite_animes').select('id').eq('user_id', user.id).eq('anime_id', anime_id).single();
    if (mevcut) { await supabase.from('favorite_animes').delete().eq('id', mevcut.id); return res.json({ hata: false, durum: 'kaldirildi', mesaj: 'Favori animelerden kaldirildi.' }); }

    const { count } = await supabase.from('favorite_animes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if (count >= 5) return res.status(400).json({ hata: true, mesaj: 'En fazla 5 favori anime ekleyebilirsiniz.' });

    await supabase.from('favorite_animes').insert([{ user_id: user.id, anime_id, anime_name: anime_name || '', anime_image: anime_image || '' }]);
    res.json({ hata: false, durum: 'eklendi', mesaj: 'Favori animelere eklendi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/anime-ara', async (req, res) => {
  try {
    const arama = req.query.q || '';
    if (arama.length < 2) return res.json({ hata: false, animeler: [] });
    const https = require('https');
    const url = 'https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(arama) + '&limit=8&order_by=popularity&sfw=true';
    https.get(url, { headers: { 'User-Agent': 'AniGram/1.0' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const animeler = (parsed.data || []).map(a => ({ anime_id: a.mal_id, anime_name: a.title, anime_image: a.images?.jpg?.image_url || a.images?.jpg?.small_image_url || '' }));
          res.json({ hata: false, animeler });
        } catch (e) { res.json({ hata: false, animeler: [] }); }
      });
    }).on('error', () => { res.json({ hata: false, animeler: [] }); });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

module.exports = router;