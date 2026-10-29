# CVJ demo run sheet (10 minutes)

Before the meeting: `npm run db:reset` then `npm run dev`, open http://localhost:3000, and click **Reset demo** once so every number is fresh for today. Keep the browser at 100 % zoom; the layout is built for a laptop screen.

Every page carries the banner that the data is invented. Say it once at the start: "Everything you see is sample data we made up. The point today is the shape of the system, not the numbers."

| Min | Screen | What to do | What to say | Ask them |
| --- | --- | --- | --- | --- |
| 0–1 | **Overview** `/` | Point at the five tiles, then the six cards. | "One screen for the whole compound. Each card is one business. Amber means something needs you." | "Which of these numbers do you get today, and how long after the day ends?" |
| 1–2 | **Needs your decision** (bottom of overview) | Click **Approve** on the overtime request. It disappears. | "Staff ask, you decide, the record keeps itself. No more Viber threads to dig through." | "What decisions reach the two of you every week that someone else could prepare?" |
| 2–3 | **Events Place** `/events` | Show the month calendar, then the list with balance due. | "Every booking, its status and what is still unpaid, in one place." | "How is a booking recorded today, and who else needs to know about it?" |
| 3–5 | **New booking** `/events/new` | Fill: new customer, a Saturday next month, 130 guests, Fiesta Buffet, Ground Floor, ₱20,000 deposit. Save. | "Watch what one booking does." | — |
| 5–6 | **Booking detail** (lands here) | Walk the four panels: job sheet, commissary production, manpower, payments. | "The kitchen knows what to cook and when. The commissary knows what to prep the day before. You know you need 6 servers and 3 cooks. The deposit is in, and the two remaining payments have due dates." | "Today, how does the commissary learn the headcount? How do you staff an event?" |
| 6–7 | **Edit booking** | Change guests to 200, save. | "Change the headcount and everything updates. Payments already received stay." | "How often does the pax change after booking?" |
| 7–8 | **Schedule** `/schedule` | Open the week of the amber conflict. Show the double-booked Ground Floor line, the courts, production and shifts side by side. | "Events, courts, kitchen and staff on one calendar. The system saw the double-booking before anyone did." | "Where do clashes between the businesses show up today?" |
| 8–9 | **Analytics** `/analytics` | Switch the range to 90 days. Hover a column. Point at the court heatmap and the pipeline. | "Every chart is live from the same records. Revenue by day and by business, which packages sell, how full the courts are hour by hour, where inquiries stall, and what labor costs against revenue." | "Which of these would you look at every Monday?" |
| 9–10 | **Reset demo** (header) | Click Reset, confirm. Back to the start. | "This is a demo on my laptop. The real system runs on your own cloud database, with logins for you, the managers and staff." | Close: "If this ran on your real data, what would you want to see first thing every morning?" |

## If something goes wrong

- Page blank or error: press Reset demo, then reload.
- Form rejects the date: the demo refuses dates in the past; pick any day from today on.
- Database locked or missing: stop the server, run `npm run db:reset`, start again.

## Numbers to have ready

- Manpower ratios in the demo: 1 server per 25 guests, 1 cook per 50, 1 dishwasher per 100, 1 parking marshal per 80, 1 supervisor per event. Say these are placeholders they will set.
- Payment rule in the demo: deposit on booking, half of the total 30 days before, balance the day before. Also a placeholder.
