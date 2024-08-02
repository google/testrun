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
import { catchError, map, of, retry } from 'rxjs';
import { SystemConfig, SystemInterfaces } from '../model/setting';
import {
  StatusOfTestResult,
  StatusOfTestrun,
  StatusResultClassName,
  TestrunStatus,
} from '../model/testrun-status';
import { Version } from '../model/version';
import { Certificate } from '../model/certificate';
import {
  Profile,
  ProfileFormat,
  ProfileRisk,
  RiskResultClassName,
} from '../model/profile';

const API_URL = `http://${window.location.hostname}:8000`;
export const SYSTEM_STOP = '/system/stop';

export const UNAVAILABLE_VERSION = {
  installed_version: 'v?.?',
  update_available: false,
  latest_version: 'v?.?',
  latest_version_url: '',
};

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
      name: 'services',
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

  private version = new BehaviorSubject<Version | null>(null);

  constructor(private http: HttpClient) {}

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

  fetchSystemStatus() {
    return this.http.get<TestrunStatus>(`${API_URL}/system/status`);
  }

  stopTestrun(): Observable<boolean> {
    return this.http
      .post<{ success: string }>(`${API_URL}${SYSTEM_STOP}`, {})
      .pipe(
        catchError(() => of(false)),
        map(res => !!res)
      );
  }

  shutdownTestrun(): Observable<boolean> {
    return this.http
      .post<{ success: string }>(`${API_URL}/system/shutdown`, {})
      .pipe(map(() => true));
  }

  getTestModules(): Observable<string[]> {
    return this.http
      .get<string[]>(`${API_URL}/system/modules`)
      .pipe(catchError(() => of([])));
  }

  saveDevice(device: Device): Observable<boolean> {
    return this.http
      .post<boolean>(`${API_URL}/device`, JSON.stringify(device))
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
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
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }
  deleteDevice(device: Device): Observable<boolean> {
    return this.http
      .delete<boolean>(`${API_URL}/device`, {
        body: JSON.stringify(device),
      })
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
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
        result === StatusOfTestResult.NotDetected ||
        result === StatusOfTestResult.NotStarted,
    };
  }

  getRiskClass(riskResult: string): RiskResultClassName {
    return {
      red: riskResult === ProfileRisk.HIGH,
      cyan: riskResult === ProfileRisk.LIMITED,
    };
  }

  testrunInProgress(status?: string | null): boolean {
    return (
      status === StatusOfTestrun.InProgress ||
      status === StatusOfTestrun.WaitingForDevice ||
      status === StatusOfTestrun.Monitoring
    );
  }

  startTestrun(device: Device): Observable<TestrunStatus> {
    return this.http.post<TestrunStatus>(
      `${API_URL}/system/start`,
      JSON.stringify({ device })
    );
  }

  getVersion(): BehaviorSubject<Version | null> {
    return this.version;
  }

  fetchVersion(): void {
    this.http
      .get<Version>(`${API_URL}/system/version`)
      .pipe(
        catchError(() => {
          const previousVersion = this.version.value?.installed_version
            ? this.version.value
            : UNAVAILABLE_VERSION;
          return of(previousVersion);
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
      .pipe(
        catchError(() => of(false)),
        map(res => !!res)
      );
  }

  fetchProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${API_URL}/profiles`);
  }

  deleteProfile(name: string): Observable<boolean> {
    return this.http
      .delete<boolean>(`${API_URL}/profiles`, {
        body: JSON.stringify({ name }),
      })
      .pipe(
        catchError(() => of(false)),
        map(res => !!res)
      );
  }

  fetchCertificates(): Observable<Certificate[]> {
    return this.http.get<Certificate[]>(`${API_URL}/system/config/certs`);
  }

  deleteCertificate(name: string): Observable<boolean> {
    return this.http
      .delete<boolean>(`${API_URL}/system/config/certs`, {
        body: JSON.stringify({ name }),
      })
      .pipe(
        catchError(() => of(false)),
        map(res => !!res)
      );
  }

  uploadCertificate(file: File): Observable<boolean> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    return this.http
      .post<boolean>(`${API_URL}/system/config/certs`, formData)
      .pipe(map(() => true));
  }

  downloadZip(url: string, profile: string) {
    this.http
      .post(url, JSON.stringify({ profile }), {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe(response => {
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = contentDisposition?.split(';')[1].trim().split('=')[1];
        fileName = fileName?.replace(/"/g, '');

        const blob = new Blob([response.body as BlobPart], {
          type: 'application/zip',
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.target = '_blank';
        link.download = fileName ?? 'report.zip';
        link.dispatchEvent(new MouseEvent('click'));
      });
  }

  fetchProfilesFormat(): Observable<ProfileFormat[]> {
    return this.http.get<ProfileFormat[]>(`${API_URL}/profiles/format`);
  }

  saveProfile(profile: Profile): Observable<boolean> {
    return this.http
      .post<boolean>(`${API_URL}/profiles`, JSON.stringify(profile))
      .pipe(
        catchError(() => of(false)),
        map(res => !!res)
      );
  }
}
