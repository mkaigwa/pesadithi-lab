# Pesadithi look and feel

Light, green-led, and built so colour carries meaning rather than decoration.

| Token | Hex | Meaning |
|---|---|---|
| Money in | `#17803F` | Anything that arrives. Bars rise above the line. |
| Money out | `#D23B2E` | Anything that leaves. Bars drop below the line. |
| Credit (Fuliza, overdraft) | `#2457D6` | Money owed on overdraft. |
| Loans (M-Shwari, KCB M-PESA, MoKash) | `#E08A00` | Loan fees. Always shown with labels or a table (contrast 2.6:1). |
| Fees | `#5B6670` | Transaction costs. |
| Penalties | `#A3170F` | Late fees and rollovers. |
| Brand forest | `#17694E` / `#0F2620` ink | Buttons, links, active states. |
| Tints | `#E5F4EA`, `#F2F7F4` | Light green washes and panels. No cream, no dark mode. |

Rules
- In and out always differ by position (above or below a baseline) and by sign (+ or −), not by colour alone. The palette passes the dataviz validator; green and red sit at ΔE 6.1 for deuteranopia, which is legal only because of that second encoding.
- Every chart has a "See the numbers" table.
- Type (locked Nov 2026): Besley for headings and big numbers, Hanken Grotesk for text, JetBrains Mono for times and codes. The phone mock-up uses Roboto, as Android does.
- Never use: Inter, Fraunces, Bricolage Grotesque, Young Serif, Funnel Display, Montserrat, Raleway, Merriweather, Source Serif, Poppins, Outfit, Space Grotesk, Archivo, Public Sans. Literata reads too thin.
- Motion: charts reveal as they scroll in (bars grow, lines draw, dots drop), big figures count up, and the home page reads a phone's money texts and labels them. Everything respects reduced motion.
- Story mode is the Wrapped: one full-bleed colour per slide (green for money in, red for money out, blue for Fuliza, deep ink and mint between).
- No Safaricom, M-PESA, Fuliza or M-Shwari logos: product names appear as plain words only.
