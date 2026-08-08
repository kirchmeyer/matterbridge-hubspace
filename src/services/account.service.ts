import { AxiosError } from 'axios';
import { Endpoints } from '../api/endpoints.js';
import { createHttpClientWithBearerInterceptor } from '../api/http-client-factory.js';
import { PluginLogger } from '../logger.js';
import { AccountResponse } from '../responses/account-response.js';

/**
 * Service for managing account details
 */
export class AccountService {
    private readonly _client = createHttpClientWithBearerInterceptor({
        baseURL: Endpoints.API_BASE_URL
    });

    constructor(private readonly _log: PluginLogger) { }

    private _accountId = '';

    /**
     * Gets the account ID
     */
    public get accountId(): string {
        return this._accountId;
    }

    /**
     * Loads current user account
     * @returns True if load succeeded otherwise false
     */
    public async loadAccount(): Promise<boolean> {
        try {
            const response = await this._client.get<AccountResponse>('/users/me');
            const accountId = response.data.accountAccess[0]?.account.accountId;
            if (!accountId) {
                this._log.error('Failed to load account information.', 'No accessible Hubspace account was found.');
                return false;
            }

            this._accountId = accountId;
            return true;
        } catch (ex) {
            const axiosError = <AxiosError>ex;
            const friendlyMessage = axiosError.response?.status === 401 ? 'Incorrect username or password' : axiosError.message;

            this._log.error('Failed to load account information.', friendlyMessage);
            return false;
        }
    }

}