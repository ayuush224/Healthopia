const mongoose = require('mongoose');

const { AppError } = require('./errors');

function ensureString(value, fieldName, options = {}) {
  if (value === undefined || value === null) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  if (options.min && trimmedValue.length < options.min) {
    throw new AppError(`${fieldName} must be at least ${options.min} characters.`, 400);
  }

  if (options.max && trimmedValue.length > options.max) {
    throw new AppError(`${fieldName} must be ${options.max} characters or fewer.`, 400);
  }

  return trimmedValue;
}

function ensureOptionalString(value, options = {}) {
  if (value === undefined || value === null) {
    return '';
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    if (options.min) {
      throw new AppError(`This field must be at least ${options.min} characters.`, 400);
    }

    return '';
  }

  if (options.min && trimmedValue.length < options.min) {
    throw new AppError(`This field must be at least ${options.min} characters.`, 400);
  }

  if (options.max && trimmedValue.length > options.max) {
    throw new AppError(`This field must be ${options.max} characters or fewer.`, 400);
  }

  return trimmedValue;
}

function normalizeUsername(value) {
  const username = ensureString(value, 'Username', { min: 3, max: 24 }).toLowerCase();

  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new AppError('Username can use only letters, numbers, dots, underscores, and hyphens.', 400);
  }

  return username;
}

function ensureObjectId(value, fieldName) {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) {
    throw new AppError(`${fieldName} is invalid.`, 400);
  }

  return String(value);
}

function ensureOptionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new AppError(`${fieldName} must be a non-negative number.`, 400);
  }

  return numberValue;
}

function ensureBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new AppError(`${fieldName} must be true or false.`, 400);
}

function parseTags(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split(',');

  return rawValues
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

module.exports = {
  ensureBoolean,
  ensureObjectId,
  ensureOptionalNumber,
  ensureOptionalString,
  ensureString,
  normalizeUsername,
  parseTags
};
