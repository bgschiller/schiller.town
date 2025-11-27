# Authentication Setup

Your household notes app now has password protection! Here's what's been added and how to configure it.

## What's New

1. **Login Page** (`/login`) - Users enter their name and a shared family password
2. **Protected Routes** - The main notes page is now only accessible after logging in
3. **User Display** - Shows who's logged in and who's currently editing
4. **Logout** - Users can log out from the main page

## Setup Instructions

### 1. Create Environment Variables

Create a `.env` file in the root of your project with these variables:

```bash
# Session secret - use a long random string for security
SESSION_SECRET=change-this-to-a-long-random-string

# The shared password for your household
HOUSEHOLD_PASSWORD=your-family-password-here
```

**Important:**
- Don't commit the `.env` file to git (it should already be in `.gitignore`)
- Use a strong, random string for `SESSION_SECRET` (at least 32 characters)
- Share `HOUSEHOLD_PASSWORD` verbally with your household members

### 2. Generate a Secure Session Secret

You can generate a secure random string using:

```bash
# On macOS/Linux:
openssl rand -base64 32

# Or using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Restart Your Development Server

After creating the `.env` file, restart your dev server:

```bash
npm run dev
```

## How It Works

### For Users
1. Visit your app's URL
2. Enter your name (e.g., "Alice", "Bob")
3. Enter the shared family password
4. Start taking notes!

### Features
- **Name Display**: Your name appears in the top-left corner
- **Active Users**: The top-right shows how many people are currently online with flag emojis
- **Session Persistence**: You stay logged in for 30 days (or until you log out)
- **Logout**: Click the "Logout" button in the top-left to sign out

### For Deployment

When deploying to production (e.g., PartyKit):

1. Set environment variables in your hosting platform:
   - `SESSION_SECRET` - Generate a new secure random string
   - `HOUSEHOLD_PASSWORD` - Your shared family password

2. Deploy as usual:
   ```bash
   npm run deploy
   ```

## Security Notes

- This uses a **shared password** approach - perfect for household use
- Everyone in your household needs to know the same password
- Each person enters their own name when logging in
- Sessions are stored in encrypted cookies
- If you need to change the password, update `HOUSEHOLD_PASSWORD` and restart the server
- To revoke someone's access, change the password (they'll be logged out on their next request)

## Files Changed

- `app/utils/session.server.ts` - Session management utilities
- `app/routes/login.tsx` - Login page
- `app/routes/logout.tsx` - Logout handler
- `app/routes/_index.tsx` - Protected main route with user info
- `app/components/whos-here.tsx` - Shows active users with names
- `party/geo.ts` - Tracks user names for presence
- `messages.d.ts` - Updated types to include user names

