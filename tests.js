'use strict';

// Tiny test runner (no libraries). Call runTests() to run everything.

const _tests = [];
function test(name, fn) { _tests.push({ name, fn }); }

function assertEqual(actual, expected, label = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label} expected ${e} but got ${a}`);
}
function assertThrows(fn, pattern) {
  try { fn(); } catch (err) {
    if (pattern && !pattern.test(err.message)) {
      throw new Error(`Error "${err.message}" did not match ${pattern}`);
    }
    return;
  }
  throw new Error('Expected an error but nothing was thrown');
}
function assertMatch(text, pattern) {
  if (!pattern.test(text)) throw new Error(`"${text}" did not match ${pattern}`);
}

function makeGroup() {
  const g = new SusuGroup('50.00');
  ['Ama', 'Kofi', 'Esi'].forEach((n) => g.addMember(n));
  return g;
}

test('full example: partial payment, week cannot close, then payout', () => {
  const g = makeGroup();
  g.recordContribution('Ama', '50');
  g.recordContribution('Kofi', '50');
  g.recordContribution('Esi', '30');

  const blocked = g.closeWeek();
  assertEqual(blocked.closed, false);
  assertEqual(blocked.report, ['Esi owes 20.00']);
  assertEqual(g.payouts.length, 0);
  assertEqual(g.currentWeek, 1);

  g.recordContribution('Esi', '20');
  const closed = g.closeWeek();
  assertEqual(closed.closed, true);
  assertEqual(closed.recipient, 'Ama');
  assertEqual(formatMoney(closed.payout), '150.00');
  assertEqual(g.currentWeek, 2);
  assertEqual(closed.nextRecipient, 'Kofi');
});

test('partial payments accumulate and report the remaining balance', () => {
  const g = makeGroup();
  assertEqual(g.recordContribution('Esi', '10.50').owes, 3950);
  assertEqual(g.recordContribution('Esi', '9.50').owes, 3000);
  assertEqual(g.outstanding().find((o) => o.member === 'Esi'), { member: 'Esi', owes: 3000 });
});

test('week cannot close when nobody has paid and lists everyone', () => {
  const r = makeGroup().closeWeek();
  assertEqual(r.closed, false);
  assertEqual(r.report, ['Ama owes 50.00', 'Kofi owes 50.00', 'Esi owes 50.00']);
});

test('rejects unknown members and duplicate members', () => {
  const g = makeGroup();
  assertThrows(() => g.recordContribution('Yaw', '10'), /Unknown member/);
  assertThrows(() => g.addMember('Ama'), /already exists/);
  assertThrows(() => g.addMember('  ama  '), /already exists/);
  assertThrows(() => g.addMember('   '), /empty/);
});

test('rejects zero, negative and malformed amounts', () => {
  const g = makeGroup();
  assertThrows(() => g.recordContribution('Ama', '0'), /greater than zero/);
  assertThrows(() => g.recordContribution('Ama', '-5'), /greater than zero/);
  assertThrows(() => g.recordContribution('Ama', 'abc'), /Invalid amount/);
  assertThrows(() => g.recordContribution('Ama', '1.234'), /Invalid amount/);
  assertThrows(() => new SusuGroup('0'), /greater than zero/);
});

test('rejects payments above what the member owes for the week', () => {
  const g = makeGroup();
  assertThrows(() => g.recordContribution('Ama', '50.01'), /only owes 50.00/);
  g.recordContribution('Ama', '40');
  assertThrows(() => g.recordContribution('Ama', '10.01'), /only owes 10.00/);
  g.recordContribution('Ama', '10');
  assertThrows(() => g.recordContribution('Ama', '0.01'), /only owes 0.00/);
});

test('money is exact: 0.1 + 0.2 style sums have no rounding error', () => {
  assertEqual(parseMoney('0.1') + parseMoney('0.2'), parseMoney('0.3'));
  assertEqual(parseMoney(19.99), 1999);
  assertEqual(formatMoney(parseMoney('1234.5')), '1234.50');

  const g = new SusuGroup('0.10');
  ['A', 'B', 'C'].forEach((n) => g.addMember(n));
  ['A', 'B', 'C'].forEach((m) => {
    g.recordContribution(m, '0.05');
    g.recordContribution(m, '0.05');
  });
  assertEqual(formatMoney(g.closeWeek().payout), '0.30');
});

test('members are paid in joining order and the susu completes', () => {
  const g = makeGroup();
  const order = [];
  while (!g.isComplete) {
    g.members.forEach((m) => g.recordContribution(m, '50'));
    order.push(g.closeWeek().recipient);
  }
  assertEqual(order, ['Ama', 'Kofi', 'Esi']);
  assertEqual(g.payouts.length, 3);
  assertThrows(() => g.closeWeek(), /complete/);
  assertThrows(() => g.recordContribution('Ama', '10'), /complete/);
});

test('contributions only allowed for the current week', () => {
  const g = makeGroup();
  assertThrows(() => g.recordContribution('Ama', '10', 2), /not started/);
  g.members.forEach((m) => g.recordContribution(m, '50'));
  g.closeWeek();
  assertThrows(() => g.recordContribution('Ama', '10', 1), /already closed/);
  g.recordContribution('Ama', '10', 2);
});

test('members cannot be added after contributions have started', () => {
  const g = makeGroup();
  g.recordContribution('Ama', '10');
  assertThrows(() => g.addMember('Yaw'), /cannot be added/);
});

test('a week cannot close with fewer than 2 members', () => {
  const g = new SusuGroup('50');
  g.addMember('Ama');
  assertThrows(() => g.closeWeek(), /at least 2 members/);
});

test('menu walks through the example from the instructions', () => {
  const state = { group: null };
  const run = (line) => handleCommand(line, state);
  assertMatch(run('pay Ama 10'), /Create a group first/);
  run('create 50.00');
  run('add Ama'); run('add Kofi'); run('add Esi');
  run('pay Ama 50'); run('pay Kofi 50'); run('pay Esi 30');
  assertMatch(run('close'), /Esi owes 20\.00/);
  run('pay Esi 20');
  const out = run('close');
  assertMatch(out, /Ama receives 150\.00/);
  assertMatch(out, /Kofi is next/);
  assertMatch(run('pay Zed 5'), /Unknown member/);
});

/** Runs all tests, prints results to the console, returns the report text. */
function runTests() {
  const lines = [];
  let failed = 0;
  for (const t of _tests) {
    try {
      t.fn();
      lines.push('PASS  ' + t.name);
    } catch (err) {
      failed++;
      lines.push('FAIL  ' + t.name + '\n      ' + err.message);
    }
  }
  lines.push('', `${_tests.length - failed}/${_tests.length} tests passed`);
  const report = lines.join('\n');
  console.log(report);
  return report;
}
