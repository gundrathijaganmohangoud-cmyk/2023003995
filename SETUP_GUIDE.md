

1. **Logging Middleware** (`logging_middleware/`)
- Simple logger: `Log(stack, level, package, message)`
- Logs to console with timestamp
- Usage: `Log('backend', 'info', 'controller', 'message')`
2. **Backend** (`notification_app_be/`)
- Express.js server on port 3000
- 3 main endpoints:
  - `POST /api/register` - Register with evaluation service
  - `POST /api/authenticate` - Get access token
  - `POST /api/logs` - Send logs (requires token)
  - `GET /api/notifications` - Fetch notifications

 3. **Frontend** (`notification_app_fe/`)
- Basic React app
- Buttons for register, authenticate, fetch notifications

---
Quick Start (30 mins):

### Step 1: Install & Run Backend
```bash
cd notification_app_be
npm install
npm start
```

2: Test with Postman/Insomnia
1. **Register**:
   - POST: `http://localhost:3000/api/register`
   - Body: 
     ```json
     {
       "email": "jgundrat@gitam.in",
       "name": "JAGAN MOHAN GOUD",
       "mobileNo": "9876543210",
       "githubUsername": "your_github",
       "rollNo": "2023003995",
       "accessCode": "wgKtgZ"
     }
     ```

2. **Authenticate**:
   - POST: `http://localhost:3000/api/authenticate`
   - Response: Get `access_token`

3. **Send Log**:
   - POST: `http://localhost:3000/api/logs`
   - Headers: `Authorization: Bearer <token>`
   - Body:
     ```json
     {
       "stack": "backend",
       "level": "info",
       "package": "controller",
       "message": "Test log"
     }
     ```

### Step 3: Push to GitHub
```bash
git add .
git commit -m "Stage 1 - Basic setup"
git push
```

---

## What to do next (Stages 2-7):

- **Stage 2**: Add database (SQL schema)
- **Stage 3**: Query optimization
- **Stage 4**: Performance improvements
- **Stage 5**: Notification sending system
- **Stage 6**: Priority inbox
- **Stage 7**: Complete React frontend

---
