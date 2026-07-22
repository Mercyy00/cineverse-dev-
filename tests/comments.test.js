import { describe, it, expect } from 'vitest';
import { sanitizeHTML } from '../src/api.js';

describe('Sanitization & XSS Prevention', () => {
  it('should escape HTML tags and malicious script injection tags', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeHTML(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('should escape quotes and ampersands correctly', () => {
    const input = 'Bob & Alice "Reviewers"';
    const sanitized = sanitizeHTML(input);
    expect(sanitized).toContain('&amp;');
    expect(sanitized).toContain('&quot;');
  });
});
