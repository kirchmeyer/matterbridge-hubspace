import { type PlatformConfig } from 'matterbridge';

export type HubspaceConfig = PlatformConfig & {
    username: string;
    password: string;
    loginBuffer?: number;
    pollInterval?: number;
    discoveryInterval?: number;
};

/**
 * Checks whether all configuration values are valid
 * @param config Config object
 * @returns True if plugin configuration is valid otherwise false
 */
export function isConfigValid(config: HubspaceConfig): boolean {
    return typeof config.username === 'string' && config.username.length > 0
        && typeof config.password === 'string' && config.password.length > 0;
}