# Shared money: design notes (in design, Nov 2026)

Most people in Kenya carry other people in their wallets. Pesadithi's next step is to tell that story without breaking the privacy promise that makes anyone load their texts at all.

## The contract (applies to every role)

1. Each person runs Pesadithi on their own device. Nobody uploads a statement to anyone else.
2. You choose an envelope (rent, school fees, Mum's upkeep, the chama). Only lines you tag into it count.
3. You send a card, not a statement: totals for that envelope only, as an image or a short code. Nothing else crosses.
4. Either side can stop. Delete the card and the shared view is gone.

Totals, not transactions, by default. Incomes never cross.

## Roles

| Role | The real question | What crosses | What stays private | Output | Tension to design for |
|---|---|---|---|---|---|
| Spouse or partner | Are we pulling in the same direction? | Household envelope: rent, fees, groceries, home help, family support if both agree | Personal spending, gifts | Monthly money-date card: who carried which bills, the tight week, one thing to plan | Fairness against autonomy. "Ours" is a choice, never an audit |
| Roommate | Who owes whom? | Rent, KPLC tokens, Wi-Fi, water, gas, cleaner | Everything else | One settle-up line per person | Precision without intimacy: the less crosses, the better |
| Siblings | Are we carrying Mum and Dad fairly? | Family envelope: upkeep, medical, a sibling's fees | Incomes | Family ledger: who covered what, what is coming | Comparing amounts across unequal incomes breeds resentment; offer "on plan" mode |
| First-born and carer | How much goes to others, and how much catches me off guard? | Nothing by default | Everything, unless shared with siblings | Planned vs sudden support, a standing amount plus a buffer | Love and obligation look identical on a statement |
| Chama officer (chair, treasurer, secretary; church treasurer, harambee or funeral committee) | Is the group's money separate from mine, and can I prove it? | Chama envelope: contributions, payouts, loans | Personal wallet | Monthly member statement, late list, clean handover | Group money through a personal line looks like personal income; that blur breaks trust |

## Build order (proposed)

1. Envelopes on a single device (tag lines into named envelopes; first-born view needs nothing else).
2. Share card export: image plus a compact code holding envelope totals only.
3. Card import and the two-person views (roommate settle-up first: smallest data, clearest value).
4. Siblings and couples. 5. Chama statement with member list.

All figures on the home page role cards are invented illustrations.
