import Path from '../models/Path.js';

export const savePath = async (req, res) => {
  try {
    const { name, points } = req.body;
    const newPath = new Path({ name, points });
    await newPath.save();
    res.status(200).json({ message: 'Path saved successfully!' });
  } catch (error) {
    console.error("Error saving path:", error);
    res.status(500).json({ message: 'Failed to save path' });
  }
};
