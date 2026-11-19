import { useEffect, useState } from 'react';
import api from '../api/axios';

function Home() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setStatus(res.data.ok ? 'connected' : 'unexpected response'))
      .catch(() => setStatus('not reachable'));
  }, []);

  return (
    <div>
      <h1>Welcome to RQMS</h1>
      <p>API status: {status}</p>
    </div>
  );
}

export default Home;
