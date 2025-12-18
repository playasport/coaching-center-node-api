# Admin Panel Demo - Quick Start Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend Server
```bash
npm run dev
```
Server will start on `http://localhost:3000`

### Step 2: Create Super Admin (if not done)
```bash
npm run seed:roles
npm run seed:super-admin
```

### Step 3: Open Admin Panel

**Option A: Direct File Open**
- Navigate to `admin-panel-demo` folder
- Double-click `index.html`
- It will open in your default browser

**Option B: Via Backend Server (Recommended)**
- Open browser and go to: `http://localhost:3000/admin-panel-demo/`
- Or: `http://localhost:3000/admin-panel` (redirects to demo)

## 🔑 Login Credentials

- **Email**: `admin@playasport.in`
- **Password**: `Admin@123`

## 📋 What You Can Do

### 1. **Dashboard** 📊
- View real-time statistics
- See users, coaching centers, bookings, batches counts

### 2. **Permission Management** 🔐 (Super Admin Only)
- View all permissions
- Create new permissions for roles
- Edit/Delete permissions
- Filter by role

### 3. **User Management** 👥
- View all users with pagination
- See user roles and status
- Edit user information

### 4. **Coaching Center Management** 🏢
- View all coaching centers
- See center status
- Manage centers

### 5. **Profile** 👤
- View your profile
- Update profile information
- Change password

## 🎯 Features Demonstrated

✅ **Role-Based Access Control**
- Navigation items show/hide based on user role
- Permission checks before accessing pages
- Super Admin sees all features

✅ **Token Management**
- Automatic token storage
- Token refresh functionality
- Auto-refresh before expiration

✅ **Real-Time Data**
- Live dashboard statistics
- Paginated data tables
- Loading states

✅ **User Experience**
- Toast notifications
- Error handling
- Responsive design

## 🔧 Troubleshooting

### CORS Errors
The backend already has CORS enabled. If you still get errors:
- Make sure backend is running on port 3000
- Check browser console for specific errors

### API Connection Failed
- Verify backend is running: `http://localhost:3000/api/v1/health`
- Check `API_BASE_URL` in `app.js` matches your backend URL

### Token Issues
- Tokens are stored in localStorage
- Clear browser storage if tokens get corrupted
- Use "Refresh Token" button to manually refresh

## 📝 Notes

- This is a **demo/example** implementation
- All data is fetched from your backend APIs
- Changes made in the panel affect your actual database
- Use with caution in development environment

## 🎨 Customization

Edit `app.js` to change:
- API base URL
- Auto-refresh interval
- Default page

Edit `styles.css` to customize:
- Colors and themes
- Layout and spacing
- Component styles

## 📚 Next Steps

1. Test all features
2. Understand the API flow
3. Use as reference for your production frontend
4. Consider using a framework (React, Vue, Angular) for production

Enjoy exploring the admin panel! 🎉
