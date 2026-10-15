# Susu Group Tracker 

A small program that manages one rotating savings group (susu).
Written in plain JavaScript only: no Node.js, no npm, no libraries.
It runs in any browser.

## Run the program
1. Open any browser (Chrome, Edge, Firefox) and open Developer Tools -> **Console**
   (`F12` or `Ctrl+Shift+J`).
2. Copy and paste the contents of these files into the console, one after the other, in this order,
   pressing Enter after each:
   `src/errors.js`, `src/money.js`, `src/susu.js`, `src/menu.js`
3. Type `startMenu()` and press Enter. A box asks for a command each time.
   Cancel the box or type `exit` to quit.

| Command | What it does |
|---|---|
| `create 50.00` | Create the group with a fixed weekly contribution in GHS |
| `add Ama` | Add a member (use quotes for spaces: `add "Kofi Mensah"`) |
| `pay Ama 50` | Record a contribution for the current week (partial payments allowed) |
| `pay Esi 20 1` | Same, with an explicit week number |
| `close` | Close the week: pays the pot if everyone paid in full, otherwise lists who owes |
| `status` | Show the current week, recipient and balances |
| `history` | Show payouts made so far |
| `help` / `exit` | Help / quit |

You can also use the code directly in the console:
```js
const g = new SusuGroup('50.00');
g.addMember('Ama'); g.addMember('Kofi'); g.addMember('Esi');
g.recordContribution('Esi', '30');
g.closeWeek().report; // ["Ama owes 50.00", "Kofi owes 50.00", "Esi owes 20.00"]
```

## Run the tests
Open **tests.html** in a browser. It loads the source files and the 12 tests and
prints PASS/FAIL for each one on the page (and in the console).

Or paste `src/*.js` and then `test/tests.js` into the console and run `runTests()`.

## Project layout
```
src/errors.js   ValidationError
src/money.js    exact money parsing/formatting (integer pesewas)
src/susu.js     the SusuGroup class with all the rules
src/menu.js     simple text menu (startMenu)
test/tests.js   12 automated tests with a tiny built-in runner
tests.html      opens in a browser and runs the tests
NOTES.md        assumptions, decisions, improvements
```
