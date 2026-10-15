'use strict';

const HELP = `Commands:
  create <amount>            e.g. create 50.00
  add <name>                 use "quotes" for names with spaces
  pay <name> <amount> [week] partial payments allowed
  close                      close the current week
  status                     show week and balances
  history                    show payouts so far
  help                       show this help
  exit                       quit`;

function tokenize(line) {
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return tokens;
}

function requireGroup(state) {
  if (!state.group) throw new ValidationError('Create a group first: create <amount>');
  return state.group;
}


function handleCommand(line, state) {
  const [command, ...args] = tokenize(line);
  if (!command) return '';

  try {
    switch (command.toLowerCase()) {
      case 'help':
        return HELP;

      case 'create': {
        if (state.group) return 'A group already exists.';
        if (args.length !== 1) return 'Usage: create <amount>';
        state.group = new SusuGroup(args[0]);
        return `Group created. Weekly contribution: GHS ${formatMoney(state.group.weeklyAmount)}`;
      }

      case 'add': {
        const group = requireGroup(state);
        if (args.length < 1) return 'Usage: add <name>';
        const name = group.addMember(args.join(' '));
        return `Added ${name} (position ${group.members.length}).`;
      }

      case 'pay': {
        const group = requireGroup(state);
        if (args.length < 2 || args.length > 3) return 'Usage: pay <name> <amount> [week]';
        const week = args[2] === undefined ? undefined : Number(args[2]);
        const r = group.recordContribution(args[0], args[1], week);
        return r.owes === 0
          ? `${r.member} has paid in full for week ${r.week}.`
          : `${r.member} paid ${formatMoney(r.paid)}, still owes ${formatMoney(r.owes)}.`;
      }

      case 'close': {
        const group = requireGroup(state);
        const r = group.closeWeek();
        if (!r.closed) {
          return `Week ${r.week} cannot close:\n` + r.report.join('\n');
        }
        let text = `Week ${r.week} closed. ${r.recipient} receives ${formatMoney(r.payout)}.`;
        text += r.completed
          ? '\nAll members have received the pot. The susu is complete.'
          : `\nWeek ${r.week + 1} begins. ${r.nextRecipient} is next.`;
        return text;
      }

      case 'status': {
        const s = requireGroup(state).status();
        const lines = [
          s.complete
            ? 'Susu complete.'
            : `Week ${s.week} of ${s.totalWeeks}. Recipient: ${s.recipient}`,
          `Weekly contribution: ${formatMoney(s.weeklyAmount)}`,
        ];
        for (const m of s.members) {
          lines.push(`  ${m.member}: paid ${formatMoney(m.paid)}, owes ${formatMoney(m.owes)}`);
        }
        return lines.join('\n');
      }

      case 'history': {
        const payouts = requireGroup(state).payouts;
        if (payouts.length === 0) return 'No payouts yet.';
        return payouts
          .map((p) => `Week ${p.week}: ${p.recipient} received ${formatMoney(p.amount)}`)
          .join('\n');
      }

      default:
        return `Unknown command "${command}". Type help.`;
    }
  } catch (err) {
    if (err instanceof ValidationError) return `Error: ${err.message}`;
    throw err;
  }
}

function startMenu() {
  const state = { group: null };
  let output = 'Susu Group Tracker. Type help for commands.';
  for (;;) {
    const line = prompt(output + '\n\nCommand:');
    if (line === null || line.trim().toLowerCase() === 'exit') break;
    output = handleCommand(line, state) || output;
    console.log('> ' + line + '\n' + output);
  }
  console.log('Bye.');
  return state.group;
}
