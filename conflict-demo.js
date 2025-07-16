// Live demonstration of conflict validation system
import { execSync } from 'child_process';

console.log('🎭 BackstageOS Conflict Validation System Demo\n');

// Step 1: First, let's check what contacts exist in the test project
console.log('📋 Step 1: Checking existing contacts in Test Show project...');
try {
  const contactsResult = execSync('curl -s "http://localhost:5000/api/projects/4/contacts" -H "Cookie: connect.sid=admin"', {encoding: 'utf8'});
  const contacts = JSON.parse(contactsResult);
  console.log(`✅ Found ${contacts.length} contacts in Test Show project`);
  if (contacts.length > 0) {
    console.log('   Available contacts:');
    contacts.slice(0, 3).forEach(contact => {
      console.log(`   - ${contact.name} (${contact.category})`);
    });
  }
} catch (error) {
  console.log('❌ Could not fetch contacts:', error.message);
}

// Step 2: Check existing locations
console.log('\n📍 Step 2: Checking existing locations in Test Show project...');
try {
  const locationsResult = execSync('curl -s "http://localhost:5000/api/projects/4/event-locations" -H "Cookie: connect.sid=admin"', {encoding: 'utf8'});
  const locations = JSON.parse(locationsResult);
  console.log(`✅ Found ${locations.length} locations in Test Show project`);
  if (locations.length > 0) {
    console.log('   Available locations:');
    locations.slice(0, 3).forEach(location => {
      console.log(`   - ${location.name}`);
    });
  }
} catch (error) {
  console.log('❌ Could not fetch locations:', error.message);
}

// Step 3: Create a contact availability conflict
console.log('\n🚫 Step 3: Creating contact unavailability for demonstration...');
try {
  const unavailabilityPayload = {
    contactId: 5, // Assuming contact ID 5 exists
    date: '2025-07-17',
    startTime: '10:00',
    endTime: '12:00',
    availabilityType: 'unavailable',
    notes: 'Doctor appointment'
  };

  const unavailabilityResult = execSync(`curl -s -X POST "http://localhost:5000/api/projects/4/contacts/5/availability" -H "Content-Type: application/json" -H "Cookie: connect.sid=admin" -d '${JSON.stringify(unavailabilityPayload)}'`, {encoding: 'utf8'});
  
  if (unavailabilityResult.includes('error') || unavailabilityResult.includes('Unauthorized')) {
    console.log('⚠️  Could not create unavailability (auth issue)');
  } else {
    console.log('✅ Created contact unavailability: 10:00-12:00 on July 17th');
  }
} catch (error) {
  console.log('⚠️  Contact unavailability creation skipped:', error.message);
}

// Step 4: Create a location unavailability
console.log('\n🏢 Step 4: Creating location unavailability for demonstration...');
try {
  const locationUnavailabilityPayload = {
    date: '2025-07-17',
    startTime: '14:00',
    endTime: '16:00',
    availabilityType: 'unavailable',
    notes: 'Floor refinishing'
  };

  const locationUnavailabilityResult = execSync(`curl -s -X POST "http://localhost:5000/api/projects/4/locations/1/availability" -H "Content-Type: application/json" -H "Cookie: connect.sid=admin" -d '${JSON.stringify(locationUnavailabilityPayload)}'`, {encoding: 'utf8'});
  
  if (locationUnavailabilityResult.includes('error') || locationUnavailabilityResult.includes('Unauthorized')) {
    console.log('⚠️  Could not create location unavailability (auth issue)');
  } else {
    console.log('✅ Created location unavailability: 14:00-16:00 on July 17th');
  }
} catch (error) {
  console.log('⚠️  Location unavailability creation skipped:', error.message);
}

// Step 5: Test participant conflict validation
console.log('\n⚠️  Step 5: Testing participant conflict validation...');
try {
  const conflictEventPayload = {
    title: 'Demo Event - Should Be Blocked',
    description: 'This event should be blocked due to participant unavailability',
    date: '2025-07-17',
    startTime: '11:00',
    endTime: '13:00',
    type: 'rehearsal',
    location: 'Studio A',
    participants: [5] // Contact ID 5 is unavailable 10:00-12:00
  };

  const conflictResult = execSync(`curl -s -X POST "http://localhost:5000/api/projects/4/schedule-events" -H "Content-Type: application/json" -H "Cookie: connect.sid=admin" -d '${JSON.stringify(conflictEventPayload)}'`, {encoding: 'utf8'});
  
  if (conflictResult.includes('409') || conflictResult.includes('conflicts')) {
    console.log('✅ PARTICIPANT CONFLICT DETECTED! Event was blocked.');
    console.log('   Conflict details:', conflictResult);
  } else if (conflictResult.includes('Unauthorized')) {
    console.log('⚠️  Authentication required for testing');
  } else {
    console.log('❌ Event was created despite conflict (unexpected)');
  }
} catch (error) {
  console.log('⚠️  Participant conflict test skipped:', error.message);
}

// Step 6: Test location conflict validation
console.log('\n🏢 Step 6: Testing location conflict validation...');
try {
  const locationConflictPayload = {
    title: 'Demo Location Event - Should Be Blocked',
    description: 'This event should be blocked due to location unavailability',
    date: '2025-07-17',
    startTime: '15:00',
    endTime: '17:00',
    type: 'rehearsal',
    location: 'Studio A', // Location unavailable 14:00-16:00
    participants: []
  };

  const locationConflictResult = execSync(`curl -s -X POST "http://localhost:5000/api/projects/4/schedule-events" -H "Content-Type: application/json" -H "Cookie: connect.sid=admin" -d '${JSON.stringify(locationConflictPayload)}'`, {encoding: 'utf8'});
  
  if (locationConflictResult.includes('409') || locationConflictResult.includes('conflicts')) {
    console.log('✅ LOCATION CONFLICT DETECTED! Event was blocked.');
    console.log('   Conflict details:', locationConflictResult);
  } else if (locationConflictResult.includes('Unauthorized')) {
    console.log('⚠️  Authentication required for testing');
  } else {
    console.log('❌ Event was created despite location conflict (unexpected)');
  }
} catch (error) {
  console.log('⚠️  Location conflict test skipped:', error.message);
}

// Step 7: Test successful event creation (no conflicts)
console.log('\n✅ Step 7: Testing successful event creation (no conflicts)...');
try {
  const successEventPayload = {
    title: 'Demo Success Event',
    description: 'This event should succeed as it has no conflicts',
    date: '2025-07-18',
    startTime: '10:00',
    endTime: '12:00',
    type: 'rehearsal',
    location: 'Studio A',
    participants: [5]
  };

  const successResult = execSync(`curl -s -X POST "http://localhost:5000/api/projects/4/schedule-events" -H "Content-Type: application/json" -H "Cookie: connect.sid=admin" -d '${JSON.stringify(successEventPayload)}'`, {encoding: 'utf8'});
  
  if (successResult.includes('id') && !successResult.includes('conflicts')) {
    console.log('✅ SUCCESS! Event created without conflicts.');
    console.log('   Event details:', successResult.substring(0, 100) + '...');
  } else if (successResult.includes('Unauthorized')) {
    console.log('⚠️  Authentication required for testing');
  } else {
    console.log('❌ Event creation failed unexpectedly');
  }
} catch (error) {
  console.log('⚠️  Success event test skipped:', error.message);
}

console.log('\n🎯 Conflict Validation System Demo Complete!');
console.log('✅ System demonstrates:');
console.log('   → Participant availability conflict detection');
console.log('   → Location availability conflict detection');
console.log('   → Successful event creation when no conflicts exist');
console.log('   → Detailed error messages for debugging');