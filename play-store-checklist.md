# Google Play Console Launch Checklist Helper - Smart Recipes

Use this guide to confidently complete the required questionnaires in the Google Play Console for **Smart Recipes**.

## 1. App Access (Test Account)
Google reviewers need access to your app to verify its functionality.
- Go to App content > App access.
- Select: **"All or some functionality is restricted"** (because they need to log in to see their recipes).
- Provide the following instructions to the reviewer:
  - **Login Type:** Email & Password
  - **Email:** `tester@smartrecipes.app` *(You MUST create this user in your Supabase Authentication dashboard before submitting!)*
  - **Password:** `Test12345!` *(or whatever password you set)*
  - **Instructions:** "Please use this test account to log in. You will have access to the main explore screen, AI recipe generation, personalized settings, and saved recipes."

## 2. Content Rating
- Go to App content > Content rating.
- **Category:** Utility, Productivity, Communication, or Other (choose 'Other' or 'Productivity' as it fits best).
- Answer **"No"** to all questions regarding Violence, Sexuality, Language, Controlled Substances, etc. (It's a recipe app).

## 3. Data Safety Form
This is extremely important. Google requires you to declare what data you collect and why.

- **Do you collect or share any of the required user data types?** Yes.
- **Is all of the user data collected by your app encrypted in transit?** Yes (Supabase uses HTTPS).
- **Which of the following methods of account creation does your app support?** Email address & password, OAuth (Google).
- **Can users request that their data be deleted?** Yes.
- **Account Deletion Link:** Use your Vercel URL: `https://recipes-app-eight-lime.vercel.app/` (or create a specific sub-page like `/delete-account` on your site).

### Data Types to Declare:
1.  **Personal Info > Email Address:**
    - Collected? Yes. Shared? No.
    - Required? Required.
    - Purpose? App Functionality, Account Management.
2.  **Personal Info > User IDs:** (This is the Supabase Auth UUID)
    - Collected? Yes. Shared? No.
    - Required? Required.
    - Purpose? App Functionality, Account Management.
3.  **App Info & Performance > Crash Logs / Diagnostics:** (We use PostHog)
    - Collected? Yes. Shared? No.
    - Purpose? Analytics, Developer Communications.

## 4. Privacy Policy & Terms of Service
- Provide the URL to the web-deployed Privacy Policy page: `https://recipes-app-eight-lime.vercel.app/` (Google Console requires a web link).
- Ensure your website prominently displays the same Privacy Policy and Terms of Service we built in the app.

## 5. User Generated Content (UGC)
- **Does your app contain user-generated content?** Yes (Community Feed).
- **Do you have a mechanism to report and block content/users?** Yes.
- **Instructions for Reviewer:** "Users can report objectionable content via the flag icon on any recipe card, which triggers an email to support. Users can also block any other user using the block icon, which immediately hides all content from that user in the feed."

## 6. Target Audience and Content
- **Target Age Groups:** Select 13-15, 16-17, and 18 and over.
- **Could your store listing unintentionally appeal to children?** No.

## 7. Store Listing Assets
- Upload the `icon.png` (app icon 512x512).
- Upload the `feature-graphic.png` (1024x500 marketing image).
- Upload several screenshots taken from your physical phone testing.
- Copy/Paste the descriptions from `store-listing-content.md`.
