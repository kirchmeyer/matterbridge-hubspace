import { type PlatformConfig, type PlatformMatterbridge } from 'matterbridge';
import { type AnsiLogger } from 'matterbridge/logger';
import { type HubspaceConfig } from './config.js';
import { HubspacePlatform } from './platform.js';

/**
 * Creates the Matterbridge dynamic platform.
 */
export default function initializePlugin(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    config: PlatformConfig
): HubspacePlatform {
    return new HubspacePlatform(matterbridge, log, config as HubspaceConfig);
}

export { HubspacePlatform } from './platform.js';
