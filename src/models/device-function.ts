import { FunctionCharacteristic } from './function-characteristic.js';

/**
 * Device function
 */
export interface DeviceFunction {
    /**
    * Plugin characteristic for the function
     */
    characteristic: FunctionCharacteristic;
    /**
     * Function instance
     * (this could be set by the API if there are multiple instance for single characteristic)
     */
    functionInstance?: string;
    /**
     * API attribute ID
     */
    attributeId: string;
}

/**
 * Function that indicates NULL function
 */
export const NoDeviceFunction: DeviceFunction = {
    characteristic: FunctionCharacteristic.None,
    attributeId: ''
};

/**
 * Checks whether function is {@link NoDeviceFunction}
 * @param deviceFunction Function to check
 * @returns True if function is NULL function
 */
export function isNoFunction(deviceFunction: DeviceFunction): boolean {
    return deviceFunction.characteristic === FunctionCharacteristic.None;
}