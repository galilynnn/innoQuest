const gameId = '00000000-0000-0000-0000-000000000001';

fetch('http://localhost:3000/api/advance-week', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gameId })
})
.then(res => res.json())
.then(data => console.log('Advance result:', data))
.catch(err => console.error('Error advancing week:', err));

// Run with: node test-advance-week.js