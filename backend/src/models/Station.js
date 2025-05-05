const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Station', StationSchema);
