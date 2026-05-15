const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiService = require('../services/ai.service');

router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mesaj alanı zorunludur.' });
    }

    // auth middleware'inden gelen company_id (Tenant Isolation)
    // Sadece bu ID üzerinden işlem yapılır.
    const companyId = req.user.company_id;

    // AI servisini çağır
    const reply = await aiService.handleChat(message, companyId);
    
    res.json({ reply });
  } catch (error) {
    console.error('AI Route Error:', error);
    res.status(500).json({ error: 'Asistanla iletişimde bir sunucu hatası oluştu.' });
  }
});

module.exports = router;
