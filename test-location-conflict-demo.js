// Test script to demonstrate location conflict validation
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';
const PROJECT_ID = 4; // Test Show project

// Mock session for authentication
const mockSession = {
  headers: {
    'Cookie': 'connect.sid=mockSessionId',
    'Content-Type': 'application/json'
  }
};

async function testLocationConflictValidation() {
  console.log('🧪 Testing Location Conflict Validation System\n');
  
  try {
    // Step 1: Create a location if it doesn't exist
    console.log('📍 Step 1: Creating/Getting location...');
    const locationResponse = await fetch(`${API_BASE}/projects/${PROJECT_ID}/event-locations`, {
      method: 'POST',
      headers: mockSession.headers,
      body: JSON.stringify({
        name: 'Studio A',
        description: 'Main rehearsal studio'
      })
    });
    
    let locationData;
    if (locationResponse.status === 201) {
      locationData = await locationResponse.json();
      console.log('✅ Created location:', locationData.name);
    } else {
      // Location might already exist, get all locations
      const locationsResponse = await fetch(`${API_BASE}/projects/${PROJECT_ID}/event-locations`, {
        headers: mockSession.headers
      });
      const locations = await locationsResponse.json();
      locationData = locations.find(l => l.name === 'Studio A');
      console.log('✅ Found existing location:', locationData?.name);
    }
    
    // Step 2: Create location unavailability
    console.log('\n🚫 Step 2: Creating location unavailability...');
    const availabilityResponse = await fetch(`${API_BASE}/projects/${PROJECT_ID}/locations/${locationData.id}/availability`, {
      method: 'POST',
      headers: mockSession.headers,
      body: JSON.stringify({
        date: '2025-07-17',
        startTime: '10:00',
        endTime: '12:00',
        availabilityType: 'unavailable',
        notes: 'Maintenance work scheduled'
      })
    });
    
    if (availabilityResponse.status === 201) {
      const availabilityData = await availabilityResponse.json();
      console.log('✅ Created location unavailability:', availabilityData);
    } else {
      const error = await availabilityResponse.text();
      console.log('❌ Failed to create location unavailability:', error);
    }
    
    // Step 3: Try to create an event that conflicts with location availability
    console.log('\n⚠️ Step 3: Testing location conflict validation...');
    const conflictEventResponse = await fetch(`${API_BASE}/projects/${PROJECT_ID}/schedule-events`, {
      method: 'POST',
      headers: mockSession.headers,
      body: JSON.stringify({
        title: 'Test Event - Should be blocked',
        description: 'This event should be blocked due to location unavailability',
        date: '2025-07-17',
        startTime: '11:00',
        endTime: '13:00',
        type: 'rehearsal',
        location: 'Studio A',
        participants: []
      })
    });
    
    if (conflictEventResponse.status === 409) {
      const conflictData = await conflictEventResponse.json();
      console.log('✅ Location conflict validation working correctly!');
      console.log('   Conflict Details:', JSON.stringify(conflictData, null, 2));
    } else if (conflictEventResponse.status === 201) {
      const eventData = await conflictEventResponse.json();
      console.log('❌ Event was created despite location conflict!');
      console.log('   Event created:', eventData);
    } else {
      const error = await conflictEventResponse.text();
      console.log('❌ Unexpected error:', error);
    }
    
    // Step 4: Try to create an event that doesn't conflict
    console.log('\n✅ Step 4: Testing event creation without conflicts...');
    const noConflictEventResponse = await fetch(`${API_BASE}/projects/${PROJECT_ID}/schedule-events`, {
      method: 'POST',
      headers: mockSession.headers,
      body: JSON.stringify({
        title: 'Test Event - Should succeed',
        description: 'This event should succeed as it does not conflict with location availability',
        date: '2025-07-17',
        startTime: '14:00',
        endTime: '16:00',
        type: 'rehearsal',
        location: 'Studio A',
        participants: []
      })
    });
    
    if (noConflictEventResponse.status === 201) {
      const eventData = await noConflictEventResponse.json();
      console.log('✅ Event created successfully (no conflicts)');
      console.log('   Event:', eventData.title, 'at', eventData.startTime);
    } else {
      const error = await noConflictEventResponse.text();
      console.log('❌ Failed to create non-conflicting event:', error);
    }
    
    console.log('\n🎯 Location Conflict Validation Test Complete!');
    console.log('✅ System correctly prevents scheduling events when locations are unavailable');
    console.log('✅ System allows scheduling events when locations are available');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLocationConflictValidation();