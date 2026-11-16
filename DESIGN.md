# Pesadithi look and feel

Light, green-led, and built so colour carries meaning rather than decoration.

| Token | Hex | Meaning |
|---|---|---|
| Money in | `#1F8A4C` | Anything that arrives. Bars rise above the line. |
| Money out | `#D23B2E` | Anything that leaves. Bars drop below the line. |
| Credit (Fuliza, overdraft) | `#7A4FD0` | Money owed on overdraft. |
| Loans (M-Shwari, KCB M-PESA, MoKash) | `#E08A00` | Loan fees. Always shown with labels or a table (contrast 2.6:1). |
| Fees | `#5B6670` | Transaction costs. |
| Penalties | `#A3170F` | Late fees and rollovers. |
| Brand green | `#0D7A3F` / `#095E30` | Buttons, links, active states. |
| Tints | `#E5F4EA`, `#F2F7F4` | Light green washes and panels. No cream, no dark mode. |

Rules
- In and out always differ by position (above or below a baseline) and by sign (+ or −), not by colour alone. The palette passes the dataviz validator; green and red sit at ΔE 6.1 for deuteranopia, which is legal only because of that second encoding.
- Every chart has a "See the numbers" table.
- Type: Literata for headings and big numbers, Inter for everything else.
