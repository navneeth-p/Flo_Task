// src/App.tsx
import React from 'react';
import Scene from './components/Scene';
import ROSConnection from './components/ROSConnection';
import './App.css';

function App() {
  return (
    <div className='App'>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
        <ROSConnection />
      </div>
      <Scene />
    </div>
  );
}

export default App;