/**
 * Test Conflict Validation System
 * This script tests the conflict validation functionality
 */

async function testConflictValidation() {
  console.log("🧪 Testing Conflict Validation System");
  
  // Test 1: Check if we can create an event without conflicts
  console.log("\n1. Testing event creation without conflicts...");
  
  const testEventData = {
    title: "Test Event",
    description: "Testing conflict validation",
    date: "2025-07-17", // Tomorrow
    startTime: "10:00",
    endTime: "12:00",
    type: "rehearsal",
    location: "Studio A",
    participants: [5] // Assuming contact ID 5 exists
  };
  
  try {
    const response = await fetch('/api/projects/3/schedule-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEventData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Event created successfully:", result.title);
    } else {
      console.log("❌ Event creation failed:", result.message);
      if (result.conflicts) {
        console.log("Conflicts found:", result.conflicts);
      }
    }
  } catch (error) {
    console.log("❌ Error testing event creation:", error.message);
  }
  
  // Test 2: Check availability validation
  console.log("\n2. Testing availability conflict detection...");
  
  const conflictEventData = {
    title: "Conflicting Event",
    description: "This should conflict with existing availability",
    date: "2025-07-17", // Same day
    startTime: "11:00", // Overlapping time
    endTime: "13:00",
    type: "rehearsal",
    location: "Studio B",
    participants: [5] // Same participant
  };
  
  try {
    const response = await fetch('/api/projects/3/schedule-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conflictEventData)
    });
    
    const result = await response.json();
    
    if (response.status === 409) {
      console.log("✅ Conflict detected correctly:", result.message);
      console.log("Conflict details:", result.conflicts);
    } else if (response.ok) {
      console.log("⚠️  Event created but should have been blocked by conflict");
    } else {
      console.log("❌ Unexpected error:", result.message);
    }
  } catch (error) {
    console.log("❌ Error testing conflict detection:", error.message);
  }
  
  console.log("\n✅ Conflict validation testing complete");
}

// Run the test
testConflictValidation().catch(console.error);