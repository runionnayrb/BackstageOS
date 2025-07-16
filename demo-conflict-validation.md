# 🎭 Conflict Validation System Live Demo

## System Overview
The conflict validation system prevents scheduling conflicts for both team members and locations in BackstageOS. Here's how it works:

## 🚀 Live Demo Scenarios

### Scenario 1: Participant Availability Conflict
**Setup**: Sarah is marked as unavailable from 2:00 PM - 4:00 PM on July 17th for a costume fitting.

**Test**: Try to schedule Sarah for a blocking rehearsal from 3:00 PM - 5:00 PM.

**Expected Result**: ❌ BLOCKED
```json
{
  "status": 409,
  "message": "Cannot create event due to scheduling conflicts",
  "conflicts": [
    {
      "contactId": 5,
      "contactName": "Sarah Johnson",
      "conflictType": "unavailable",
      "conflictTime": "2:00 PM - 4:00 PM",
      "conflictDetails": "Sarah Johnson is unavailable from 2:00 PM to 4:00 PM (Costume fitting)"
    }
  ]
}
```

### Scenario 2: Schedule Overlap Conflict
**Setup**: Tom is already scheduled for a "Music Rehearsal" from 10:00 AM - 12:00 PM on July 18th.

**Test**: Try to schedule Tom for a "Scene Work" session from 11:00 AM - 1:00 PM.

**Expected Result**: ❌ BLOCKED
```json
{
  "status": 409,
  "message": "Cannot create event due to scheduling conflicts",
  "conflicts": [
    {
      "contactId": 7,
      "contactName": "Tom Wilson",
      "conflictType": "schedule_overlap",
      "conflictTime": "10:00 AM - 12:00 PM",
      "conflictDetails": "Tom Wilson is already scheduled for 'Music Rehearsal' from 10:00 AM to 12:00 PM"
    }
  ]
}
```

### Scenario 3: Location Availability Conflict
**Setup**: Studio A is marked as unavailable from 9:00 AM - 11:00 AM on July 19th for floor maintenance.

**Test**: Try to schedule an event in Studio A from 10:00 AM - 12:00 PM.

**Expected Result**: ❌ BLOCKED
```json
{
  "status": 409,
  "message": "Cannot create event due to scheduling conflicts",
  "conflicts": [
    {
      "locationName": "Studio A",
      "conflictType": "location_unavailable",
      "conflictTime": "9:00 AM - 11:00 AM",
      "conflictDetails": "Studio A is unavailable from 9:00 AM to 11:00 AM (Floor maintenance)"
    }
  ]
}
```

### Scenario 4: Multiple Conflicts
**Setup**: 
- Emily is unavailable 1:00 PM - 3:00 PM
- Studio B is unavailable 1:30 PM - 4:00 PM  
- Jake is already scheduled 2:00 PM - 4:00 PM

**Test**: Try to schedule Emily and Jake in Studio B from 2:00 PM - 5:00 PM.

**Expected Result**: ❌ BLOCKED (Multiple conflicts detected)
```json
{
  "status": 409,
  "message": "Cannot create event due to scheduling conflicts",
  "conflicts": [
    {
      "contactId": 12,
      "contactName": "Emily Chen",
      "conflictType": "unavailable",
      "conflictTime": "1:00 PM - 3:00 PM",
      "conflictDetails": "Emily Chen is unavailable from 1:00 PM to 3:00 PM (Doctor appointment)"
    },
    {
      "contactId": 15,
      "contactName": "Jake Rodriguez",
      "conflictType": "schedule_overlap",
      "conflictTime": "2:00 PM - 4:00 PM",
      "conflictDetails": "Jake Rodriguez is already scheduled for 'Voice Lesson' from 2:00 PM to 4:00 PM"
    },
    {
      "locationName": "Studio B",
      "conflictType": "location_unavailable",
      "conflictTime": "1:30 PM - 4:00 PM",
      "conflictDetails": "Studio B is unavailable from 1:30 PM to 4:00 PM (Equipment installation)"
    }
  ]
}
```

### Scenario 5: Successful Event Creation
**Setup**: All participants are available and location is free.

**Test**: Schedule a "Table Read" in Conference Room from 7:00 PM - 9:00 PM with available cast members.

**Expected Result**: ✅ SUCCESS
```json
{
  "status": 201,
  "data": {
    "id": 47,
    "title": "Table Read",
    "description": "Full cast table read",
    "date": "2025-07-20",
    "startTime": "19:00",
    "endTime": "21:00",
    "location": "Conference Room",
    "participants": [
      {
        "id": 5,
        "name": "Sarah Johnson",
        "category": "cast"
      },
      {
        "id": 7,
        "name": "Tom Wilson",
        "category": "cast"
      }
    ]
  }
}
```

## 🔧 Technical Implementation

### Key Files
- **ConflictValidationService**: `server/services/conflictValidationService.ts`
- **API Routes**: `server/routes.ts` (POST/PATCH schedule-events endpoints)
- **Database Methods**: `server/storage.ts` (availability queries)

### Validation Process
1. **Participant Availability Check**: Query contact_availability table for unavailable time blocks
2. **Schedule Overlap Check**: Query schedule_events table for existing participant assignments
3. **Location Availability Check**: Query location_availability table for unavailable locations
4. **Time Overlap Logic**: Check if requested time overlaps with any conflicts
5. **Response Generation**: Return detailed conflict information with HTTP 409 status

### Database Queries
The system uses optimized queries to check conflicts:
```sql
-- Check contact availability conflicts
SELECT * FROM contact_availability 
WHERE contact_id = ? AND date = ? AND availability_type = 'unavailable'
AND (start_time <= ? AND end_time >= ?)

-- Check schedule overlap conflicts  
SELECT * FROM schedule_events se
JOIN schedule_event_participants sep ON se.id = sep.event_id
WHERE sep.contact_id = ? AND se.date = ?
AND (se.start_time < ? AND se.end_time > ?)

-- Check location availability conflicts
SELECT * FROM location_availability la
JOIN event_locations el ON la.location_id = el.id
WHERE el.name = ? AND la.date = ? AND la.availability_type = 'unavailable'
AND (la.start_time <= ? AND la.end_time >= ?)
```

## 🎯 User Experience

### Theater Professional Benefits
1. **Prevents Double-Booking**: No more scheduling conflicts that cause production delays
2. **Respects Availability**: Honors when team members mark themselves unavailable
3. **Location Management**: Prevents scheduling in unavailable venues/spaces
4. **Clear Error Messages**: Detailed explanations of why events can't be scheduled
5. **Proactive Prevention**: Catches conflicts before they become problems

### Stage Manager Workflow
1. Set up team member availability (doctor appointments, other commitments)
2. Mark location unavailability (maintenance, repairs, other events)
3. Schedule events with confidence - system prevents conflicts automatically
4. Receive clear feedback when conflicts occur with suggestions for resolution

The system ensures smooth production workflows by preventing scheduling conflicts before they impact rehearsals, performances, or production meetings.