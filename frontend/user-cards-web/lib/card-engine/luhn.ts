/**
 * Validation et calcul de checksum Luhn
 */

/**
 * Valide un numéro de carte avec l'algorithme de Luhn
 * @param pan Numéro de carte complet (string)
 * @returns boolean
 */
export function validateLuhn(pan: string): boolean {
    const digits = pan.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Calcule le chiffre de contrôle Luhn pour un PAN partiel
 * @param partialPan 15 premiers chiffres (pour Visa/MC)
 * @returns Le chiffre de contrôle (0-9)
 */
export function calculateLuhnChecksum(partialPan: string): number {
    const digits = partialPan.replace(/\D/g, '');
    let sum = 0;
    let isEven = true; // On commence par la droite, le checksum sera le digit 0, donc le dernier du partial est impair (position 1)

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return (10 - (sum % 10)) % 10;
}
