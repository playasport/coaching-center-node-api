# PlayAsport Admin Panel Demo

This is a demo admin panel frontend that integrates with the PlayAsport Admin Panel APIs. It demonstrates the complete flow of an admin panel with role-based access control.

## Features

- **Admin Authentication**
  - Login with email and password
  - Token refresh functionality
  - Logout and logout from all devices

- **Dashboard**
  - Real-time statistics (users, coaching centers, bookings, batches)
  - Visual stat cards

- **Permission Management** (Super Admin only)
  - View all permissions
  - Create new permissions
  - Edit permissions
  - Delete permissions
  - Filter by role

- **User Management**
  - View all users with pagination
  - View user details
  - Edit users
  - User status indicators

- **Coaching Center Management**
  - View all coaching centers with pagination
  - View center details
  - Edit coaching centers

- **Profile Management**
  - View profile
  - Update profile information
  - Change password

## Setup Instructions

### 1. Start the Backend Server

Make sure your backend API server is running:

```bash
npm run dev
```

The server should be running on `http://localhost:3000`

### 2. Open the Admin Panel

Simply open `index.html` in your web browser. You can:

- **Option 1**: Double-click `index.html` to open in your default browser
- **Option 2**: Use a local server (recommended):
  ```bash
  # Using Python
  python -m http.server 8000
  
  # Using Node.js (http-server)
  npx http-server -p 8000
  
  # Then open: http://localhost:8000
  ```

### 3. Login

Use the Super Admin credentials created by the seed script:

- **Email**: `admin@playasport.in`
- **Password**: `Admin@123`

Or use any admin user with appropriate roles.

## File Structure

```
admin-panel-demo/
├── index.html      # Main HTML file with all UI components
├── styles.css      # All styling and responsive design
├── app.js          # JavaScript logic and API integration
└── README.md       # This file
```

## API Integration

The demo panel integrates with the following admin APIs:

### Authentication
- `POST /admin/auth/login` - Admin login
- `POST /admin/auth/refresh` - Refresh access token
- `GET /admin/auth/profile` - Get admin profile
- `PATCH /admin/auth/profile` - Update profile
- `PATCH /admin/auth/password` - Change password
- `POST /admin/auth/logout` - Logout
- `POST /admin/auth/logout-all` - Logout from all devices

### Dashboard
- `GET /admin/dashboard/stats` - Get dashboard statistics

### Permissions (Super Admin only)
- `GET /admin/permissions` - Get all permissions
- `GET /admin/permissions/sections` - Get available sections
- `GET /admin/permissions/actions` - Get available actions
- `GET /admin/permissions/role/:roleId` - Get permissions by role
- `POST /admin/permissions` - Create permission
- `PATCH /admin/permissions/:id` - Update permission
- `DELETE /admin/permissions/:id` - Delete permission

### Users
- `GET /admin/users` - Get all users (paginated)
- `GET /admin/users/:id` - Get user by ID
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user

### Coaching Centers
- `GET /admin/coaching-centers` - Get all coaching centers (paginated)
- `GET /admin/coaching-centers/:id` - Get coaching center by ID
- `PATCH /admin/coaching-centers/:id` - Update coaching center
- `DELETE /admin/coaching-centers/:id` - Delete coaching center

## Features Demonstrated

### 1. Role-Based Navigation
- Navigation items are shown/hidden based on user roles
- Super Admin sees all menu items
- Other roles see only permitted sections

### 2. Permission-Based Access
- Each page checks if user has required permissions
- Permission denied messages for unauthorized access
- Dynamic UI based on user permissions

### 3. Token Management
- Automatic token storage in localStorage
- Token refresh functionality
- Automatic logout on token expiration

### 4. Real-Time Data
- Dashboard shows live statistics
- Pagination for large datasets
- Loading states and error handling

### 5. User Experience
- Toast notifications for actions
- Loading overlays
- Error handling and user feedback
- Responsive design

## Customization

### Change API Base URL

Edit `app.js` and change the `API_BASE_URL` constant:

```javascript
const API_BASE_URL = 'http://your-api-url:3000/api/v1';
```

### Styling

All styles are in `styles.css`. You can customize:
- Colors (CSS variables in `:root`)
- Layout and spacing
- Component styles

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Notes

- This is a **demo/example** implementation
- For production, consider using a framework (React, Vue, Angular)
- Add proper error boundaries and retry logic
- Implement proper state management
- Add unit and integration tests
- Consider using TypeScript for type safety

## Troubleshooting

### CORS Errors
If you get CORS errors, make sure your backend has CORS enabled for your frontend origin.

### Token Expired
If tokens expire, the panel will automatically try to refresh. If refresh fails, you'll be logged out.

### API Connection Failed
- Check if backend server is running
- Verify API_BASE_URL is correct
- Check browser console for errors

## Next Steps

1. **Add More Features**:
   - Employee management
   - Batch management
   - Booking management
   - Reports and analytics

2. **Improve UX**:
   - Add search and filters
   - Add bulk operations
   - Add export functionality
   - Add data visualization charts

3. **Production Ready**:
   - Use a proper frontend framework
   - Add state management (Redux, Zustand, etc.)
   - Add routing (React Router, Vue Router, etc.)
   - Add form validation library
   - Add UI component library (Material-UI, Ant Design, etc.)
