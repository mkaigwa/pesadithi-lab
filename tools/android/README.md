# Android route

Android lets you export your texts with a backup app. Pesadithi Lab reads the `.xml` file that **SMS Backup & Restore** (by SyncTech) creates.

1. Install **SMS Backup & Restore** from Google Play.
2. Choose **Back up** → **Messages only** → **Local backup** (your phone's storage). Skip Google Drive, Dropbox and email.
3. Open Pesadithi Lab, choose **Android SMS backup**, and load the `.xml` file. You can do this on the phone itself.
4. **Delete the backup file afterwards.**

## The risk

The backup app asks for permission to read **all** your texts, including bank and one-time codes, and the backup file contains them. Pesadithi Lab only uses mobile-money messages and keeps nothing, but the file itself stays on your phone until you delete it. Don't send it to anyone or upload it anywhere.

## Prefer not to?

Use your M-PESA statement PDF instead (M-PESA app → Statements, or `*334#`). It needs no extra app.
