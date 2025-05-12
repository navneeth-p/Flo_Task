// src/components/ROSConnection.tsx
import React, { useEffect } from 'react';
import { useStore } from '../store';

const ROSConnection: React.FC = () => {
  const { connected, error, initializeSocket, publishVelocity } = useStore();

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  return (
    <div
      style={{
        padding: '22px 24px',
        background: 'hsl(240, 6%, 10%)',
        borderRadius: '18px',
        boxShadow: '0 6px 32px #000b',
        border: '1.5px solid hsl(240, 4%, 16%)',
        minWidth: 220,
        fontFamily: 'Inter, sans-serif',
        color: 'hsl(0,0%,98%)',
        fontSize: 16,
        fontWeight: 500,
        marginBottom: 16,
        display: 'inline-block',
        transition: 'box-shadow 0.2s',
      }}
    >
      <p style={{ margin: '0 0 18px 0', fontWeight: 600, fontSize: 18 }}>
        ROS Status:{' '}
        <span style={{ color: connected ? '#4ade80' : '#f87171', fontWeight: 700 }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </p>
      {error && <p style={{ color: '#ff69f6', marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div></div>
        <button
          onClick={() => publishVelocity(1, 0)}
          style={rosBtnStyle}
        >
          Forward
        </button>
        <div></div>
        <button
          onClick={() => publishVelocity(0, 1)}
          style={rosBtnStyle}
        >
          Left
        </button>
        <button
          onClick={() => publishVelocity(0, 0)}
          style={rosBtnStyle}
        >
          Stop
        </button>
        <button
          onClick={() => publishVelocity(0, -1)}
          style={rosBtnStyle}
        >
          Right
        </button>
        <div></div>
        <button
          onClick={() => publishVelocity(-1, 0)}
          style={rosBtnStyle}
        >
          Backward
        </button>
        <div></div>
      </div>
    </div>
  );
};

const rosBtnStyle: React.CSSProperties = {
  background: 'hsl(240, 5%, 18%)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 0',
  fontWeight: 600,
  fontSize: 15,
  boxShadow: '0 1px 4px #0003',
  transition: 'background 0.2s',
  cursor: 'pointer',
  outline: 'none',
  margin: 0,
};

export default ROSConnection;