# Logos (wallets and assistants)

Wallet logos in use: M-PESA Kenya (`mpesa.png`), MTN MoMo (`mtn-momo.png`), M-Pesa Tanzania (`mpesa-tz.png`), M-PESA Ethiopia (`mpesa-et.png`), supplied by Mark Kaigwa. Airtel Money (`airtel.png`).

## Assistant logos

The home page and the "Ask your AI" page show a tile for ChatGPT, Claude, Gemini, DeepSeek and Copilot. ChatGPT, Claude, Gemini and DeepSeek use the icons from the open-source LobeHub icon set (`@lobehub/icons-static-png`, MIT licence), resized to 128 px. Copilot was supplied by Mark Kaigwa. Any assistant without a file listed in `logos.json` falls back to a plain letter.

To show the official logos:

1. Download each mark from the company's own brand or press page, and check its usage terms.
2. Save the files here, for example `chatgpt.svg`, `claude.svg`, `gemini.svg`, `deepseek.svg`, `copilot.svg` (SVG, PNG or WebP; square, at least 64 px).
3. List them in `logos.json`:

```json
{ "chatgpt": "chatgpt.svg", "claude": "claude.svg", "gemini": "gemini.svg", "deepseek": "deepseek.svg", "copilot": "copilot.svg" }
```

The footer already carries the ownership note: the names and logos belong to OpenAI, Anthropic, Google, DeepSeek and Microsoft, are shown only to say which assistants the prompt works with, and imply no endorsement.
