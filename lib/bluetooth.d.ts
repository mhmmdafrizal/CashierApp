/* ponytail: Web Bluetooth types not in TS DOM lib yet */
interface BluetoothDevice {
  gatt?: {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    connected: boolean;
  };
  name?: string;
}
interface BluetoothRemoteGATTServer {
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}
interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}
interface BluetoothRemoteGATTCharacteristic {
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}
interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  getDevices(): Promise<BluetoothDevice[]>;
}
interface Navigator {
  bluetooth: Bluetooth;
}
