/* Pesadithi Lab: merchant knowledge base.
   Pattern, category, and a one-line note that explains who the business is.
   Notes are short context only. Payment platforms hide the real shop, so the note says so. */
(function () {
  const C = {
    groceries: 'Groceries & household', eating: 'Eating out & coffee', going: 'Going out', transport: 'Transport & fuel',
    car: 'Car & parking', bills: 'Bills & utilities', home: 'Rent & housing', health: 'Health', edu: 'Education',
    people: 'People', savings: 'Savings & investing', banks: 'Banks & cards', credit: 'Borrowing', shop: 'Shopping',
    subs: 'Subscriptions & entertainment', giving: 'Giving & community', business: 'Business & payroll', cash: 'Cash',
    airtime: 'Airtime & data', gov: 'Government & tax', platform: 'Payment platforms', other: 'Other'
  };
  const R = [
    [/fuliza/i, C.credit, 'Fuliza is Safaricom\'s M-PESA overdraft. It covers a payment when your balance is short, for a 1% access fee plus a daily charge.'],
    [/m-?shwari/i, C.credit, 'M-Shwari is Safaricom and NCBA\'s loan and savings product on M-PESA. Loans run 30 days with a facility fee.'],
    [/kcb m-?pesa/i, C.credit, 'KCB M-PESA is a loan and savings product from KCB Bank on M-PESA.'],
    [/ziidi/i, C.savings, 'ZIIDI is a money market fund you can save into from M-PESA.'],
    [/mmf|money market|unit trust|cic asset|sanlam|britam|etica|lofty|ndovu|chumz/i, C.savings, 'An investment or money market fund.'],
    [/matatu|\bboda\b|bodaboda|\bshuttle\b|(?:line|travel|transport|express)\s+sacco|sacco\s+(?:ltd\s+)?(?:matatu|shuttle)/i, C.transport, 'Matatu, boda boda or transport Sacco fare.'],
    [/chama|sacco|investment club|table banking/i, C.savings, 'A chama, Sacco or savings group contribution.'],
    [/equity bulk account/i, C.banks, 'Equity Bulk Account (300600) is how a transfer from an Equity Bank account arrives on M-PESA. The sender could be you, your employer or a client.'],
    [/workpay/i, C.business, 'WorkPay is a payroll and HR platform. Money sent here usually funds salaries.'],
    [/pesapal.*sabi|sabi/i, C.platform, 'Pesapal Sabi is a card and M-PESA point-of-sale terminal. The real shop or hotel sits behind it, so check your receipts.'],
    [/pesapal/i, C.platform, 'Pesapal is a Kenyan payment gateway. The business you paid used Pesapal to collect.'],
    [/tingg|cellulant/i, C.platform, 'Tingg is Cellulant\'s payment platform, used by apps such as Glovo. The account name often reveals the real merchant.'],
    [/ipay/i, C.platform, 'iPay is a payment gateway used by online shops and billers.'],
    [/evopay|paystack|flutterwave|dpo|jambopay|direct ?pay/i, C.platform, 'A payment gateway. The real merchant sits behind it.'],
    [/glovo|uber eats|bolt food/i, C.eating, 'Food and shop delivery app.'],
    [/\buber\b|\bbolt\b|little cab|faras|yego/i, C.transport, 'Ride-hailing.'],
    [/java|artcaff|art caffe|dormans|connect coffee|coffee|cafe|caffe|bakery|boulangerie|kfc|pizza|chicken|grill|restaurant|ristorante|kitchen|bistro|galitos|cj'?s|mama oliech|cafe javas|coldstone|cold stone|chocolate/i, C.eating, 'Café, restaurant or takeaway.'],
    [/bar\b|lounge|klub|club\b|pub\b|alchemist|brew|wine/i, C.going, 'Bar, club or lounge.'],
    [/naivas|quick ?mart|carrefour|chandarana|tuskys|cleanshelf|magunas|eastmatt|capital shoppers|mega(?:duka)?|supermarket|greenspoon|zucchini|foodplus|home ?mart|baltic textile/i, C.groceries, 'Supermarket or household shopping.'],
    [/shell|total|rubis|ola energy|astrol|petroleum|vivo|national oil|stabex|hass/i, C.transport, 'Fuel station.'],
    [/autoxpress|servicebay|car ?wash|motorspa|tyre|garage|mechanic|toyota|cmc motors/i, C.car, 'Car service, tyres or car wash.'],
    [/parkngo|park n go|cliknet|kaps|parking|expressway|moja/i, C.car, 'Parking or tolls. KAPS runs airport parking; ParkNGo runs mall car parks; Moja runs the Nairobi Expressway.'],
    [/kplc|kenya power|umeme|yaka|nwsc|nairobi water|water|electric/i, C.bills, 'Electricity or water.'],
    [/safaricom (post ?paid|home|fibre)|zuku|faiba|jtl|liquid|wananchi|home fibre|airtel postpaid/i, C.bills, 'Phone or home internet.'],
    [/multichoice|dstv|gotv|showmax|netflix|spotify|apple\.com|youtube|startimes|boomplay/i, C.subs, 'TV, streaming or app subscription.'],
    [/airtime|bundles|data bundle/i, C.airtime, 'Airtime or data.'],
    [/kra|e-?citizen|ntsa|nssf|nhif|\bsha\b|county|huduma|ura\b|kcca/i, C.gov, 'Government service, tax or statutory payment.'],
    [/hospital|clinic|pharma|chemist|medical|dental|health|elixir|goodlife|lab(?:oratory)?|aga khan university hospital/i, C.health, 'Health, pharmacy or medical bill.'],
    [/school|academy|university|college|strathmore|kindergarten|institute|tuition|advertising/i, C.edu, 'School fees or a course.'],
    [/apartment|court|estate|rent|properties|realty|homes\b|management ltd|caretaker/i, C.home, 'Rent or housing.'],
    [/church|parish|mosque|harambee|fundraiser|funeral|medical fund|weds|wedding|rotary|rotaract|kibera|foundation/i, C.giving, 'Church, harambee, fundraiser or community giving.'],
    [/bank|credit card|equity paybill|co-?operative|i ?& ?m|im bank|ncba|kcb|absa|stanbic|standard chartered|prime ?bank|dtb|family bank|credit bank|victoria commercial|m-pesa global|m-pesa card/i, C.banks, 'A bank, card or transfer to an account, often your own money moving.'],
    [/salon|barber|spa\b|beauty|nails/i, C.health, 'Salon, barber or spa.'],
    [/cinema|cinemax|imax|theatre|trampoline|play|madfun|ticket|event/i, C.subs, 'Cinema, events or play.'],
    [/books|sports house|run beyond|mall|boutique|fashion|shoes|jumia|kilimall|miniso|electronics|shop\b|stamp/i, C.shop, 'Shopping.'],
    [/agent|agencies|cash withdrawal/i, C.cash, 'Cash withdrawn at an agent.']
  ];
  function lookup(name, type, person) {
    if (type === 'airtime') return { category: C.airtime, note: 'Airtime or data.' };
    if (type === 'withdraw') return { category: C.cash, note: 'Cash withdrawn at an agent or ATM.' };
    if (type === 'credit_draw' || type === 'credit_repay' || type === 'loan_in' || type === 'loan_repay') return { category: C.credit, note: '' };
    for (const [re, cat, note] of R) if (re.test(name || '')) return { category: cat, note };
    if (person) return { category: C.people, note: 'A person. Sort these in the game to see what they really are.' };
    return { category: C.other, note: '' };
  }
  window.PDMerchants = { lookup, categories: C, OWN_MONEY: [C.banks, C.savings] };
})();
