# Notes

## Assumptions
- Everyone, including the person receiving the pot that week, pays the weekly amount.
  The pot is therefore `weekly amount x number of members`
  (3 members x 50.00 = 150.00, as in the example).
- Members receive the pot in the order they were added, one per week.
  The susu is complete after every member has received it once.
- The currency is GHS and has 2 decimal places.

## Decisions (things the instructions did not cover)
1. **Adding members after week 1 has started:** not allowed. The roster is locked
   as soon as the first contribution is recorded. Reason: adding someone later
   would change the pot size and the payout order for people who already paid.
2. **Contributions only for the current week.** Past weeks are closed
   (cannot be changed after money was paid out) and future weeks have not started.
3. **Minimum 2 members** are needed before a week can be closed.
4. **Names are unique ignoring case and extra spaces** ("ama" and " Ama " are the same member).
5. **Exact money:** all amounts are stored as integer pesewas, never floats.
   Input with more than 2 decimal places (like `1.234`) is rejected rather than rounded.
6. **Closing a week that is not fully paid** is not an error. It returns a report
   of who owes what, pays nothing, and the week stays open.
7. **Overpayment** (more than the member still owes for that week) is rejected,
   as required, so a member can never pay ahead.
8. After the susu is complete, no more payments or closings are accepted.

## What I would improve with more time
- Save the group (browser localStorage, a JSON file or a database) so data survives restarting the program.
- Allow a member to pay ahead for future weeks, and support late joiners with a clear catch-up rule.
- Support editing the payout order and removing a member who has not yet received the pot.
- Add a small HTTP API on top of the same `SusuGroup` class (or a proper UI later).
- More tests (very large amounts, stress/property tests on the money functions) and a linter.
- Support several groups at once.
