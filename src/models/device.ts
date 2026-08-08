import { DeviceFunction } from './device-function.js';
import { DeviceType } from './device-type.js';

/**
 * Device definition
 */
export interface Device {
    /** Stable identifier for the exposed endpoint */
    endpointId: string;
    /** Hubspace device ID */
    deviceId: string;
    /** Device name */
    name: string;
    /** Type of the device */
    type: DeviceType;
    /** Device manufacturer */
    manufacturer: string;
    /** Device model */
    model: string[];
    /** Supported device functions */
    functions: DeviceFunction[];
}