import convert from 'color-convert';
import {
    bridgedNode,
    dimmableLight,
    extendedColorLight,
    fan,
    MatterbridgeDynamicPlatform,
    MatterbridgeEndpoint,
    onOffLight,
    onOffLightSwitch,
    onOffPlugInUnit,
    powerSource,
    type PlatformConfig,
    type PlatformMatterbridge
} from 'matterbridge';
import { type AnsiLogger } from 'matterbridge/logger';
import { BridgedDeviceBasicInformation, ColorControl, FanControl, LevelControl, OnOff } from 'matterbridge/matter/clusters';
import { isConfigValid, type HubspaceConfig } from './config.js';
import { Device } from './models/device.js';
import { DeviceFunction, NoDeviceFunction } from './models/device-function.js';
import { DeviceType } from './models/device-type.js';
import { FunctionCharacteristic } from './models/function-characteristic.js';
import { AccountService } from './services/account.service.js';
import { DeviceService } from './services/device.service.js';
import { DiscoveryService } from './services/discovery.service.js';
import { tokenService } from './services/token.service.js';

interface RegisteredDevice {
    device: Device;
    endpoint: MatterbridgeEndpoint;
}

export class HubspacePlatform extends MatterbridgeDynamicPlatform {
    public readonly accountService: AccountService;
    public readonly deviceService: DeviceService;

    private readonly discoveryService: DiscoveryService;
    private readonly registeredDevices = new Map<string, RegisteredDevice>();
    private pollTimer?: NodeJS.Timeout;
    private discoveryTimer?: NodeJS.Timeout;
    private isReconciling = false;
    private isRefreshing = false;

    constructor(
        matterbridge: PlatformMatterbridge,
        log: AnsiLogger,
        override config: HubspaceConfig
    ) {
        super(matterbridge, log, config);

        if (!this.verifyMatterbridgeVersion('3.10.4')) {
            throw new Error('This plugin requires Matterbridge 3.10.4 or newer.');
        }

        this.accountService = new AccountService(log);
        this.deviceService = new DeviceService(this);
        this.discoveryService = new DiscoveryService(this.accountService, log);
    }

    override async onStart(reason?: string): Promise<void> {
        await this.ready;

        if (!isConfigValid(this.config)) {
            throw new Error('Hubspace username and password are required.');
        }

        tokenService.login(this.config.username, this.config.password);
        tokenService.loginBuffer = this.config.loginBuffer ?? 300;

        if (!await this.accountService.loadAccount()) {
            throw new Error('Unable to load the Hubspace account.');
        }

        await this.clearSelect();
        await this.reconcileDevices();
        this.log.info(`Hubspace platform started${reason ? `: ${reason}` : ''}.`);
    }

    override async onConfigure(): Promise<void> {
        await super.onConfigure();
        await this.refreshAllDevices();

        if (this.pollTimer) clearInterval(this.pollTimer);
        if (this.discoveryTimer) clearInterval(this.discoveryTimer);

        const pollInterval = Math.max(this.config.pollInterval ?? 30, 5) * 1000;
        const discoveryInterval = Math.max(this.config.discoveryInterval ?? 300, 60) * 1000;

        this.pollTimer = setInterval(() => {
            void this.refreshAllDevices().catch(error => this.log.error('Scheduled Hubspace refresh failed.', error));
        }, pollInterval);
        this.discoveryTimer = setInterval(() => {
            void this.reconcileDevices().catch(error => this.log.error('Scheduled Hubspace discovery failed.', error));
        }, discoveryInterval);
    }

    override async onShutdown(reason?: string): Promise<void> {
        if (this.pollTimer) clearInterval(this.pollTimer);
        if (this.discoveryTimer) clearInterval(this.discoveryTimer);
        this.pollTimer = undefined;
        this.discoveryTimer = undefined;
        tokenService.stop();

        await super.onShutdown(reason);
        if (this.config.unregisterOnShutdown) await this.unregisterAllDevices(100);
    }

    private async reconcileDevices(): Promise<void> {
        if (this.isReconciling) return;
        this.isReconciling = true;

        try {
            const discoveredDevices = await this.discoveryService.discoverDevices();
            if (!discoveredDevices) return;

            const discoveredIds = new Set(discoveredDevices.map(device => device.endpointId));

            for (const [endpointId, registered] of this.registeredDevices) {
                if (discoveredIds.has(endpointId)) continue;

                await this.unregisterDevice(registered.endpoint);
                this.registeredDevices.delete(endpointId);
                this.log.info(`Removed Hubspace device ${registered.device.name}.`);
            }

            for (const device of discoveredDevices) {
                const registered = this.registeredDevices.get(device.endpointId);
                if (registered) {
                    registered.device = device;
                    continue;
                }

                const endpoint = this.createBaseEndpoint(device);
                await this.registerDevice(endpoint);
                this.configureEndpoint(endpoint, device);
                this.registeredDevices.set(device.endpointId, { device, endpoint });
                this.setSelectDevice(device.endpointId, device.name, undefined, 'hub');
                this.log.info(`Added Hubspace device ${device.name}.`);
            }
        } finally {
            this.isReconciling = false;
        }
    }

    private configureEndpoint(endpoint: MatterbridgeEndpoint, device: Device): void {
        if (device.type === DeviceType.Fan) {
            this.configureFanHandlers(endpoint, device);
        } else {
            this.configureOnOffHandlers(endpoint, device);
            if (this.supports(device, FunctionCharacteristic.Brightness)) {
                this.configureLevelHandlers(endpoint, device);
            }
            if (this.supports(device, FunctionCharacteristic.ColorRgb)) {
                this.configureColorHandlers(endpoint, device);
            }
        }
    }

    private createBaseEndpoint(device: Device): MatterbridgeEndpoint {
        const name = device.name.slice(0, 32);
        const model = (device.model[0] ?? 'Hubspace Device').slice(0, 32);
        const manufacturer = (device.manufacturer || 'Hubspace').slice(0, 32);
        let endpoint: MatterbridgeEndpoint;

        if (device.type === DeviceType.Fan) {
            endpoint = new MatterbridgeEndpoint([fan, bridgedNode, powerSource], { id: device.endpointId }, this.config.debug)
                .createDefaultBridgedDeviceBasicInformationClusterServer(name, device.endpointId, 0xfff1, manufacturer, model)
                .createDefaultIdentifyClusterServer()
                .createDefaultPowerSourceWiredClusterServer()
                .createDefaultFanControlClusterServer();
        } else if (device.type === DeviceType.Outlet) {
            endpoint = new MatterbridgeEndpoint([onOffPlugInUnit, bridgedNode, powerSource], { id: device.endpointId }, this.config.debug)
                .createDefaultBridgedDeviceBasicInformationClusterServer(name, device.endpointId, 0xfff1, manufacturer, model)
                .createDefaultIdentifyClusterServer()
                .createDefaultOnOffClusterServer()
                .createDefaultPowerSourceWiredClusterServer();
        } else if (device.type === DeviceType.Switch) {
            endpoint = new MatterbridgeEndpoint([onOffLightSwitch, bridgedNode, powerSource], { id: device.endpointId }, this.config.debug)
                .createDefaultBridgedDeviceBasicInformationClusterServer(name, device.endpointId, 0xfff1, manufacturer, model)
                .createDefaultIdentifyClusterServer()
                .createDefaultOnOffClusterServer()
                .createDefaultPowerSourceWiredClusterServer();
        } else {
            const definition = this.supports(device, FunctionCharacteristic.ColorRgb)
                ? extendedColorLight
                : this.supports(device, FunctionCharacteristic.Brightness) ? dimmableLight : onOffLight;
            endpoint = new MatterbridgeEndpoint([definition, bridgedNode, powerSource], { id: device.endpointId }, this.config.debug)
                .createDefaultBridgedDeviceBasicInformationClusterServer(name, device.endpointId, 0xfff1, manufacturer, model)
                .createDefaultIdentifyClusterServer()
                .createDefaultOnOffClusterServer()
                .createDefaultPowerSourceWiredClusterServer();

            if (this.supports(device, FunctionCharacteristic.Brightness)) endpoint.createDefaultLevelControlClusterServer();
            if (this.supports(device, FunctionCharacteristic.ColorRgb)) endpoint.createHsColorControlClusterServer();
        }

        return endpoint.addRequiredClusterServers();
    }

    private configureOnOffHandlers(endpoint: MatterbridgeEndpoint, device: Device): void {
        endpoint.addCommandHandler('on', async () => this.setDeviceValue(device, FunctionCharacteristic.Power, true));
        endpoint.addCommandHandler('off', async () => this.setDeviceValue(device, FunctionCharacteristic.Power, false));
    }

    private configureLevelHandlers(endpoint: MatterbridgeEndpoint, device: Device): void {
        const setLevel = async (level: number): Promise<void> => {
            const brightness = Math.round(level / 254 * 100);
            await this.setDeviceValue(device, FunctionCharacteristic.Brightness, brightness);
        };

        endpoint.addCommandHandler('moveToLevel', ({ request: { level } }) => setLevel(level));
        endpoint.addCommandHandler('moveToLevelWithOnOff', ({ request: { level } }) => setLevel(level));
    }

    private configureColorHandlers(endpoint: MatterbridgeEndpoint, device: Device): void {
        const setColor = async (matterHue: number, matterSaturation: number): Promise<void> => {
            const hue = Math.round(matterHue / 254 * 360) % 360;
            const saturation = Math.round(matterSaturation / 254 * 100);
            const hex = convert.hsv.hex([hue, saturation, 100]);
            await this.setDeviceValue(device, FunctionCharacteristic.ColorRgb, hex);
        };

        endpoint.addCommandHandler('moveToHueAndSaturation', ({ request: { hue, saturation } }) => setColor(hue, saturation));
        endpoint.addCommandHandler('moveToHue', ({ request: { hue } }) => {
            const saturation = endpoint.getAttribute(ColorControl, 'currentSaturation', endpoint.log) ?? 0;
            return setColor(hue, saturation);
        });
        endpoint.addCommandHandler('moveToSaturation', ({ request: { saturation } }) => {
            const hue = endpoint.getAttribute(ColorControl, 'currentHue', endpoint.log) ?? 0;
            return setColor(hue, saturation);
        });
    }

    private configureFanHandlers(endpoint: MatterbridgeEndpoint, device: Device): void {
        endpoint.subscribeAttribute(FanControl, 'fanMode', (fanMode, _oldValue, context) => {
            if (context.fabric === undefined) return;
            void this.setFanMode(device, fanMode);
        }, endpoint.log);

        endpoint.subscribeAttribute(FanControl, 'percentSetting', (percent, _oldValue, context) => {
            if (context.fabric === undefined || percent === null) return;
            void this.setFanPercent(device, percent);
        }, endpoint.log);
    }

    private async setFanMode(device: Device, mode: FanControl.FanMode): Promise<void> {
        if (mode === FanControl.FanMode.Off) {
            await this.setDeviceValue(device, FunctionCharacteristic.Power, false);
            return;
        }

        await this.setDeviceValue(device, FunctionCharacteristic.Power, true);
        const speed = mode === FanControl.FanMode.Low ? 25 : mode === FanControl.FanMode.Medium ? 50 : 100;
        if (this.supports(device, FunctionCharacteristic.FanSpeed)) {
            await this.setDeviceValue(device, FunctionCharacteristic.FanSpeed, speed);
        }
    }

    private async setFanPercent(device: Device, percent: number): Promise<void> {
        await this.setDeviceValue(device, FunctionCharacteristic.Power, percent > 0);
        if (percent > 0 && this.supports(device, FunctionCharacteristic.FanSpeed)) {
            await this.setDeviceValue(device, FunctionCharacteristic.FanSpeed, percent);
        }
    }

    private async setDeviceValue(
        device: Device,
        characteristic: FunctionCharacteristic,
        value: boolean | number | string
    ): Promise<void> {
        const deviceFunction = this.getFunction(device, characteristic);
        if (deviceFunction === NoDeviceFunction) {
            throw new Error(`${device.name} does not support ${FunctionCharacteristic[characteristic]}.`);
        }
        await this.deviceService.setValue(device.deviceId, deviceFunction, value);
    }

    private async refreshAllDevices(): Promise<void> {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        try {
            await Promise.all([...this.registeredDevices.values()].map(registered => this.refreshDevice(registered)));
        } finally {
            this.isRefreshing = false;
        }
    }

    private async refreshDevice({ device, endpoint }: RegisteredDevice): Promise<void> {
        let reachable = false;

        try {
            if (device.type === DeviceType.Fan) {
                const power = await this.deviceService.getValueAsBoolean(
                    device.deviceId,
                    this.getFunction(device, FunctionCharacteristic.Power)
                );
                const speed = this.supports(device, FunctionCharacteristic.FanSpeed)
                    ? await this.deviceService.getValueAsInteger(device.deviceId, this.getFunction(device, FunctionCharacteristic.FanSpeed))
                    : undefined;

                if (power !== undefined) {
                    reachable = true;
                    const percent = power ? Math.max(speed ?? 100, 1) : 0;
                    await endpoint.setAttribute(FanControl, 'percentSetting', percent, endpoint.log);
                    await endpoint.setAttribute(FanControl, 'percentCurrent', percent, endpoint.log);
                    await endpoint.setAttribute(FanControl, 'fanMode', this.fanModeForPercent(percent), endpoint.log);
                }
            } else {
                const power = await this.deviceService.getValueAsBoolean(
                    device.deviceId,
                    this.getFunction(device, FunctionCharacteristic.Power)
                );
                if (power !== undefined) {
                    reachable = true;
                    await endpoint.setAttribute(OnOff, 'onOff', power, endpoint.log);
                }

                if (this.supports(device, FunctionCharacteristic.Brightness)) {
                    const brightness = await this.deviceService.getValueAsInteger(
                        device.deviceId,
                        this.getFunction(device, FunctionCharacteristic.Brightness)
                    );
                    if (brightness !== undefined && brightness >= 0) {
                        reachable = true;
                        const currentLevel = Math.max(1, Math.round(brightness / 100 * 254));
                        await endpoint.setAttribute(LevelControl, 'currentLevel', currentLevel, endpoint.log);
                    }
                }

                if (this.supports(device, FunctionCharacteristic.ColorRgb)) {
                    const value = await this.deviceService.getValueAsString(
                        device.deviceId,
                        this.getFunction(device, FunctionCharacteristic.ColorRgb)
                    );
                    if (value) {
                        reachable = true;
                        const [hue, saturation] = convert.hex.hsv(value);
                        await endpoint.setAttribute(ColorControl, 'currentHue', Math.round(hue / 360 * 254), endpoint.log);
                        await endpoint.setAttribute(ColorControl, 'currentSaturation', Math.round(saturation / 100 * 254), endpoint.log);
                        await endpoint.configureColorControlMode(ColorControl.ColorMode.CurrentHueAndCurrentSaturation);
                    }
                }
            }
        } catch (error) {
            this.log.error(`Failed to refresh ${device.name}.`, error);
        }

        await endpoint.setAttribute(BridgedDeviceBasicInformation, 'reachable', reachable, endpoint.log);
    }

    private fanModeForPercent(percent: number): FanControl.FanMode {
        if (percent <= 0) return FanControl.FanMode.Off;
        if (percent <= 33) return FanControl.FanMode.Low;
        if (percent <= 66) return FanControl.FanMode.Medium;
        return FanControl.FanMode.High;
    }

    private supports(device: Device, characteristic: FunctionCharacteristic): boolean {
        return device.functions.some(deviceFunction => deviceFunction.characteristic === characteristic);
    }

    private getFunction(device: Device, characteristic: FunctionCharacteristic): DeviceFunction {
        return device.functions.find(deviceFunction => deviceFunction.characteristic === characteristic) ?? NoDeviceFunction;
    }
}

export function createPlatform(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    config: PlatformConfig
): HubspacePlatform {
    return new HubspacePlatform(matterbridge, log, config as HubspaceConfig);
}