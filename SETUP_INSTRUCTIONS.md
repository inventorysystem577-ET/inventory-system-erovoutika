# Inventory System - Setup Instructions

## New Features Implemented

### 1. Multiple Product Input Functionality
- Added `handleAddMultipleProductsIn` function in `app/controller/productController.js`
- Created `MultipleProductInput` component for bulk product entry
- Prevents duplication by allowing multiple products to be added in a single process
- Each product can have custom components and specifications

### 2. Account Approval System
- **Replaced direct registration with access request system**
- Users must request access and wait for admin approval
- Modified login to check approval status
- Created admin panel for managing access requests

### 3. Database Changes
- New `user_profiles` table to manage access requests
- Row Level Security (RLS) policies for secure access
- Automatic profile creation on user signup

## Setup Steps

### 1. Database Migration
Run the SQL migration in your Supabase database:

```sql
-- Execute the contents of: database/migrations/001_create_user_profiles.sql
```

### 2. Update Environment Variables
Ensure your `.env` file includes:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

## New Routes and Pages

### Access Request System
- **New**: `/view/request-access` - Users request access here
- **Removed**: `/view/register` - Direct registration disabled
- **New**: `/view/admin-panel/access-requests` - Admin approval panel

### API Endpoints
- **New**: `POST /api/auth/request-access` - Submit access request
- **New**: `GET /api/auth/request-access` - List access requests (admin only)
- **New**: `POST /api/auth/approve-access` - Approve/reject requests (admin only)

## User Flow Changes

### For New Users
1. Go to login page
2. Click "Request Access" instead of "Register"
3. Fill out access request form with reason
4. Wait for admin approval
5. Receive email when approved
6. Login with approved credentials

### For Admins
1. Login as admin user
2. Navigate to Admin Panel → Access Requests
3. Review pending requests
4. Approve or reject with one click
5. System automatically notifies users

## Multiple Product Input Usage

### Single Product Mode (Existing)
- Use the existing single product form
- Works exactly as before

### Multiple Product Mode (New)
- Toggle to "Multiple Product Input" tab
- Add multiple products in one submission
- Each product can have:
  - Name, quantity, price, description
  - Custom components with quantities
- Prevents duplicate entries for similar products

## Security Features

### Row Level Security
- Users can only view their own profiles
- Admins can view and manage all profiles
- Service role can create profiles during signup

### Approval Workflow
- All new accounts start as unapproved
- Login blocked for unapproved accounts
- Admin approval required for system access
- Audit trail of who approved/rejected requests

## Files Modified/Created

### New Files
- `app/view/request-access/page.jsx` - Access request form
- `app/view/admin-panel/access-requests/page.jsx` - Admin approval panel
- `app/api/auth/request-access/route.js` - Access request API
- `app/api/auth/approve-access/route.js` - Approval API
- `app/controller/accessRequestController.js` - Request controller
- `app/components/MultipleProductInput.jsx` - Bulk product input component
- `database/migrations/001_create_user_profiles.sql` - Database schema

### Modified Files
- `app/models/authModel.js` - Added approval logic
- `app/controller/productController.js` - Added multiple product function
- `app/components/LoginForm.jsx` - Updated link to access request
- `app/api/auth/register/route.js` - Modified for approval workflow

## Testing

### Test Access Request Flow
1. Try to register new account - should redirect to access request
2. Submit access request with reason
3. Login as admin and approve request
4. Login as new user - should work now

### Test Multiple Product Input
1. Go to Product In page
2. Add multiple products with different components
3. Submit and verify all products are added correctly
4. Check for duplicate prevention

## Troubleshooting

### Common Issues
1. **Login fails with "pending approval"**: User needs admin approval
2. **Access request not working**: Check database migration was applied
3. **Admin panel not accessible**: Ensure user has admin role in metadata

### Database Issues
- Run migration if getting table not found errors
- Check RLS policies are correctly applied
- Verify auth.users table has proper metadata

### Permission Issues
- Ensure service role has proper permissions
- Check that RLS policies allow admin access
- Verify user metadata contains correct role information
