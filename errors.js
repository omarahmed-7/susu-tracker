'use strict';

/** Thrown whenever an operation breaks a susu rule. */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

