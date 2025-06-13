import { VALIDATION } from '../constants/app-constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  } else {
    if (email.length < VALIDATION.email.minLength) {
      errors.push(`Email must be at least ${VALIDATION.email.minLength} characters`);
    }
    if (email.length > VALIDATION.email.maxLength) {
      errors.push(`Email must be no more than ${VALIDATION.email.maxLength} characters`);
    }
    if (!VALIDATION.email.pattern.test(email)) {
      errors.push('Please enter a valid email address');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < VALIDATION.password.minLength) {
      errors.push(`Password must be at least ${VALIDATION.password.minLength} characters`);
    }
    if (password.length > VALIDATION.password.maxLength) {
      errors.push(`Password must be no more than ${VALIDATION.password.maxLength} characters`);
    }
    if (VALIDATION.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (VALIDATION.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (VALIDATION.password.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  } else {
    const trimmedName = name.trim();
    if (trimmedName.length < VALIDATION.name.minLength) {
      errors.push(`${fieldName} must be at least ${VALIDATION.name.minLength} character`);
    }
    if (trimmedName.length > VALIDATION.name.maxLength) {
      errors.push(`${fieldName} must be no more than ${VALIDATION.name.maxLength} characters`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    errors.push(`${fieldName} is required`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(result => result.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
