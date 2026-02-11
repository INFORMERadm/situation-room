import { useState, useEffect } from 'react';

export default function Header() {
  const [time, setTime] = useState(new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #292929',
        padding: '6px 16px',
        color: '#00ff88',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}
    >
      GLOBAL MONITOR | {time} UTC
    </div>
  );
}
