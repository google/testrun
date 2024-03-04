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
import { catchError, map, of, ReplaySubject, retry } from 'rxjs';
import { SystemConfig, SystemInterfaces } from '../model/setting';
import {
  StatusOfTestResult,
  StatusOfTestrun,
  StatusResultClassName,
  TestrunStatus,
} from '../model/testrun-status';
import { Version } from '../model/version';

const API_URL = `http://${window.location.hostname}:8000`;
export const SYSTEM_STOP = '/system/stop';

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
      displayName: 'TLS',
      name: 'tls',
      enabled: true,
    },
    {
      displayName: 'Protocol',
      name: 'protocol',
      enabled: true,
    },
  ];

  private isOpenStartTestrunSub$ = new BehaviorSubject<boolean>(false);
  public isOpenStartTestrun$ = this.isOpenStartTestrunSub$.asObservable();
  private systemStatusSubject = new ReplaySubject<TestrunStatus>(1);
  public systemStatus$ = this.systemStatusSubject.asObservable();
  private isTestrunStartedSub$ = new BehaviorSubject<boolean>(false);
  public isTestrunStarted$ = this.isTestrunStartedSub$.asObservable();
  private version = new BehaviorSubject<Version | null>(null);

  constructor(private http: HttpClient) {}

  setIsOpenStartTestrun(isOpen: boolean): void {
    this.isOpenStartTestrunSub$.next(isOpen);
  }

  setSystemStatus(status: TestrunStatus): void {
    this.systemStatusSubject.next(status);
  }

  fetchDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${API_URL}/devices`);
  }

  getSystemConfig(): Observable<SystemConfig> {
    return this.http.get<SystemConfig>(`${API_URL}/system/config`);
  }

  createSystemConfig(data: SystemConfig): Observable<SystemConfig> {
    return this.http
      .post<SystemConfig>(`${API_URL}/system/config`, data)
      .pipe(retry(1));
  }

  getSystemInterfaces(): Observable<SystemInterfaces> {
    return this.http.get<SystemInterfaces>(`${API_URL}/system/interfaces`);
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
      .post<{ success: string }>(`${API_URL}${SYSTEM_STOP}`, {})
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

  editDevice(device: Device, mac_addr: string): Observable<boolean> {
    type EditDeviceRequest = {
      mac_addr: string; // original mac address
      device: Device;
    };
    const request: EditDeviceRequest = {
      mac_addr,
      device,
    };

    return this.http
      .post<boolean>(`${API_URL}/device/edit`, JSON.stringify(request))
      .pipe(map(() => true));
  }
  deleteDevice(device: Device): Observable<boolean> {
    return this.http
      .delete<boolean>(`${API_URL}/device`, {
        body: JSON.stringify(device),
      })
      .pipe(map(() => true));
  }

  getHistory(): Observable<TestrunStatus[] | null> {
    return this.http.get<TestrunStatus[]>(`${API_URL}/reports`);
  }

  public getResultClass(result: string): StatusResultClassName {
    return {
      green:
        result === StatusOfTestResult.Compliant ||
        result === StatusOfTestResult.CompliantLimited ||
        result === StatusOfTestResult.CompliantHigh,
      red:
        result === StatusOfTestResult.NonCompliant ||
        result === StatusOfTestResult.Error,
      blue:
        result === StatusOfTestResult.SmartReady ||
        result === StatusOfTestResult.Info ||
        result === StatusOfTestResult.InProgress,
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
      .pipe(
        catchError(() => {
          return of(this.version.value);
        })
      )
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
}
