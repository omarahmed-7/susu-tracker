'use strict';


/**
 * Money is stored as an integer number of pesewas (1 GHS = 100 pesewas).
 * Floating point numbers are never used for arithmetic, so there are
 * no rounding errors (0.1 + 0.2 style problems).
 */

/**
 * Convert "50", "50.5", "50.25" or the number 50.25 into integer pesewas.
 * More than 2 decimal places is rejected instead of silently rounded.
 * The result may be zero or negative; callers decide if that is allowed.
 */
function parseMoney(value) {
  let text;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ValidationError('Amount must be a valid number.');
    }
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    throw new ValidationError('Amount must be a number or a numeric string.');
  }

  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) {
    throw new ValidationError(
      `Invalid amount "${text}". Use a number with at most 2 decimal places.`
    );
  }

  const [, sign, whole, fraction = ''] = match;
  const pesewas = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(pesewas)) {
    throw new ValidationError('Amount is too large.');
  }
  return sign ? -pesewas : pesewas;
}

/** Convert integer pesewas back to a "50.00" style string. */
function formatMoney(pesewas) {
  const negative = pesewas < 0;
  const abs = Math.abs(pesewas);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

