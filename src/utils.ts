/**
 * Converts a decimal number to hexadecimal
 * @param number Number to convert to hexadecimal
 */
export function convertNumberToHex(value: number): string {
    const hexValue = value.toString(16);

    return hexValue.length % 2 ? '0' + hexValue : hexValue;
}