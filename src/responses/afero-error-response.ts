export interface AferoErrorResponse {
    /** UNIX timestamp of the request */
    timestamp: number;
    /** Request response code */
    status: number;
    /** Description of the error */
    error_description: string;
    /** URL of the request */
    path: string;
}

/**
 * Checks whether error is caused by Afero response
 * @param error Error object to check
 * @returns True if error is from Afero
 */
export function isAferoError(error: unknown): error is AferoErrorResponse {
    if (error === null || typeof error !== 'object') return false;

    const response = error as Record<string, unknown>;
    return typeof response.timestamp === 'number'
        && typeof response.status === 'number'
        && typeof response.error_description === 'string'
        && typeof response.path === 'string';
}