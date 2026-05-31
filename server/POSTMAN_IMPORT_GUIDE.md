# 📮 Postman Setup Guide

## 🚀 Quick Import (2 Minutes)

### Step 1: Import Collection
1. Open Postman
2. Click **Import** button (top left)
3. Drag and drop `Buizz_API.postman_collection.json`
4. Click **Import**

### Step 2: Import Environment
1. Click **Environments** (left sidebar)
2. Click **Import** button
3. Drag and drop `Buizz_Local.postman_environment.json`
4. Click **Import**

### Step 3: Select Environment
1. Click the environment dropdown (top right)
2. Select **Buizz Local Environment**

### Step 4: Start Testing! 🎉
You're ready to test all APIs!

---

## 📋 What's Included

### Collection: Buizz Event Management API
- ✅ 20+ API endpoints
- ✅ Auto-save tokens after login
- ✅ Pre-configured headers
- ✅ Sample request bodies
- ✅ Organized by modules

### Environment: Buizz Local Environment
- ✅ baseUrl: http://localhost:5000
- ✅ apiVersion: v1
- ✅ Auto-managed tokens
- ✅ Auto-saved IDs

---

## 🧪 Testing Workflow

### 1. Health Check
- Folder: Root
- Request: **Health Check**
- Verify server is running

### 2. Register User
- Folder: **Authentication**
- Request: **Register User**
- Creates account and auto-saves token

### 3. Login User
- Folder: **Authentication**
- Request: **Login User**
- Gets token and auto-saves it

### 4. Get Events
- Folder: **Events**
- Request: **Get All Events**
- View all events (no auth needed)

### 5. Create Event
- Folder: **Events**
- Request: **Create Event**
- ⚠️ Requires organizer role
- Auto-saves eventId

### 6. Update Event
- Folder: **Events**
- Request: **Update Event**
- Uses saved eventId

### 7. Publish Event
- Folder: **Events**
- Request: **Publish Event**
- Makes event public

---

## 🔐 Authentication

### Automatic Token Management
The collection automatically:
- ✅ Saves token after Register
- ✅ Saves token after Login
- ✅ Clears token after Logout
- ✅ Uses token in protected routes

### Manual Token Setup (if needed)
1. Login first
2. Copy token from response
3. Go to Environment
4. Paste in `token` variable

---

## 📝 Request Examples

### Public Endpoints (No Auth)
- Health Check
- Get All Events
- Get Event by ID
- Get Event by Slug

### Protected Endpoints (Requires Auth)
- Logout
- Create Event
- Update Event
- Delete Event
- Publish Event
- Get User Profile
- Get Tickets
- Create Payment

### Organizer Only Endpoints
- Create Event
- Update Event
- Delete Event
- Publish Event

---

## 🎯 Query Parameters

### Get All Events
Enable/disable query params as needed:
- `page`: 1
- `limit`: 10
- `status`: published
- `category`: music
- `search`: concert

To enable:
1. Click on request
2. Go to Params tab
3. Check the checkbox

---

## 🔄 Environment Variables

### Available Variables
```
{{baseUrl}}      - http://localhost:5000
{{apiVersion}}   - v1
{{token}}        - Auto-saved JWT token
{{refreshToken}} - Auto-saved refresh token
{{userId}}       - Auto-saved user ID
{{eventId}}      - Auto-saved event ID
```

### Usage in Requests
```
URL: {{baseUrl}}/api/{{apiVersion}}/events/{{eventId}}
Header: Authorization: Bearer {{token}}
```

---

## 🐛 Troubleshooting

### "Could not get response"
- ✅ Check server is running: `npm run dev`
- ✅ Check baseUrl in environment
- ✅ Check port 5000 is not blocked

### "401 Unauthorized"
- ✅ Login first to get token
- ✅ Check token is saved in environment
- ✅ Check Authorization header is set

### "403 Forbidden"
- ✅ Check user role (organizer needed for some routes)
- ✅ Check you own the resource you're modifying

### "404 Not Found"
- ✅ Check URL is correct
- ✅ Check resource ID exists
- ✅ Check API version is correct

### "422 Validation Error"
- ✅ Check request body format
- ✅ Check required fields are present
- ✅ Check data types are correct

---

## 💡 Pro Tips

### 1. Use Tests Tab
Auto-save responses to environment:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set('eventId', response.data._id);
}
```

### 2. Use Pre-request Scripts
Auto-refresh expired tokens:
```javascript
const token = pm.environment.get('token');
if (!token) {
    // Auto-login logic
}
```

### 3. Use Collection Variables
For data shared across all requests:
```javascript
pm.collectionVariables.set('apiKey', 'value');
```

### 4. Use Folders
Organize requests by feature:
- Authentication
- Events
- Tickets
- Payments

### 5. Use Examples
Save response examples for documentation:
- Right-click response
- Save as Example

---

## 📊 Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Check request body |
| 401 | Unauthorized | Login first |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check resource exists |
| 429 | Too Many Requests | Wait and retry |
| 500 | Server Error | Check server logs |

---

## 🎓 Learning Resources

### Postman Docs
- https://learning.postman.com/

### Collection Variables
- https://learning.postman.com/docs/sending-requests/variables/

### Tests & Scripts
- https://learning.postman.com/docs/writing-scripts/test-scripts/

---

## 📥 Files to Import

1. **Buizz_API.postman_collection.json** - API Collection
2. **Buizz_Local.postman_environment.json** - Environment

Both files are in the `server/` directory.

---

## ✅ Verification Checklist

After import, verify:
- [ ] Collection appears in Collections tab
- [ ] Environment appears in Environments tab
- [ ] Environment is selected (top right dropdown)
- [ ] baseUrl is set to http://localhost:5000
- [ ] Server is running on port 5000
- [ ] Health Check returns 200 OK

---

## 🚀 Ready to Test!

1. ✅ Import collection
2. ✅ Import environment
3. ✅ Select environment
4. ✅ Start server: `npm run dev`
5. ✅ Test Health Check
6. ✅ Register/Login
7. ✅ Test other endpoints

**Happy Testing! 🎉**

---

## 📞 Need Help?

- Check server logs: `logs/combined.log`
- Check Postman console: View → Show Postman Console
- Check request/response in Postman
- Refer to POSTMAN_COLLECTION.md for detailed docs

---

**All APIs ready for testing in Postman!** 🚀
