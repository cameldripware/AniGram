const express = require('express');var router = express.Router();router.get('/test', function(req, res) { res.json({ mesaj: 'Stories OK' }); });module.exports = router;  
