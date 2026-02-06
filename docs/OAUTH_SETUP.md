# OAuth Setup Guide for NexFlow

This guide explains how to set up OAuth credentials for Facebook and LinkedIn integration.

---

## 📘 Facebook Setup (Graph API)

### Step 1: Create a Facebook Developer Account
1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Click **Get Started** or **Log In**
3. Accept the developer terms

### Step 2: Create a New App
1. Go to **My Apps** → **Create App**
2. Select **"Other"** as use case
3. Select **"Business"** as app type
4. Enter app name: `NexFlow` and your email
5. Click **Create App**

### Step 3: Add Facebook Login
1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** → Click **Set Up**
3. Choose **Web**
4. Enter your Site URL: `http://localhost:3000` (for development)
5. Click **Save** → **Continue**

### Step 4: Configure OAuth Settings
1. Go to **Facebook Login** → **Settings** (left sidebar)
2. Add these **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/facebook
   https://tyenkhdllxpobmwotkxc.supabase.co/auth/v1/callback
   ```
3. Enable **Client OAuth Login** and **Web OAuth Login**
4. Click **Save Changes**

### Step 5: Get Your Credentials
1. Go to **Settings** → **Basic** (left sidebar)
2. Copy your **App ID** → Add to `.env.local` as `FACEBOOK_APP_ID`
3. Click **Show** next to App Secret → Add to `.env.local` as `FACEBOOK_APP_SECRET`

### Step 6: Request Permissions (For Publishing)
To publish posts, you need these permissions:
- `pages_manage_posts` - To post on Facebook Pages
- `pages_read_engagement` - To read post analytics

1. Go to **App Review** → **Permissions and Features**
2. Request: `pages_manage_posts`, `pages_read_engagement`
3. Submit for review (required for production)

> **Note**: For development/testing, you can use the app with your own Facebook account without review.

---

## 💼 LinkedIn Setup

### Step 1: Create a LinkedIn Developer App
1. Go to [linkedin.com/developers](https://www.linkedin.com/developers/)
2. Click **Create App**
3. Fill in:
   - **App name**: `NexFlow`
   - **LinkedIn Page**: Select your company page (or create one)
   - **App logo**: Upload any logo
   - **Legal agreement**: Check the box
4. Click **Create App**

### Step 2: Configure OAuth 2.0
1. Go to the **Auth** tab
2. Under **OAuth 2.0 settings**, add **Authorized redirect URLs**:
   ```
   http://localhost:3000/api/auth/callback/linkedin
   https://tyenkhdllxpobmwotkxc.supabase.co/auth/v1/callback
   ```
3. Click **Update**

### Step 3: Get Your Credentials
1. In the **Auth** tab:
   - Copy **Client ID** → Add to `.env.local` as `LINKEDIN_CLIENT_ID`
   - Copy **Client Secret** → Add to `.env.local` as `LINKEDIN_CLIENT_SECRET`

### Step 4: Request Products (For Publishing)
1. Go to the **Products** tab
2. Request access to:
   - **Share on LinkedIn** - To post content
   - **Sign In with LinkedIn using OpenID Connect** - For authentication
3. These are typically auto-approved instantly

---

## 🔧 Supabase OAuth Configuration

After getting your credentials, configure Supabase:

### Facebook in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Authentication** → **Providers**
3. Find **Facebook** → Enable it
4. Enter your **App ID** and **App Secret**
5. Click **Save**

### LinkedIn in Supabase
1. In **Authentication** → **Providers**
2. Find **LinkedIn (OIDC)** → Enable it
3. Enter your **Client ID** and **Client Secret**
4. Click **Save**

---

## ✅ Testing OAuth

After setup, test the connections:

1. Restart your Next.js dev server
2. Go to `http://localhost:3000/dashboard/platforms`
3. Click **Connect Facebook** or **Connect LinkedIn**
4. You should be redirected to authorize the app
5. After authorization, you'll be redirected back

---

## 📋 Checklist

- [ ] Facebook Developer account created
- [ ] Facebook App created with App ID and Secret
- [ ] Facebook OAuth redirect URIs configured
- [ ] LinkedIn Developer App created
- [ ] LinkedIn Client ID and Secret obtained
- [ ] LinkedIn redirect URIs configured
- [ ] Supabase Facebook provider enabled
- [ ] Supabase LinkedIn provider enabled
- [ ] `.env.local` updated with all credentials

---

## 🚨 Common Issues

### "App not set up" error (Facebook)
- Make sure your app is in Development mode for testing
- Add yourself as a Test User or App Tester

### "Invalid redirect_uri" error
- Double-check the redirect URI matches exactly (including trailing slashes)
- Ensure the URIs are added to both the platform AND Supabase

### Rate limits
- Facebook: 200 calls/hour per user
- LinkedIn: 100 calls/day for share API
