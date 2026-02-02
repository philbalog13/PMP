/**
 * Password Validation Service
 * Enforces strong password requirements
 */

interface PasswordStrength {
    valid: boolean;
    score: number; // 0-100
    errors: string[];
    suggestions: string[];
}

class PasswordValidatorService {
    private readonly MIN_LENGTH = 12;
    private readonly COMMON_PASSWORDS = [
        'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
        'monkey', 'dragon', 'master', 'sunshine', 'princess', 'football',
        'abc123', 'password123', 'welcome123', 'admin123'
    ];

    /**
     * Validate password strength
     */
    validate(password: string): PasswordStrength {
        const errors: string[] = [];
        const suggestions: string[] = [];
        let score = 0;

        // Longueur minimale
        if (password.length < this.MIN_LENGTH) {
            errors.push(`Password must be at least ${this.MIN_LENGTH} characters`);
        } else {
            score += 25;
        }

        // Complexité - Lowercase
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain lowercase letters (a-z)');
        } else {
            score += 15;
        }

        // Complexité - Uppercase
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain uppercase letters (A-Z)');
        } else {
            score += 15;
        }

        // Complexité - Numbers
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain numbers (0-9)');
        } else {
            score += 15;
        }

        // Complexité - Special characters
        if (!/[^a-zA-Z0-9]/.test(password)) {
            errors.push('Password must contain special characters (!@#$%^&*()_+-=[]{}|;:,.<>?)');
        } else {
            score += 15;
        }

        // Mots de passe communs
        const lowerPassword = password.toLowerCase();
        if (this.COMMON_PASSWORDS.some(p => lowerPassword.includes(p))) {
            errors.push('Password contains common words or patterns');
            score -= 30;
        }

        // Patterns répétitifs (aaa, 111, etc.)
        if (/(.)\1{2,}/.test(password)) {
            suggestions.push('Avoid repeated characters (e.g., aaa, 111)');
            score -= 10;
        }

        // Séquences (abc, 123, etc.)
        if (/(?:abc|bcd|cde|def|efg|123|234|345|456|567|678|789)/i.test(password)) {
            suggestions.push('Avoid sequential characters (e.g., abc, 123)');
            score -= 10;
        }

        // Keyboard patterns (qwerty, asdf, etc.)
        if (/(?:qwerty|asdfgh|zxcvbn)/i.test(password)) {
            suggestions.push('Avoid keyboard patterns (e.g., qwerty)');
            score -= 15;
        }

        // Bonus pour longueur supplémentaire
        if (password.length >= 16) {
            score += 10;
            suggestions.push('Great! Password is 16+ characters');
        }
        if (password.length >= 20) {
            score += 5;
            suggestions.push('Excellent! Password is 20+ characters');
        }

        // Bonus pour diversité de caractères
        const uniqueChars = new Set(password).size;
        if (uniqueChars >= password.length * 0.7) {
            score += 5;
        }

        // Normaliser score entre 0-100
        score = Math.max(0, Math.min(100, score));

        return {
            valid: errors.length === 0 && score >= 60,
            score,
            errors,
            suggestions: suggestions.length > 0 ? suggestions : ['Password meets minimum requirements']
        };
    }

    /**
     * Check if password has been breached (stub for future HIBP integration)
     */
    async checkBreachedPassword(password: string): Promise<boolean> {
        // TODO: Intégrer avec HaveIBeenPwned API
        // For now, return false (not breached)
        return false;
    }

    /**
     * Generate a strong random password
     */
    generateStrongPassword(length: number = 16): string {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const allChars = lowercase + uppercase + numbers + special;

        let password = '';

        // Ensure at least one of each type
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}

export const passwordValidator = new PasswordValidatorService();
export { PasswordStrength };
