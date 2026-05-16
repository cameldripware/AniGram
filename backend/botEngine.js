const { supabaseAdmin } = require('./supabaseClient');
const https = require('https');
const http = require('http');

const YOUTUBE_API_KEY = 'AIzaSyDXc7KExaHq3_bi-AmxBUhdxUbsSh24aAs';

const CONFIG = {
  FETCH_INTERVAL_MS: 30000,
  MAX_POSTS_PER_SOURCE: 15,
  MAX_TOTAL_POSTS_PER_RUN: 200,
  RATE_LIMIT_DELAY: 200,
  RETRY_COUNT: 2,
};

let botState = {
  isRunning: false,
  lastRun: null,
  totalPostsCreated: 0,
  totalApiCalls: 0,
  failedApis: [],
  currentSource: null,
  startTime: null,
  runCount: 0,
};

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'AniGram-Bot/6.0',
          'Accept': 'application/json',
          ...options.headers,
        },
        timeout: 10000,
      };
      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data: data }); }
        });
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      if (options.body) {
        const bodyStr = JSON.stringify(options.body);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Content-Length', Buffer.byteLength(bodyStr));
        req.write(bodyStr);
      }
      req.end();
    } catch (err) { reject(err); }
  });
}

async function isDuplicateUrl(url) {
  if (!url) return true;
  try {
    const { data } = await supabaseAdmin.from('post_media').select('id').eq('media_url', url).limit(1);
    return data && data.length > 0;
  } catch { return false; }
}

let cachedBotUserId = null;
async function getBotUserId() {
  if (cachedBotUserId) return cachedBotUserId;
  try {
    const { data: existingBot } = await supabaseAdmin.from('users').select('id').eq('username', 'anigram_bot').single();
    if (existingBot) { cachedBotUserId = existingBot.id; return existingBot.id; }
    const botEmail = 'bot@anigram.internal';
    const botPassword = 'AniGramBot_Secure_' + Math.random().toString(36);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: botEmail, password: botPassword, email_confirm: true,
      user_metadata: { username: 'anigram_bot', name: 'AniGram Bot' }
    });
    if (authError) throw authError;
    await supabaseAdmin.from('users').insert([{
      id: authData.user.id, email: botEmail, username: 'anigram_bot', name: 'AniGram Bot',
      bio: 'Otomatik icerik botu. YouTube Shorts + Gercek Anime Gor selleri.', category: 'Bot', is_private: false,
      avatar_url: '', banner_url: '', created_at: new Date().toISOString()
    }]);
    cachedBotUserId = authData.user.id;
    return authData.user.id;
  } catch (error) { console.error('Bot user error:', error.message); return null; }
}

async function createPost(botUserId, postData) {
  try {
    if (!botUserId) return null;
    if (postData.media_url && await isDuplicateUrl(postData.media_url)) return null;
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .insert([{ user_id: botUserId, caption: postData.caption || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select().single();
    if (postError) return null;
    if (postData.media_url) {
      await supabaseAdmin.from('post_media').insert([{
        post_id: post.id, media_url: postData.media_url,
        media_type: postData.media_type || 'image', order_index: 0
      }]);
    }
    const tags = [];
    if (postData.anime_name) tags.push({ post_id: post.id, anime_name: postData.anime_name });
    if (postData.source_name) tags.push({ post_id: post.id, anime_name: '[BOT] ' + postData.source_name });
    if (tags.length > 0) await supabaseAdmin.from('post_tags').insert(tags);
    return post;
  } catch { return null; }
}

const API_REGISTRY = [
  {
    name: 'YouTube - Badass Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=badass+anime+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Anime Edit',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Jujutsu Kaisen Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=jujutsu+kaisen+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Jujutsu Kaisen',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Demon Slayer Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=demon+slayer+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Demon Slayer',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - AMV Blood Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=amv+anime+blood+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'AMV Edit',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Attack on Titan Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=attack+on+titan+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Attack on Titan',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Chainsaw Man Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=chainsaw+man+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Chainsaw Man',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Anime Fight Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=anime+fight+scene+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Anime Fight',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - One Piece Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=one+piece+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'One Piece',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Naruto Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=naruto+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Naruto',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'YouTube - Bleach Edit',
    url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=bleach+edit+shorts&type=video&videoDuration=short&videoEmbeddable=true&key=' + YOUTUBE_API_KEY,
    method: 'GET',
    extractor: (d) => (d?.items || []).map(v => ({
      media_url: 'https://www.youtube.com/embed/' + v.id.videoId,
      caption: v.snippet.title + '\n\nKanal: ' + v.snippet.channelTitle + '\n\nKaynak: YouTube Shorts',
      anime_name: 'Bleach',
      source_name: 'YouTube Shorts',
      media_type: 'video'
    })),
  },
  {
    name: 'AniList Trending',
    url: 'https://graphql.anilist.co',
    method: 'POST',
    body: { query: '{ Page(page:1,perPage:10) { media(type:ANIME,sort:TRENDING_DESC) { id title{romaji english} coverImage{large extraLarge} description genres averageScore } } }' },
    extractor: (d) => (d?.data?.Page?.media || []).map(m => ({
      media_url: m.coverImage?.extraLarge || m.coverImage?.large,
      caption: (m.title?.romaji || m.title?.english) + '\n\n' + (m.description || '').substring(0, 200) + '...\n\nPuan: ' + m.averageScore + '/100\nKaynak: AniList',
      anime_name: m.title?.romaji || m.title?.english,
      source_name: 'AniList',
      media_type: 'image'
    })),
  },
  {
    name: 'AniList Popular',
    url: 'https://graphql.anilist.co',
    method: 'POST',
    body: { query: '{ Page(page:1,perPage:10) { media(type:ANIME,sort:POPULARITY_DESC) { id title{romaji english} coverImage{large extraLarge} description genres averageScore } } }' },
    extractor: (d) => (d?.data?.Page?.media || []).map(m => ({
      media_url: m.coverImage?.extraLarge || m.coverImage?.large,
      caption: (m.title?.romaji || m.title?.english) + '\n\n' + (m.description || '').substring(0, 200) + '...\n\nPuan: ' + m.averageScore + '/100\nKaynak: AniList',
      anime_name: m.title?.romaji || m.title?.english,
      source_name: 'AniList',
      media_type: 'image'
    })),
  },
  {
    name: 'Jikan Top Anime',
    url: 'https://api.jikan.moe/v4/top/anime?limit=10',
    method: 'GET',
    extractor: (d) => (d?.data || []).map(a => ({
      media_url: a.images?.jpg?.large_image_url,
      caption: a.title + '\n\n' + (a.synopsis || '').substring(0, 200) + '...\n\nPuan: ' + a.score + '/10\nKaynak: MyAnimeList',
      anime_name: a.title,
      source_name: 'Jikan',
      media_type: 'image'
    })),
  },
  {
    name: 'Jikan Guncel Sezon',
    url: 'https://api.jikan.moe/v4/seasons/now?limit=10',
    method: 'GET',
    extractor: (d) => (d?.data || []).map(a => ({
      media_url: a.images?.jpg?.large_image_url,
      caption: a.title + '\n\n' + (a.synopsis || '').substring(0, 200) + '...\n\nGUNCEL SEZON\nKaynak: MyAnimeList',
      anime_name: a.title,
      source_name: 'Jikan',
      media_type: 'image'
    })),
  },
  {
    name: 'Kitsu Anime',
    url: 'https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=10',
    method: 'GET',
    headers: { 'Accept': 'application/vnd.api+json' },
    extractor: (d) => (d?.data || []).map(a => ({
      media_url: a.attributes?.posterImage?.large,
      caption: a.attributes?.canonicalTitle + '\n\n' + (a.attributes?.synopsis || '').substring(0, 200) + '...\nKaynak: Kitsu',
      anime_name: a.attributes?.canonicalTitle,
      source_name: 'Kitsu',
      media_type: 'image'
    })),
  },
  {
    name: 'AnimeChan Alintilar',
    url: 'https://animechan.xyz/api/random/quotes',
    method: 'GET',
    extractor: (d) => d?.quote ? [{ media_url: null, caption: '"' + d.quote + '"\n\n-- ' + d.character + ' (' + d.anime + ')\nKaynak: AnimeChan', anime_name: d.anime, source_name: 'AnimeChan', media_type: 'text' }] : [],
  },
  {
    name: 'Waifu.im - Silahli Anime',
    url: 'https://api.waifu.im/search?is_nsfw=false&many=true&limit=5&included_tags=weapon,uniform',
    method: 'GET',
    extractor: (d) => (d?.images || []).map(img => ({
      media_url: img.url,
      caption: 'Etiketler: ' + (img.tags || []).map(t => t.name).join(', ') + '\nKaynak: Waifu.im',
      anime_name: img.tags?.[0]?.name || 'Anime',
      source_name: 'Waifu.im',
      media_type: 'image'
    })),
  },
];

async function runBot() {
  if (botState.isRunning) { console.log('[BOT] Zaten calisiyor...'); return; }
  botState.isRunning = true;
  botState.startTime = Date.now();
  botState.runCount++;
  let totalCreated = 0;
  console.log('\n' + '='.repeat(50));
  console.log('  ANIGRAM BOT #' + botState.runCount + ' | API: ' + API_REGISTRY.length);
  console.log('='.repeat(50));
  const botUserId = await getBotUserId();
  if (!botUserId) { botState.isRunning = false; return; }
  const shuffledApis = [...API_REGISTRY].sort(() => Math.random() - 0.5);
  for (const api of shuffledApis) {
    if (totalCreated >= CONFIG.MAX_TOTAL_POSTS_PER_RUN) break;
    botState.currentSource = api.name;
    try {
      const response = await httpRequest(api.url, { method: api.method, body: api.body, headers: api.headers });
      botState.totalApiCalls++;
      const extractedPosts = api.extractor(response.data) || [];
      console.log('  [' + api.name + '] ' + extractedPosts.length + ' icerik');
      for (const postData of extractedPosts) {
        if (totalCreated >= CONFIG.MAX_TOTAL_POSTS_PER_RUN) break;
        const post = await createPost(botUserId, postData);
        if (post) { totalCreated++; botState.totalPostsCreated++; }
        await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_DELAY));
      }
    } catch (error) { botState.failedApis.push({ name: api.name, reason: error.message }); }
    await new Promise(r => setTimeout(r, 300));
  }
  botState.lastRun = new Date().toISOString();
  botState.isRunning = false;
  console.log('  TOPLAM: ' + totalCreated + ' | Tum zamanlar: ' + botState.totalPostsCreated);
  console.log('='.repeat(50) + '\n');
  botState.failedApis = [];
}

let botInterval = null;
function startBotLoop() {
  console.log('[BOT] Baslatildi (' + (CONFIG.FETCH_INTERVAL_MS / 1000) + ' sn)');
  runBot();
  botInterval = setInterval(() => runBot().catch(e => console.error(e)), CONFIG.FETCH_INTERVAL_MS);
}
function stopBotLoop() { if (botInterval) { clearInterval(botInterval); botInterval = null; } }

module.exports = { runBot, startBotLoop, stopBotLoop, getBotState: () => botState, getApiCount: () => API_REGISTRY.length, API_REGISTRY };