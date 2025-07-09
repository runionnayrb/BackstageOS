async function testEmailSystem() {
  console.log('Testing email system webhook...');
  
  // Test the processIncomingEmail functionality
  const testEmailData = {
    to: 'bryan@backstageos.com',
    from: 'test@example.com',
    subject: 'Test Email for BackstageOS',
    content: 'This is a test email to verify the webhook system is working.',
    headers: {
      'message-id': 'test-' + Date.now() + '@example.com'
    },
    date: new Date().toISOString()
  };
  
  try {
    // Test if webhook endpoint is reachable
    const response = await fetch('http://localhost:5000/api/email/receive-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailData)
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is working!');
      const result = await response.json();
      console.log('Response:', result);
    } else {
      console.error('❌ Webhook endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

testEmailSystem();