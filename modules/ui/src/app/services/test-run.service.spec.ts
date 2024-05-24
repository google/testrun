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
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import { Device, TestModule } from '../model/device';

import { TestRunService, UNAVAILABLE_VERSION } from './test-run.service';
import { SystemConfig, SystemInterfaces } from '../model/setting';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/progress.mock';
import {
  StatusOfTestResult,
  StatusOfTestrun,
  TestrunStatus,
} from '../model/testrun-status';
import { device } from '../mocks/device.mock';
import { NEW_VERSION, VERSION } from '../mocks/version.mock';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../store/state';
import { Certificate } from '../model/certificate';
import { certificate } from '../mocks/certificate.mock';
import { PROFILE_MOCK } from '../mocks/profile.mock';

const MOCK_SYSTEM_CONFIG: SystemConfig = {
  network: {
    device_intf: 'mockDeviceValue',
    internet_intf: 'mockInternetValue',
  },
};

describe('TestRunService', () => {
  let injector: TestBed;
  let httpTestingController: HttpTestingController;
  let service: TestRunService;
  let store: MockStore<AppState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestRunService, provideMockStore({})],
    });
    injector = getTestBed();
    httpTestingController = injector.get(HttpTestingController);
    service = injector.get(TestRunService);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have test modules', () => {
    expect(service.getTestModules()).toEqual([
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
    ] as TestModule[]);
  });

  it('fetchDevices should return devices', () => {
    let result: Device[] = [];
    const deviceArray = [device] as Device[];

    service.fetchDevices().subscribe(res => {
      expect(res).toEqual(result);
    });

    result = deviceArray;
    service.fetchDevices();
    const req = httpTestingController.expectOne(
      'http://localhost:8000/devices'
    );

    expect(req.request.method).toBe('GET');

    req.flush(deviceArray);
  });

  it('getSystemConfig should return systemConfig data', () => {
    const apiUrl = 'http://localhost:8000/system/config';

    service.getSystemConfig().subscribe(res => {
      expect(res).toEqual(MOCK_SYSTEM_CONFIG);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_SYSTEM_CONFIG);
  });

  it('createSystemConfig should call systemConfig data', () => {
    const apiUrl = 'http://localhost:8000/system/config';

    service.createSystemConfig(MOCK_SYSTEM_CONFIG).subscribe(res => {
      expect(res).toEqual(MOCK_SYSTEM_CONFIG);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(MOCK_SYSTEM_CONFIG);
    req.flush(MOCK_SYSTEM_CONFIG);
  });

  it('getSystemInterfaces should return array of interfaces', () => {
    const apiUrl = 'http://localhost:8000/system/interfaces';
    const mockSystemInterfaces: SystemInterfaces = {
      mockValue1: 'mockValue1',
      mockValue2: 'mockValue2',
    };

    service.getSystemInterfaces().subscribe(res => {
      expect(res).toEqual(mockSystemInterfaces);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockSystemInterfaces);
  });

  describe('fetchSystemStatus', () => {
    it('should get system status data with no changes', () => {
      const result = { ...MOCK_PROGRESS_DATA_IN_PROGRESS };

      service.fetchSystemStatus().subscribe(res => {
        expect(res).toEqual(result);
      });

      const req = httpTestingController.expectOne(
        'http://localhost:8000/system/status'
      );
      expect(req.request.method).toBe('GET');
      req.flush(result);
    });
  });

  it('stopTestrun should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/system/stop';

    service.stopTestrun().subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('#shutdownTestrun should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/system/shutdown';

    service.shutdownTestrun().subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  describe('#startTestRun', () => {
    it('should have necessary request data', () => {
      const apiUrl = 'http://localhost:8000/system/start';

      service.startTestrun(device).subscribe(res => {
        expect(res).toEqual(true);
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(JSON.stringify({ device }));
      req.flush({});
    });
  });

  describe('getHistory', () => {
    it('should return reports', () => {
      let result: TestrunStatus[] | null = null;

      const reports = [
        {
          status: 'Completed',
          device: device,
          report: 'https://api.testrun.io/report.pdf',
          started: '2023-06-22T10:11:00.123Z',
          finished: '2023-06-22T10:17:00.123Z',
        },
      ] as TestrunStatus[];

      service.getHistory().subscribe(res => {
        expect(res).toEqual(result);
      });

      result = reports;
      service.getHistory();
      const req = httpTestingController.expectOne(
        'http://localhost:8000/reports'
      );

      expect(req.request.method).toBe('GET');

      req.flush(reports);
    });
  });

  describe('#getResultClass', () => {
    const availableResultClasses = {
      green: false,
      red: false,
      blue: false,
      grey: false,
    };

    const statusesForGreenRes = [
      StatusOfTestResult.Compliant,
      StatusOfTestResult.CompliantLimited,
      StatusOfTestResult.CompliantHigh,
    ];

    const statusesForBlueRes = [
      StatusOfTestResult.SmartReady,
      StatusOfTestResult.Info,
      StatusOfTestResult.InProgress,
    ];

    const statusesForRedRes = [
      StatusOfTestResult.NonCompliant,
      StatusOfTestResult.Error,
    ];

    const statusesForGreyRes = [
      StatusOfTestResult.NotDetected,
      StatusOfTestResult.NotStarted,
    ];

    statusesForGreenRes.forEach(testCase => {
      it(`should return class "green" if test result is "${testCase}"`, () => {
        const expectedResult = { ...availableResultClasses, green: true };

        const result = service.getResultClass(testCase);

        expect(result).toEqual(expectedResult);
      });
    });

    statusesForBlueRes.forEach(testCase => {
      it(`should return class "blue" if test result is "${testCase}"`, () => {
        const expectedResult = { ...availableResultClasses, blue: true };

        const result = service.getResultClass(testCase);

        expect(result).toEqual(expectedResult);
      });
    });

    statusesForRedRes.forEach(testCase => {
      it(`should return class "red" if test result is "${testCase}"`, () => {
        const expectedResult = { ...availableResultClasses, red: true };

        const result = service.getResultClass(testCase);

        expect(result).toEqual(expectedResult);
      });
    });

    statusesForGreyRes.forEach(testCase => {
      it(`should return class "grey" if test result is "${testCase}"`, () => {
        const expectedResult = { ...availableResultClasses, grey: true };

        const result = service.getResultClass(testCase);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('#testrunInProgress', () => {
    const resultsInProgress = [
      StatusOfTestrun.InProgress,
      StatusOfTestrun.WaitingForDevice,
      StatusOfTestrun.Monitoring,
    ];

    const resultsNotInProgress = [
      StatusOfTestrun.Idle,
      StatusOfTestrun.Cancelled,
      StatusOfTestrun.Compliant,
      StatusOfTestrun.NonCompliant,
    ];

    resultsInProgress.forEach(testCase => {
      it(`should return true if testrun result is "${testCase}"`, () => {
        const result = service.testrunInProgress(testCase);

        expect(result).toBeTrue();
      });
    });

    resultsNotInProgress.forEach(testCase => {
      it(`should return false if testrun result is "${testCase}"`, () => {
        const result = service.testrunInProgress(testCase);

        expect(result).toBeFalse();
      });
    });
  });

  it('deleteDevice should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/device';

    service.deleteDevice(device).subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual(JSON.stringify(device));
    req.flush({});
  });

  describe('#fetchVersion', () => {
    it('should get system version', () => {
      const version = VERSION;

      service.fetchVersion();
      const req = httpTestingController.expectOne(
        'http://localhost:8000/system/version'
      );
      expect(req.request.method).toBe('GET');
      req.flush(version);

      service.getVersion().subscribe(res => {
        expect(res).toEqual(version);
      });
    });

    it('should return old version when error happens', () => {
      const version = NEW_VERSION;
      const mockErrorResponse = { status: 500, statusText: 'Error' };
      const data = 'Invalid request parameters';
      service.getVersion().next(version);
      service.fetchVersion();
      const req = httpTestingController.expectOne(
        'http://localhost:8000/system/version'
      );
      expect(req.request.method).toBe('GET');
      req.flush(data, mockErrorResponse);

      service.getVersion().subscribe(res => {
        expect(res).toEqual(version);
      });
    });

    it('should return default version when error happens and there is no previous version', () => {
      const mockErrorResponse = { status: 500, statusText: 'Error' };
      const data = 'Invalid request parameters';
      service.fetchVersion();
      const req = httpTestingController.expectOne(
        'http://localhost:8000/system/version'
      );
      expect(req.request.method).toBe('GET');
      req.flush(data, mockErrorResponse);

      service.getVersion().subscribe(res => {
        expect(res).toEqual(UNAVAILABLE_VERSION);
      });
    });
  });

  it('deleteReport should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/report';

    service.deleteReport(device.mac_addr, '').subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual(
      JSON.stringify({
        mac_addr: device.mac_addr,
        timestamp: '',
      })
    );
    req.flush({});
  });

  it('deleteReport should return false when error happens', () => {
    const apiUrl = 'http://localhost:8000/report';

    service.deleteReport(device.mac_addr, '').subscribe(res => {
      expect(res).toEqual(false);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual(
      JSON.stringify({
        mac_addr: device.mac_addr,
        timestamp: '',
      })
    );
    req.error(new ErrorEvent(''));
  });

  it('#saveDevice should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/device';

    service.saveDevice(device).subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(JSON.stringify(device));
    req.flush(true);
  });

  it('#editDevice should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/device/edit';

    service.editDevice(device, '01:01:01:01:01:01').subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(
      JSON.stringify({ mac_addr: '01:01:01:01:01:01', device })
    );
    req.flush(true);
  });

  it('fetchProfiles should return profiles', () => {
    service.fetchProfiles().subscribe(res => {
      expect(res).toEqual([PROFILE_MOCK]);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/profiles'
    );

    expect(req.request.method).toBe('GET');

    req.flush([PROFILE_MOCK]);
  });

  it('deleteProfile should delete profile', () => {
    service.deleteProfile('test').subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/profiles'
    );

    expect(req.request.method).toBe('DELETE');

    req.flush(true);
  });

  it('deleteProfile should return false when error happens', () => {
    service.deleteProfile('test').subscribe(res => {
      expect(res).toEqual(false);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/profiles'
    );

    expect(req.request.method).toBe('DELETE');

    req.error(new ErrorEvent(''));
  });

  it('fetchCertificates should return certificates', () => {
    const certificates = [certificate] as Certificate[];

    service.fetchCertificates().subscribe(res => {
      expect(res).toEqual(certificates);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/system/config/certs'
    );

    expect(req.request.method).toBe('GET');

    req.flush(certificates);
  });

  it('uploadCertificates should upload certificate', () => {
    service.uploadCertificate(new File([], 'test')).subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/system/config/certs'
    );

    expect(req.request.method).toBe('POST');

    req.flush(true);
  });

  it('deleteCertificate should delete certificate', () => {
    service.deleteCertificate('test').subscribe(res => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/system/config/certs'
    );

    expect(req.request.method).toBe('DELETE');

    req.flush(true);
  });

  it('deleteCertificate should return false when error happens', () => {
    service.deleteCertificate('test').subscribe(res => {
      expect(res).toEqual(false);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/system/config/certs'
    );

    expect(req.request.method).toBe('DELETE');

    req.error(new ErrorEvent(''));
  });
});
