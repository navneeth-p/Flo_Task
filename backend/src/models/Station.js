import mongoose from 'mongoose';
import express from 'express';
import e from 'express';

const StationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Station', StationSchema);
