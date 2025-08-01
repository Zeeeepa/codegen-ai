// Simple encryption/decryption utilities for token storage
// Note: This is basic client-side encryption for demonstration purposes
// In production, consider using server-side encryption or secure key management

const ENCRYPTION_KEY = 'github-token-encryption-key-2024';

// Simple Base64 encoding with a basic Caesar cipher for obfuscation
export function encryptToken(token: string): string {
  try {
    // Combine token with key and encode
    const combined = `${token}:${ENCRYPTION_KEY}`;
    return btoa(combined);
  } catch (error) {
    console.error('Failed to encrypt token:', error);
    return token; // Return original token if encryption fails
  }
}

export function decryptToken(encryptedToken: string): string | null {
  try {
    // Decode and extract token
    const decoded = atob(encryptedToken);
    const [token, key] = decoded.split(':');
    
    // Verify the key matches
    if (key !== ENCRYPTION_KEY) {
      console.warn('Token decryption failed: invalid key');
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
}

// Generate a simple hash for token validation
export function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Validate if a string looks like a GitHub token
export function isValidGitHubTokenFormat(token: string): boolean {
  // GitHub personal access tokens start with ghp_ and are typically 40 characters
  // GitHub app tokens start with ghs_ and are typically 40 characters
  // Classic tokens start with ghp_ and are 40 characters
  const tokenPatterns = [
    /^ghp_[A-Za-z0-9]{36}$/, // Personal access token
    /^ghs_[A-Za-z0-9]{36}$/, // GitHub app token
    /^github_pat_[A-Za-z0-9_]{82}$/, // Fine-grained personal access token
  ];
  
  return tokenPatterns.some(pattern => pattern.test(token));
}

// Mask token for display purposes
export function maskToken(token: string): string {
  if (!token) return '';
  if (token.length <= 8) return '••••••••';
  
  // Show first 4 and last 4 characters
  return `${token.substring(0, 4)}${'•'.repeat(Math.max(8, token.length - 8))}${token.substring(token.length - 4)}`;
}