const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/sessions — create a session with a unique PIN. The host calls
// this from the slide creator, optionally passing the built slide deck.
router.post('/', async (req, res) => {
  try {
    let pin = generatePin();
    while (await Session.findOne({ pin })) {
      pin = generatePin();
    }

    const session = await Session.create({
      pin,
      slides: req.body.slides || [],
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:pin — look up a session, e.g. to validate a PIN.
router.get('/:pin', async (req, res) => {
  try {
    const session = await Session.findOne({ pin: req.params.pin });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

module.exports = router;
