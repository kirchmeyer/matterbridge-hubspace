import { DeviceType } from './device-type.js';
import { FunctionCharacteristic } from './function-characteristic.js';

/**
 * Implemented device function definition
 */
export interface DeviceFunctionDef {
    /**
     * Function class of Hubspace API
     */
    functionClass: string;
    /**
    * Mapping to a supported device function
     */
    characteristic: FunctionCharacteristic;
}

/**
 * Implemented device definition
 */
export interface DeviceDef {
    /**
     * Device class of Hubspace API
     */
    deviceClass: string;
    /**
     * Type of device
     */
    deviceType: DeviceType;
    /**
     * Supported device functions
     */
    functions: DeviceFunctionDef[];
}