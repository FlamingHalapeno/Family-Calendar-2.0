import { validateEmail, validatePassword, validateName, combineValidationResults } from '../../utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email addresses', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should reject email that is too short', () => {
      const result = validateEmail('a@b');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be at least 5 characters');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require uppercase letters', () => {
      const result = validatePassword('lowercase123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('validateName', () => {
    it('should validate normal names', () => {
      const result = validateName('John Doe');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty names', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(51);
      const result = validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be no more than 50 characters');
    });
  });

  describe('combineValidationResults', () => {
    it('should combine multiple validation results', () => {
      const emailResult = validateEmail('invalid');
      const passwordResult = validatePassword('weak');
      
      const combined = combineValidationResults(emailResult, passwordResult);
      
      expect(combined.isValid).toBe(false);
      expect(combined.errors.length).toBeGreaterThan(1);
    });

    it('should return valid when all results are valid', () => {
      const emailResult = validateEmail('test@example.com');
      const passwordResult = validatePassword('StrongPass123');
      
      const combined = combineValidationResults(emailResult, passwordResult);
      
      expect(combined.isValid).toBe(true);
      expect(combined.errors).toHaveLength(0);
    });
  });
});
