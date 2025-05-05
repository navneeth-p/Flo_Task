import mongoose from 'mongoose';

const pathSchema = new mongoose.Schema({
  name: String,
  points: [
    {
      x: Number,
      y: Number,
      theta: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

export default mongoose.model('Path', pathSchema);
