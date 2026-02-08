# OAuth Setup Guide for NexFlow

This guide explains how to set up OAuth credentials for Facebook and LinkedIn integration.

---

## 📘 Facebook Setup (Graph API)

### Step 1: Create a Facebook Developer Account
1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Click **Get Started** or **Log In**
3. Accept the developer terms

### Step 2: Create a New App (CRITICAL CHOICE)
1.  Go to **My Apps** → **Create App**.
2.  Select **"Other"** (This is crucial, do not select the shortcut options). Click **Next**.
3.  On the next screen, select **"Business"**.
    > [!IMPORTANT]
    > **Why Business?** Page permissions like `pages_manage_posts` are strictly reserved for "Business" type apps. If you select "Consumer" or "None", you will never find the Page-related use cases.
4.  Enter app name: `NexFlow` and click **Create App**.

### Step 3: Add Facebook Login for Business
1. In your app dashboard, click **Add Product**
2. Find **Facebook Login for Business** (or standard Facebook Login if using None/Other) → Click **Set Up**
3. Choose **Web**
4. Enter your Site URL: `http://localhost:3000` (for development)
5. Click **Save**

### Step 4: Configure OAuth Settings
1. Go to **Facebook Login** → **Settings** (left sidebar)
2. Add these **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/platform?platform=facebook
   https://tyenkhdllxpobmwotkxc.supabase.co/auth/v1/callback
   ```
3. Enable **Client OAuth Login** and **Web OAuth Login**
4. Click **Save Changes**

### Step 5: Add Permissions (CRITICAL - 2025 UI)

Since you are in the new "Use Cases" dashboard:

1.  **Add Page Permissions**:
    *   Click **Use cases** in the left sidebar (as you have already done).
    *   Click the **Add use cases** button (top right).
    *   Select **Other** or search for a use case that mentions **"Manage Pages"** or **"Wider range of permissions"**.
    *   Once added, click **Customize** or **Edit** next to it.
    *   Search for and click **Add** for:
        - `pages_show_list`
        - `pages_manage_posts`
        - `pages_read_engagement`

2.  **Add Email Permission**:
    *   On the same "Use cases" main page, find **"Authenticate and request data from users with Facebook Login"**.
    *   Click **Customize** (as seen in your screenshot).
    *   Find the **Permissions** section and click **Add** next to `email`.

> [!NOTE]
> While in "Development Mode", you can use these permissions as an Admin/Developer of the app without needing a full review from Facebook.

### Step 6: Get Your Credentials
1. Go to **Settings** → **Basic** (left sidebar)
2. Copy your **App ID** → Add to `.env.local` as `FACEBOOK_APP_ID`
3. Click **Show** next to App Secret → Add to `.env.local` as `FACEBOOK_APP_SECRET`

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
   http://localhost:3000/api/auth/callback/platform?platform=linkedin
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

- [ ] Facebook App type is "Business" or "None" (NOT Consumer)
- [ ] `pages_manage_posts` and `pages_show_list` added in Permissions & Features
- [ ] OAuth Redirect URIs added to both FB/LinkedIn and Supabase
- [ ] `.env.local` updated with all credentials

---

## 🚨 Common Issues

### "Invalid Scopes" error (Facebook)
- This usually means you chose the wrong app type (Consumer) or haven't added the permissions in "Permissions and Features".
- Ensure you have added `email`, `pages_show_list`, `pages_manage_posts`, and `pages_read_engagement`.

### "Invalid redirect_uri" error
- Double-check the redirect URI matches exactly (including `?platform=facebook` part if using direct connection).
