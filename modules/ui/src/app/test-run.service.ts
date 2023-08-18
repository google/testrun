import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {Observable} from 'rxjs/internal/Observable';
import {Device, TestModule} from './model/device';
import {map, ReplaySubject, retry} from 'rxjs';
import {SystemConfig} from './model/setting';
import {TestrunStatus} from './model/testrun-status';

const API_URL = 'http://localhost:8000'

@Injectable({
  providedIn: 'root'
})
export class TestRunService {
  private readonly testModules: TestModule[] = [
    {
      displayName: "Connection",
      name: "connection",
      enabled: true
    },
    {
      displayName: "NTP",
      name: "ntp",
      enabled: true
    },
    {
      displayName: "DHCP",
      name: "dhcp",
      enabled: true
    },
    {
      displayName: "DNS",
      name: "dns",
      enabled: true
    },
    {
      displayName: "Services",
      name: "nmap",
      enabled: true
    },
    {
      displayName: "Security",
      name: "security",
      enabled: true
    },
    {
      displayName: "TLS",
      name: "tls",
      enabled: true
    },
    {
      displayName: "Smart Ready",
      name: "udmi",
      enabled: false
    },
  ];

  private devices = new BehaviorSubject<Device[]>([]);
  private _systemConfig = new BehaviorSubject<SystemConfig>({network: {}});
  public systemConfig$ = this._systemConfig.asObservable();
  private systemStatusSubject = new ReplaySubject<TestrunStatus>(1);
  public systemStatus$ = this.systemStatusSubject.asObservable();
  private history = new BehaviorSubject<TestrunStatus[]>([]);

  constructor(private http: HttpClient) {
  }

  getDevices(): Observable<Device[]> {
    return this.devices;
  }

  setDevices(devices: Device[]): void {
    this.devices.next(devices);
  }

  setSystemConfig(config: SystemConfig): void {
    this._systemConfig.next(config);
  }

  setSystemStatus(status: TestrunStatus): void {
    this.systemStatusSubject.next(status);
  }

  fetchDevices(): void {
    this.http.get<any>(`${API_URL}/devices`).subscribe((devices: Device[]) => {
      this.setDevices(devices);
    });
  }

  getSystemConfig(): Observable<SystemConfig> {
    return this.http
      .get<SystemConfig>(`${API_URL}/system/config`)
      .pipe(retry(1))
  }

  createSystemConfig(data: SystemConfig): Observable<any> {
    return this.http
      .post<any>(`${API_URL}/system/config`, data)
      .pipe(retry(1));
  }

  getSystemInterfaces(): Observable<string[]> {
    return this.http
      .get<string[]>(`${API_URL}/system/interfaces`)
      .pipe(retry(1));
  }

  getSystemStatus(): void {
    this.http
      .get<TestrunStatus>(`${API_URL}/system/status`)
      .subscribe((res: TestrunStatus) => {
        this.setSystemStatus(res);
      });
  }

  getTestModules(): TestModule[] {
    return this.testModules;
  }

  saveDevice(device: Device): Observable<boolean> {
    return this.http
      .post<boolean>(`${API_URL}/device`, JSON.stringify(device))
      .pipe(retry(1), map(() => true));
  }

  hasDevice(macAddress: string): boolean {
    return this.devices.value.some(device => device.mac_addr === macAddress.trim());
  }

  addDevice(device: Device): void {
    this.devices.next(this.devices.value.concat([device]));
  }

  updateDevice(deviceToUpdate: Device, update: Device): void {
    const device = this.devices.value.find(device => update.mac_addr === device.mac_addr)!;
    device.model = update.model
    device.manufacturer = update.manufacturer
    device.test_modules = update.test_modules;

    this.devices.next(this.devices.value);
  }

  fetchHistory(): void {
    this.http
      .get<TestrunStatus[]>(`${API_URL}/history`)
      .pipe(retry(1))
      .subscribe(data => {
        this.history.next(data)
      });
  }

  getHistory(): Observable<TestrunStatus[]> {
    return this.history;
  }
}
