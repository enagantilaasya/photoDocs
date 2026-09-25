/**
 * Validates registration input
 */
const validateRegisterInput = ({ fullName, email, password, confirmPassword }) => {
  const errors = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates login input
 */
const validateLoginInput = ({ email, password }) => {
  const errors = [];

  if (!email || !email.trim()) {
    errors.push('Email is required.');
  }

  if (!password) {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateRegisterInput,
  validateLoginInput
};
