const express = require('express');
const Path = require('../models/Path.js');
const Station = require('../models/Station.js');
import mongoose from 'mongoose';
import rclnodejs from 'rclnodejs';

const router = express.Router();

router.use(express.json());

router.post('/savePath', async (req, res) => {
  try {
    const { name, points } = req.body;
    const newPath = new Path({ name, points });
    await newPath.save();
    res.status(201).json({ message: 'Path saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save path' });
  }
});

router.get('/paths', async (req, res) => {
  try {
    const paths = await Path.find().sort({ createdAt: -1 });
    res.json(paths);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
});

module.exports = router;