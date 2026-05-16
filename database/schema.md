# AniGram Veritabanı Şeması

## Koleksiyonlar (Collections)

### 1. Users (Kullanıcılar)

```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  avatar: String (URL),
  bio: String,
  followers: [ObjectId],
  following: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Posts (Paylaşımlar)

```javascript
{
  _id: ObjectId,
  author: ObjectId (ref: Users),
  title: String,
  content: String,
  image: String (URL),
  anime: String,
  likes: [ObjectId],
  comments: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Comments (Yorumlar)

```javascript
{
  _id: ObjectId,
  author: ObjectId (ref: Users),
  post: ObjectId (ref: Posts),
  content: String,
  likes: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Anime (Anime Başlıkları)

```javascript
{
  _id: ObjectId,
  title: String,
  japaneseTitle: String,
  synopsis: String,
  image: String (URL),
  year: Number,
  episodes: Number,
  rating: Number,
  genres: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## İlişkiler (Relationships)

- **Users ↔ Posts**: Bir kullanıcı birden çok paylaşım yapabilir (1:N)
- **Users ↔ Comments**: Bir kullanıcı birden çok yorum yapabilir (1:N)
- **Posts ↔ Comments**: Bir paylaşım birden çok yorum alabilir (1:N)
- **Users ↔ Users**: Takip sistemi (N:N - followers/following)

## İndeksler (Indexes)

```javascript
// Users Collection
db.users.createIndex({ username: 1 });
db.users.createIndex({ email: 1 });

// Posts Collection
db.posts.createIndex({ author: 1 });
db.posts.createIndex({ createdAt: -1 });
db.posts.createIndex({ anime: 1 });

// Comments Collection
db.comments.createIndex({ post: 1 });
db.comments.createIndex({ author: 1 });
```
