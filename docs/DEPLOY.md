# Putting Pesadithi live at pesa.mark.co.ke

Pesadithi is its own Cloudflare Pages project, built from this repo. Every push to `main` goes live in about a minute. mark.co.ke only links to it.

## One-time setup in Cloudflare (about 10 minutes)

1. Cloudflare dashboard, then Workers & Pages, then Create, then Pages, then Connect to Git.
2. Choose `mkaigwa/pesadithi-lab`. If Cloudflare can't see it, use "Configure GitHub app" to allow it.
3. Settings:
   - Project name: `pesadithi`
   - Production branch: `main`
   - Framework preset: None
   - Build command: leave empty
   - Build output directory: `app`
4. Save and deploy, then check `pesadithi.pages.dev` opens.
5. In the project, open Custom domains, then Set up a custom domain, and enter `pesa.mark.co.ke`. mark.co.ke's DNS is on Cloudflare, so the record is added for you.

## Two changes in the mark-co-ke repo

1. In `public/_redirects` (create it if missing), add short links:

   ```
   /pesa          https://pesa.mark.co.ke/  301
   /pesadithi     https://pesa.mark.co.ke/  301
   /pesadithi/*   https://pesa.mark.co.ke/  301
   ```

2. In `public/lab.html`, point the Pesadithi card at `https://pesa.mark.co.ke/` and keep GitHub as a smaller "Read the code" link.

## Checks once live

- pesa.mark.co.ke opens, "See a demo story" works, and the footer links back to mark.co.ke/lab.
- mark.co.ke/pesa and mark.co.ke/pesadithi both land on it.
- Send the link to yourself on WhatsApp: the preview shows the hand, the phone and the headline.
- Turn on flight mode after the page loads and paste five SMS: it still works.

## What never goes here

Mark's private build, with his own data, is never in this repo. It lives only as a private artifact.
