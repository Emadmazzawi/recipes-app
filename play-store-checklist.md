# Google Play Console Launch Checklist Helper

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
- **Can users request that their data be deleted?** Yes. (Provide the link to the in-app settings screen or your privacy policy where they can request it).

### Data Types to Declare:
1.  **Personal Info > Email Address:**
    - Collected? Yes. Shared? No.
    - Processed ephemerally? No.
    - Required or optional? Required.
    - Purpose? App Functionality, Account Management.
2.  **Personal Info > User IDs:** (This is the Supabase Auth UUID)
    - Collected? Yes. Shared? No.
    - Required? Required.
    - Purpose? App Functionality, Account Management.
3.  **App Info & Performance > Crash Logs / Diagnostics:** (Only if Sentry or PostHog is actively tracking crashes in prod)
    - Optional: Select App Functionality / Analytics if you use them.

## 4. Privacy Policy
- Provide the URL to the web-deployed Privacy Policy page we built: `https://<your-vercel-domain>/privacy`

## 5. Target Audience and Content
- **Target Age Groups:** Select 13-15, 16-17, and 18 and over. (We added a children's privacy clause to the privacy policy).
- **Could your store listing unintentionally appeal to children?** No.

## 6. Store Listing Assets
- Upload the `icon.png` (app icon 512x512).
- Upload the `feature-graphic.png` (1024x500 marketing image).
- Upload several screenshots taken from your physical phone testing.
- Copy/Paste the descriptions from `store-listing-content.md`.
