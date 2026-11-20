# Putting Pesadithi live at pesadithi.mark.co.ke

Pesadithi deploys from this repo, not from the mark-co-ke repo. Cloudflare Pages watches `main` and publishes the `app/` folder, so every push here goes live in about a minute without touching the website repo.

## One-time setup in Cloudflare (about 10 minutes)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Choose `mkaigwa/pesadithi-lab`. Allow Cloudflare to see this repo if it asks.
3. Settings:
   - Project name: `pesadithi`
   - Production branch: `main`
   - Framework preset: None
   - Build command: leave empty
   - Build output directory: `app`
4. Save and deploy. Check it opens at `pesadithi.pages.dev`.
5. In the project → Custom domains → Set up a custom domain → `pesadithi.mark.co.ke`. mark.co.ke's DNS is already on Cloudflare, so the record is added for you.

## Two small changes in the mark-co-ke repo

1. **Short link.** Add these lines to `public/_redirects` (create the file if it isn't there), so mark.co.ke/pesadithi works too:

   ```
   /pesadithi     https://pesadithi.mark.co.ke/  301
   /pesadithi/*   https://pesadithi.mark.co.ke/  301
   ```

2. **Lab card.** In `public/lab.html`, change the Pesadithi card's main link from the GitHub repo to `https://pesadithi.mark.co.ke/`, and keep GitHub as a second, smaller "Read the code" link.

## Checks once live

- pesadithi.mark.co.ke opens, "See a demo story" works, and the footer links back to mark.co.ke/lab.
- Send the link to yourself on WhatsApp: the preview shows the hand, the phone and "Where did your mobile money go this year?".
- Turn on flight mode after the page loads and paste five SMS: it still works.

## What never goes here

Mark's private build (with his own data) is never in this repo. It lives only as a private artifact.
