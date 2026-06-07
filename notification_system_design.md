# notification_system_design.md

---

## Stage 1

I was asked by a frontend developer colleague to design the REST API for a campus notification system. Below are the endpoints I came up with, along with request/response structures.

### What the system needs to do

Students should be able to:
- View all their notifications
- Filter by type (Placement, Event, Result)
- Mark notifications as read
- Get real-time updates

---

### API Endpoints

#### GET /api/notifications
Fetch all notifications for the logged-in student.

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Placement",
      "message": "Google is hiring, apply now",
      "timestamp": "2026-04-22T17:51:30",
      "isRead": false
    }
  ]
}
```

---

#### GET /api/notifications?limit=10&page=1&notification_type=Placement
Fetch filtered and paginated notifications.

Query params:
- limit — how many to show per page
- page — which page
- notification_type — Event, Result or Placement

Response: same structure as above but paginated.

---

#### PATCH /api/notifications/:id/read
Mark a single notification as read.

Response:
```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "isRead": true,
  "message": "marked as read"
}
```

---

#### PATCH /api/notifications/read-all
Mark all notifications as read.

Response:
```json
{
  "message": "all notifications marked as read"
}
```

---

#### POST /api/notifications
Send a notification (used by admin/HR side).

Request body:
```json
{
  "type": "Placement",
  "message": "Microsoft hiring drive on Friday",
  "recipients": "all"
}
```

Response:
```json
{
  "id": "abc12345-xyz",
  "status": "sent"
}
```

---

### Notification object structure

```json
{
  "id": "uuid",
  "type": "Event | Result | Placement",
  "message": "string",
  "timestamp": "ISO date string",
  "isRead": true or false
}
```

### For real-time updates I chose SSE (Server-Sent Events)
Because notifications only go from server to student (one direction), SSE is simpler than WebSockets and works fine for this use case.

---

## Stage 2

### Which database I chose and why

I would go with PostgreSQL because the data here is clearly relational — students, notifications, and who read what. A relational DB fits this naturally. MongoDB would work too but there's no real benefit here since our schema is fixed.

### DB Schema

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  roll_no VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) CHECK (type IN ('Event', 'Result', 'Placement')) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Problems as data grows

- With 50,000 students and millions of notifications, queries without indexes will do full table scans which is very slow
- Inserting one notification for all students at once means 50,000 rows inserted — this will be slow without batching
- Fetching all notifications without pagination will crash the server

### What I would do

Add indexes on the columns we query most:

```sql
CREATE INDEX idx_sn_student_read ON student_notifications(student_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

---

## Stage 3

### Is the original query accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

The logic is correct but the query is slow because:
- SELECT * fetches everything including columns we don't need
- No index on studentID + isRead so it scans the whole table
- No LIMIT so it returns everything at once

### My optimized version

```sql
SELECT id, type, message, created_at
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = 1042
  AND sn.is_read = false
ORDER BY n.created_at ASC
LIMIT 20 OFFSET 0;
```

### Should we add indexes on every column?

No. Adding indexes on every column is a bad idea because every INSERT and UPDATE also has to update all those indexes, which slows down writes a lot. We should only index the columns we actually filter or sort by.

### Query to find students who got placement notifications in last 7 days

```sql
SELECT DISTINCT s.id, s.name, s.email
FROM students s
JOIN student_notifications sn ON s.id = sn.student_id
JOIN notifications n ON sn.notification_id = n.id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### Problem

The DB is being hit on every single page load for every student. With 50,000 students this will kill the database.

### My solution

The best fix is to use Redis caching. When a student loads the page, first check Redis. If their notifications are already cached, serve from there. If not, query the DB and store the result in Redis for 60 seconds.

This means the DB is only hit once every 60 seconds per student instead of on every click.

Other things I would also do:
- Add pagination so we never fetch all notifications at once, just 10-20 per page
- Use connection pooling (pg-pool) so we reuse DB connections instead of creating new ones every request

The tradeoff with caching is that notifications can be up to 60 seconds stale, but for a campus notification system that is totally acceptable.

---

## Stage 5

### Problems with the original notify_all

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

Problems I see:
- It loops through 50,000 students one by one — this will take forever
- If send_email fails at student 200, everything after that is skipped
- Email and DB save happen together, so if DB fails the email was already sent but not recorded
- The server is completely blocked while this runs

### My redesign

```javascript
async function notify_all(student_ids, message) {
  // save notification once, not 50000 times
  const notification_id = await save_notification_to_db(message);

  // bulk insert all student records at once
  await bulk_insert_student_notifications(student_ids, notification_id);

  // push each email job to a queue instead of sending directly
  for (const student_id of student_ids) {
    await queue.add('send_email_job', { student_id, message });
  }
}

// separate worker picks up jobs and handles retries
worker.process('send_email_job', async (job) => {
  const { student_id, message } = job.data;
  await send_email(student_id, message);
  await push_to_app(student_id, message);
});
```

The DB save and email sending should not happen together because they are separate concerns. The function returns immediately after queuing and workers handle the actual sending. If one email fails, it retries automatically without affecting others.

---

## Stage 6

### Priority Inbox

Priority is based on type and recency:
- Placement gets highest weight (3)
- Result gets medium weight (2)  
- Event gets lowest weight (1)

Newer notifications also get a higher score than older ones.

```javascript
function calculatePriority(notification) {
  const typeWeights = { Placement: 3, Result: 2, Event: 1 };
  const weight = typeWeights[notification.type] || 1;

  const ageInHours = (Date.now() - new Date(notification.timestamp).getTime()) / 3600000;
  const recency = Math.max(0, 10 - ageInHours);

  return (weight * 0.5) + (recency * 0.3);
}

function getTopNotifications(notifications, n = 10) {
  return notifications
    .map(n => ({ ...n, priority: calculatePriority(n) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, n);
}
```

When new notifications arrive via SSE, I just re-run getTopNotifications on the updated list and React re-renders the top 10 automatically. No extra DB query needed.
