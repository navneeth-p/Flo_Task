import express from 'express';
import Station from '../models/Station.js';

const router = express.Router();
router.use(express.json());

router.post('/saveStation', async (req, res) => {
  try {
    const { name, x, y } = req.body;
    const newStation = new Station({ name, x, y });
    await newStation.save();
    res.status(201).json({ message: 'Station saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save station' });
  }
});

router.get('/stations', async (req, res) => {
  try {
    const stations = await Station.find().sort({ createdAt: -1 });
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

export default router;

