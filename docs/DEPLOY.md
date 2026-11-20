# Putting Pesadithi live at mark.co.ke/pesadithi/

Pesadithi lives in a folder of mark.co.ke, the same way Ebenezer does. Its code stays in this repo; a small workflow in the mark-co-ke repo copies the `app/` folder into `public/pesadithi/`, and Cloudflare publishes it like any other change to the site.

## One-time setup in the mark-co-ke repo (about 5 minutes)

1. Open github.com/mkaigwa/mark-co-ke, then Add file, then Create new file.
2. Name it `.github/workflows/sync-pesadithi.yml` and paste in the contents of `docs/sync-pesadithi.yml` from this repo. Commit to main.
3. Open the Actions tab, choose "Sync Pesadithi", then "Run workflow". After about a minute it commits `public/pesadithi/`, and Cloudflare publishes it a minute or two later.
4. In `public/lab.html`, point the Pesadithi card at `/pesadithi/` and keep the GitHub repo as a smaller "Read the code" link.

## After that

Every change pushed to this repo reaches mark.co.ke/pesadithi/ within 6 hours on its own, or straight away if you press "Run workflow".

## Checks once live

- mark.co.ke/pesadithi/ opens, "See a demo story" works, and the footer links back to mark.co.ke/lab.
- Send the link to yourself on WhatsApp: the preview shows the hand, the phone and "Where did your mobile money go this year?".
- Turn on flight mode after the page loads and paste five SMS: it still works.

## What never goes here

Mark's private build, with his own data, is never in this repo. It lives only as a private artifact.
