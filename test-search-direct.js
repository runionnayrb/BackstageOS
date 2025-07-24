// Test search directly
const fetch = require('node-fetch');

async function testSearch() {
  try {
    const response = await fetch('http://localhost:5000/api/search/natural', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3As5nomXxaRqwRd6u_OIf3CNmxQqxw7u8J.%2BQyimdYN4YbW2L2d%2BH3lzKY5H5%2F5VD5oP8L8cg5M8Qg'
      },
      body: JSON.stringify({
        query: 'emails from bryan'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();