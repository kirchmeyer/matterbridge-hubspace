import { AxiosError } from 'axios';
import { createHash } from 'node:crypto';
import { Endpoints } from '../api/endpoints.js';
import { createHttpClientWithBearerInterceptor } from '../api/http-client-factory.js';
import { Devices } from '../hubspace-devices.js';
import { PluginLogger } from '../logger.js';
import { Device } from '../models/device.js';
import { DeviceDef, DeviceFunctionDef } from '../models/device-def.js';
import { DeviceFunction } from '../models/device-function.js';
import { getDeviceTypeForKey } from '../models/device-type.js';
import { DeviceFunctionResponse } from '../responses/device-function-response.js';
import { DeviceResponse } from '../responses/devices-response.js';
import { AccountService } from './account.service.js';

/**
 * Service for discovering and managing devices
 */
export class DiscoveryService {
    private readonly _httpClient = createHttpClientWithBearerInterceptor({
        baseURL: Endpoints.API_BASE_URL,
        headers: {
            host: 'semantics2.afero.net'
        }
    });

    constructor(
        private readonly _accountService: AccountService,
        private readonly _log: PluginLogger
    ) { }

    /**
     * Discovers new devices
     */
    async discoverDevices(): Promise<Device[] | undefined> {
        try {
            const response = await this._httpClient
                .get<DeviceResponse[]>(`accounts/${this._accountService.accountId}/metadevices`);

            // Get only leaf devices with type of 'device'
            return response.data
                .filter(d => d.children.length === 0 && d.typeId === 'metadevice.device')
                .map(this.mapDeviceResponseToModel.bind(this))
                .filter(d => d.length > 0)
                .flat();
        } catch (ex) {
            this._log.error('Failed to get devices for account.', (<AxiosError>ex).message);
            return undefined;
        }
    }

    private mapDeviceResponseToModel(response: DeviceResponse): Device[] {
        const type = getDeviceTypeForKey(response.description.device.deviceClass);
        const deviceDef = Devices.find(d => d.deviceType === type);

        if (!deviceDef) return [];

        const supportedFunctions = this.findSupportedFunctionsForDevice(deviceDef, response.description.functions);
        const devices: Device[] = [];

        for (const supportedFc of supportedFunctions) {
            // Try to find a device that does NOT contain the same characteristic
            const existingDevice = devices.find(d => !d.functions.some(df => df.characteristic === supportedFc.characteristic));

            // If the device already exists then just add the function to it
            if (existingDevice) {
                existingDevice.functions.push(supportedFc);
            } else {
                // Otherwise create a new device for it
                const defaultName = response.friendlyName;
                const nameQualifier = supportedFc.functionInstance ?? devices.length;
                const newName = devices.some(d => d.name === defaultName) ? `${defaultName} (${nameQualifier})` : defaultName;

                devices.push({
                    endpointId: createHash('sha256').update(`${response.deviceId}-${devices.length + 1}`).digest('hex').slice(0, 32),
                    deviceId: response.deviceId,
                    name: newName,
                    type: type,
                    manufacturer: response.description.device.manufacturerName,
                    model: response.description.device.model.split(',').map(m => m.trim()),
                    functions: [supportedFc]
                });

            }

        }

        return devices;
    }

    /**
     * Gets all functions that are supported (have been implemented) by the plugin
    * @param deviceDef Supported device definition
    * @param deviceFunctionResponse Hubspace device server response
    * @returns All functions from the response that are supported by the plugin
     */
    private findSupportedFunctionsForDevice(deviceDef: DeviceDef, deviceFunctionResponse: DeviceFunctionResponse[]): DeviceFunction[] {
        const supportedFunctions: DeviceFunction[] = [];

        for (const fc of deviceDef.functions) {
            const deviceFunctions = deviceFunctionResponse.filter(df => df.functionClass === fc.functionClass);

            if (deviceFunctions.length === 0) continue;

            for (const deviceFc of deviceFunctions) {
                const functionModel = this.mapToFunction(fc, deviceFc);
                if (functionModel) supportedFunctions.push(functionModel);
            }
        }

        return supportedFunctions;
    }

    private mapToFunction(functionDef: DeviceFunctionDef, functionResponse: DeviceFunctionResponse): DeviceFunction | undefined {
        const attributeId = functionResponse.values[0]?.deviceValues[0]?.key;
        if (!attributeId) {
            this._log.warn(`Ignoring Hubspace function ${functionResponse.functionClass} without a device attribute.`);
            return undefined;
        }

        return {
            characteristic: functionDef.characteristic,
            functionInstance: functionResponse.functionInstance,
            attributeId
        };
    }

}