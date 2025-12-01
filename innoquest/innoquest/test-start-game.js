const gameId = '00000000-0000-0000-0000-000000000001';

fetch('http://localhost:3000/api/start-game', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gameId })
})
.then(res => res.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('Error:', err));
