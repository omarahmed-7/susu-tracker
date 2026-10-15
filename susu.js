'use strict';


/**
 * One rotating savings group.
 *
 * Rules / decisions (also listed in NOTES.md):
 *  - Every member (including this week's recipient) pays the fixed amount each week.
 *  - Members receive the pot in the order they were added, one per week.
 *  - Members can only be added BEFORE the first contribution is recorded.
 *    Once the money starts moving the roster is locked.
 *  - Contributions can only be recorded for the CURRENT week.
 *  - A group needs at least 2 members before a week can be closed.
 *  - Once every member has received the pot, the group is complete.
 */
class SusuGroup {
  #weekly;
  #members = []; // display names, in joining order
  #keys = new Set(); // lower-cased names for duplicate checks
  #week = 1;
  #paid = new Map(); // key -> pesewas paid this week
  #started = false;
  #payouts = [];

  constructor(weeklyAmount) {
    const weekly = parseMoney(weeklyAmount);
    if (weekly <= 0) {
      throw new ValidationError('Weekly contribution must be greater than zero.');
    }
    this.#weekly = weekly;
  }

  // ---------- read-only info ----------

  get weeklyAmount() {
    return this.#weekly;
  }

  get members() {
    return [...this.#members];
  }

  get currentWeek() {
    return this.#week;
  }

  get isComplete() {
    return this.#members.length > 0 && this.#week > this.#members.length;
  }

  get payouts() {
    return this.#payouts.map((p) => ({ ...p }));
  }

  get currentRecipient() {
    return this.isComplete ? null : this.#members[this.#week - 1] ?? null;
  }

  // ---------- helpers ----------

  static #normalize(name) {
    if (typeof name !== 'string') {
      throw new ValidationError('Member name must be text.');
    }
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) {
      throw new ValidationError('Member name cannot be empty.');
    }
    return clean;
  }

  #resolve(name) {
    const clean = SusuGroup.#normalize(name);
    const key = clean.toLowerCase();
    if (!this.#keys.has(key)) {
      throw new ValidationError(`Unknown member "${clean}".`);
    }
    // return the stored display name
    return this.#members.find((m) => m.toLowerCase() === key);
  }

  #paidBy(member) {
    return this.#paid.get(member.toLowerCase()) ?? 0;
  }

  // ---------- actions ----------

  addMember(name) {
    if (this.#started) {
      throw new ValidationError(
        'Members cannot be added after contributions have started.'
      );
    }
    const clean = SusuGroup.#normalize(name);
    const key = clean.toLowerCase();
    if (this.#keys.has(key)) {
      throw new ValidationError(`Member "${clean}" already exists.`);
    }
    this.#keys.add(key);
    this.#members.push(clean);
    return clean;
  }

  /**
   * Record a (possibly partial) payment for a member.
   * @param {string} name
   * @param {string|number} amount GHS amount, e.g. "30.00"
   * @param {number} [week] defaults to the current week
   */
  recordContribution(name, amount, week = this.#week) {
    if (this.isComplete) {
      throw new ValidationError('This susu is complete. No more contributions.');
    }
    const member = this.#resolve(name);

    if (!Number.isInteger(week) || week < 1) {
      throw new ValidationError('Week must be a positive whole number.');
    }
    if (week < this.#week) {
      throw new ValidationError(`Week ${week} is already closed.`);
    }
    if (week > this.#week) {
      throw new ValidationError(
        `Week ${week} has not started. The current week is ${this.#week}.`
      );
    }

    const pesewas = parseMoney(amount);
    if (pesewas <= 0) {
      throw new ValidationError('Amount must be greater than zero.');
    }

    const owed = this.#weekly - this.#paidBy(member);
    if (pesewas > owed) {
      throw new ValidationError(
        `${member} only owes ${formatMoney(owed)} for week ${week}; ` +
          `cannot pay ${formatMoney(pesewas)}.`
      );
    }

    this.#paid.set(member.toLowerCase(), this.#paidBy(member) + pesewas);
    this.#started = true;

    return {
      member,
      week,
      paid: this.#paidBy(member),
      owes: this.#weekly - this.#paidBy(member),
    };
  }

  /** Who still owes money this week, and how much (in pesewas). */
  outstanding() {
    return this.#members
      .map((member) => ({ member, owes: this.#weekly - this.#paidBy(member) }))
      .filter((entry) => entry.owes > 0);
  }

  /**
   * Try to close the current week.
   *  - If someone still owes: nothing is paid out, the week stays open and
   *    the result lists who owes what.
   *  - Otherwise the pot goes to the next member in order and the week advances.
   */
  closeWeek() {
    if (this.isComplete) {
      throw new ValidationError('This susu is complete. Nothing left to close.');
    }
    if (this.#members.length < 2) {
      throw new ValidationError('Add at least 2 members before closing a week.');
    }

    const owing = this.outstanding();
    if (owing.length > 0) {
      return {
        closed: false,
        week: this.#week,
        outstanding: owing,
        report: owing.map((o) => `${o.member} owes ${formatMoney(o.owes)}`),
      };
    }

    const recipient = this.#members[this.#week - 1];
    const payout = this.#weekly * this.#members.length;
    const closedWeek = this.#week;

    this.#payouts.push({ week: closedWeek, recipient, amount: payout });
    this.#week += 1;
    this.#paid = new Map();

    return {
      closed: true,
      week: closedWeek,
      recipient,
      payout,
      nextRecipient: this.currentRecipient,
      completed: this.isComplete,
    };
  }

  /** Snapshot for display. */
  status() {
    return {
      weeklyAmount: this.#weekly,
      week: this.#week,
      totalWeeks: this.#members.length,
      complete: this.isComplete,
      recipient: this.currentRecipient,
      members: this.#members.map((member) => ({
        member,
        paid: this.#paidBy(member),
        owes: this.isComplete ? 0 : this.#weekly - this.#paidBy(member),
      })),
    };
  }
}

