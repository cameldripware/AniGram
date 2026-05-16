const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

// Kayit Ol
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, name } = req.body;

    if (!email || !password || !username) {
      return res.json({ hata: true, mesaj: 'Email, sifre ve kullanici adi zorunludur.' });
    }

    if (password.length < 6) {
      return res.json({ hata: true, mesaj: 'Sifre en az 6 karakter olmalidir.' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.json({ hata: true, mesaj: 'Bu kullanici adi zaten alinmis.' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username,
        name: name || username
      }
    });

    if (authError) {
      return res.json({ hata: true, mesaj: authError.message });
    }

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        username: username,
        name: name || username,
        bio: '',
        website: '',
        category: 'Anime Izleyici',
        is_private: false,
        avatar_url: '',
        banner_url: '',
        created_at: new Date().toISOString()
      }]);

    if (userError) {
      return res.json({ hata: true, mesaj: 'Profil olusturulamadi.' });
    }

    res.json({
      hata: false,
      mesaj: 'Kayit basarili!',
      kullanici: {
        id: authData.user.id,
        email: email,
        username: username,
        name: name || username
      }
    });

  } catch (error) {
    res.json({ hata: true, mesaj: 'Sunucu hatasi: ' + error.message });
  }
});

// Giris Yap
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ hata: true, mesaj: 'Email ve sifre gerekli.' });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      return res.json({ hata: true, mesaj: 'Email veya sifre hatali.' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.json({ hata: true, mesaj: 'Kullanici profili bulunamadi.' });
    }

    res.json({
      hata: false,
      mesaj: 'Giris basarili!',
      token: authData.session.access_token,
      kullanici: userData
    });

  } catch (error) {
    res.json({ hata: true, mesaj: 'Sunucu hatasi: ' + error.message });
  }
});

// Cikis Yap
router.post('/logout', async (req, res) => {
  try {
    await supabase.auth.signOut();
    res.json({ hata: false, mesaj: 'Cikis yapildi.' });
  } catch (error) {
    res.json({ hata: true, mesaj: 'Sunucu hatasi.' });
  }
});

// Token Kontrol (Oturum - Sayfa yenilendiginde)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({ hata: true, mesaj: 'Token gerekli.' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.json({ hata: true, mesaj: 'Gecersiz oturum.' });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return res.json({ hata: true, mesaj: 'Kullanici bulunamadi.' });
    }

    res.json({ hata: false, kullanici: userData });

  } catch (error) {
    res.json({ hata: true, mesaj: 'Sunucu hatasi.' });
  }
});

module.exports = router;