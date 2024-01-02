/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Device, TestModule } from '../model/device';
import { map, ReplaySubject, retry } from 'rxjs';
import { SystemConfig } from '../model/setting';
import {
  StatusOfTestResult,
  StatusOfTestrun,
  StatusResultClassName,
  TestrunStatus,
} from '../model/testrun-status';
import { Version } from '../model/version';

const API_URL = 'http://localhost:8000';

@Injectable({
  providedIn: 'root',
})
export class TestRunService {
  private readonly testModules: TestModule[] = [
    {
      displayName: 'Connection',
      name: 'connection',
      enabled: true,
    },
    {
      displayName: 'NTP',
      name: 'ntp',
      enabled: true,
    },
    {
      displayName: 'DNS',
      name: 'dns',
      enabled: true,
    },
    {
      displayName: 'Services',
      name: 'nmap',
      enabled: true,
    },
    {
      displayName: 'Security',
      name: 'security',
      enabled: true,
    },
    {
      displayName: 'TLS',
      name: 'tls',
      enabled: true,
    },
  ];

  private devices = new BehaviorSubject<Device[] | null>(null);
  private isOpenAddDeviceSub$ = new BehaviorSubject<boolean>(false);
  public isOpenAddDevice$ = this.isOpenAddDeviceSub$.asObservable();
  private _systemConfig = new BehaviorSubject<SystemConfig | null>(null);
  public systemConfig$ = this._systemConfig.asObservable();
  private systemStatusSubject = new ReplaySubject<TestrunStatus>(1);
  public systemStatus$ = this.systemStatusSubject.asObservable();
  private isTestrunStartedSub$ = new BehaviorSubject<boolean>(false);
  public isTestrunStarted$ = this.isTestrunStartedSub$.asObservable();
  private hasConnectionSettingSub$ = new BehaviorSubject<boolean | null>(null);
  public hasConnectionSetting$ = this.hasConnectionSettingSub$.asObservable();
  private history = new BehaviorSubject<TestrunStatus[] | null>(null);
  private version = new BehaviorSubject<Version | null>(null);

  constructor(private http: HttpClient) {}

  setIsOpenAddDevice(isOpen: boolean): void {
    this.isOpenAddDeviceSub$.next(isOpen);
  }

  setHasConnectionSetting(hasSetting: boolean): void {
    this.hasConnectionSettingSub$.next(hasSetting);
  }
  getDevices(): BehaviorSubject<Device[] | null> {
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
    this.http
      .get<Device[]>(`${API_URL}/devices`)
      .subscribe((devices: Device[]) => {
        this.setDevices(devices);
      });
  }

  getSystemConfig(): Observable<SystemConfig> {
    return this.http.get<SystemConfig>(`${API_URL}/system/config`);
  }

  createSystemConfig(data: SystemConfig): Observable<SystemConfig> {
    return this.http
      .post<SystemConfig>(`${API_URL}/system/config`, data)
      .pipe(retry(1));
  }

  getSystemInterfaces(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/system/interfaces`);
  }

  /**
   * Gets system status.
   * Status Cancelling exist only on FE. Every status except Cancelled
   * should be overriden with Cancelling value during cancelling process
   * @param isCancelling - indicates if status should be overridden with Cancelling value
   */
  getSystemStatus(isCancelling?: boolean): void {
    this.http
      .get<TestrunStatus>(`${API_URL}/system/status`)
      .subscribe((res: TestrunStatus) => {
        if (isCancelling && res.status !== StatusOfTestrun.Cancelled) {
          res.status = StatusOfTestrun.Cancelling;
        }
        this.setSystemStatus(res);
      });
  }

  stopTestrun(): Observable<boolean> {
    return this.http
      .post<{ success: string }>(`${API_URL}/system/stop`, {})
      .pipe(map(() => true));
  }

  getTestModules(): TestModule[] {
    return this.testModules;
  }

  saveDevice(device: Device): Observable<boolean> {
    return this.http
      .post<boolean>(`${API_URL}/device`, JSON.stringify(device))
      .pipe(map(() => true));
  }

  deleteDevice(device: Device): Observable<boolean> {
    return this.http
      .delete<boolean>(`${API_URL}/device`, {
        body: JSON.stringify(device),
      })
      .pipe(map(() => true));
  }

  hasDevice(macAddress: string): boolean {
    return (
      this.devices.value?.some(
        device => device.mac_addr === macAddress.trim()
      ) || false
    );
  }

  addDevice(device: Device): void {
    this.devices.next(
      this.devices.value ? this.devices.value.concat([device]) : [device]
    );
  }

  updateDevice(deviceToUpdate: Device, update: Device): void {
    const device = this.devices.value?.find(
      device => update.mac_addr === device.mac_addr
    );
    if (device) {
      device.model = update.model;
      device.manufacturer = update.manufacturer;
      device.test_modules = update.test_modules;

      this.devices.next(this.devices.value);
    }
  }

  removeDevice(deviceToDelete: Device): void {
    const idx = this.devices.value?.findIndex(
      device => deviceToDelete.mac_addr === device.mac_addr
    );
    if (typeof idx === 'number') {
      this.devices.value?.splice(idx, 1);
      this.devices.next(this.devices.value);
    }
  }

  fetchHistory(): void {
    this.http
      .get<TestrunStatus[]>(`${API_URL}/reports`)
      .pipe(retry(1))
      .subscribe(data => {
        this.history.next(data);
      });
  }

  getHistory(): BehaviorSubject<TestrunStatus[] | null> {
    return this.history;
  }

  public getResultClass(result: string): StatusResultClassName {
    return {
      green: result === StatusOfTestResult.Compliant,
      red:
        result === StatusOfTestResult.NonCompliant ||
        result === StatusOfTestResult.Error,
      blue:
        result === StatusOfTestResult.SmartReady ||
        result === StatusOfTestResult.Info,
      grey:
        result === StatusOfTestResult.Skipped ||
        result === StatusOfTestResult.NotStarted,
    };
  }

  startTestrun(device: Device): Observable<boolean> {
    this.isTestrunStartedSub$.next(true);

    return this.http
      .post<TestrunStatus>(
        `${API_URL}/system/start`,
        JSON.stringify({ device })
      )
      .pipe(map(() => true));
  }

  getVersion(): BehaviorSubject<Version | null> {
    return this.version;
  }

  fetchVersion(): void {
    this.http
      .get<Version>(`${API_URL}/system/version`)
      .pipe(retry(1))
      .subscribe(version => {
        this.version.next(version);
      });
  }

  deleteReport(mac_addr: string, started: string): Observable<boolean> {
    return this.http
      .delete<boolean>(`${API_URL}/report`, {
        body: JSON.stringify({ mac_addr, timestamp: started }),
      })
      .pipe(map(() => true));
  }

  removeReport(mac_addr: string, started: string): void {
    const idx = this.history.value?.findIndex(
      report =>
        report.device.mac_addr === mac_addr && report.started === started
    );
    if (typeof idx === 'number') {
      this.history.value?.splice(idx, 1);
      this.history.next(this.history.value);
    }
  }
}
