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
import { fakeAsync, getTestBed, TestBed, tick } from '@angular/core/testing';
import { Device, TestModule } from '../model/device';

import { SystemInterfaces, TestRunService } from './test-run.service';
import { SystemConfig } from '../model/setting';
import {
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
} from '../mocks/progress.mock';
import { StatusOfTestResult, TestrunStatus } from '../model/testrun-status';
import { device } from '../mocks/device.mock';
import { VERSION } from '../mocks/version.mock';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestRunService],
    });
    injector = getTestBed();
    httpTestingController = injector.get(HttpTestingController);
    service = injector.get(TestRunService);
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
        name: 'nmap',
        enabled: true,
      },
      {
        displayName: 'TLS',
        name: 'tls',
        enabled: true,
      },
    ] as TestModule[]);
  });

  it('setIsOpenAddDevice should update the isOpenAddDevice$ value', () => {
    service.setIsOpenAddDevice(true);

    service.isOpenAddDevice$.subscribe(value => {
      expect(value).toBe(true);
    });
  });

  it('getDevices should return devices', () => {
    let result: Device[] | null = null;
    const deviceArray = [device] as Device[];

    service.getDevices().subscribe(res => {
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

  it('setSystemConfig should update the systemConfig data', () => {
    service.setSystemConfig(MOCK_SYSTEM_CONFIG);

    service.systemConfig$.subscribe(data => {
      expect(data).toEqual(MOCK_SYSTEM_CONFIG);
    });
  });

  it('setHasConnectionSetting should update the hasConnectionSetting$', () => {
    service.setHasConnectionSetting(true);

    service.hasConnectionSetting$.subscribe(data => {
      expect(data).toEqual(true);
    });
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

  it('hasDevice should return true if device with mac address already exist', fakeAsync(() => {
    const deviceArray = [device] as Device[];
    service.setDevices(deviceArray);
    tick();

    expect(service.hasDevice('00:1e:42:35:73:c4')).toEqual(true);
    expect(service.hasDevice('    00:1e:42:35:73:c4    ')).toEqual(true);
  }));

  describe('getSystemStatus', () => {
    it('should get system status data with no changes', () => {
      const result = { ...MOCK_PROGRESS_DATA_IN_PROGRESS };

      service.systemStatus$.subscribe(res => {
        expect(res).toEqual(result);
      });

      service.getSystemStatus();
      const req = httpTestingController.expectOne(
        'http://localhost:8000/system/status'
      );
      expect(req.request.method).toBe('GET');
      req.flush(result);
    });

    it('should get cancelling data if status is cancelling', () => {
      const result = { ...MOCK_PROGRESS_DATA_IN_PROGRESS };

      service.systemStatus$.subscribe(res => {
        expect(res).toEqual(MOCK_PROGRESS_DATA_CANCELLING);
      });

      service.getSystemStatus(true);
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
      service.fetchHistory();
      const req = httpTestingController.expectOne(
        'http://localhost:8000/reports'
      );

      expect(req.request.method).toBe('GET');

      req.flush(reports);
    });

    it('should return [] when error happens', () => {
      let result: TestrunStatus[] | null = null;

      service.getHistory().subscribe(res => {
        expect(res).toEqual(result);
      });

      result = [];
      service.fetchHistory();
      const req = httpTestingController.expectOne({
        url: 'http://localhost:8000/reports',
      });

      req.flush([], { status: 500, statusText: 'error' });
    });
  });

  describe('#getResultClass', () => {
    it('should return class "green" if test result is "Compliant" or "Smart Ready"', () => {
      const expectedResult = {
        green: true,
        red: false,
        blue: false,
        grey: false,
      };

      const result1 = service.getResultClass(StatusOfTestResult.Compliant);

      expect(result1).toEqual(expectedResult);
    });

    it('should return class "blue" if test result is "Smart Ready" or "Informational"', () => {
      const expectedResult = {
        green: false,
        red: false,
        blue: true,
        grey: false,
      };

      const result1 = service.getResultClass(StatusOfTestResult.SmartReady);
      const result2 = service.getResultClass(StatusOfTestResult.Info);

      expect(result1).toEqual(expectedResult);
      expect(result2).toEqual(expectedResult);
    });

    it('should return class "read" if test result is "Non Compliant" or "Error"', () => {
      const expectedResult = {
        green: false,
        red: true,
        blue: false,
        grey: false,
      };

      const result = service.getResultClass(StatusOfTestResult.NonCompliant);
      const result2 = service.getResultClass(StatusOfTestResult.Error);

      expect(result).toEqual(expectedResult);
      expect(result2).toEqual(expectedResult);
    });

    it('should return class "grey" if test result is "Skipped" or "Not Started"', () => {
      const expectedResult = {
        green: false,
        red: false,
        blue: false,
        grey: true,
      };

      const result1 = service.getResultClass(StatusOfTestResult.Skipped);
      const result2 = service.getResultClass(StatusOfTestResult.NotStarted);

      expect(result1).toEqual(expectedResult);
      expect(result2).toEqual(expectedResult);
    });
  });

  describe('#addDevice', () => {
    it('should create array with new value if previous value is null', function () {
      service.addDevice(device);

      expect(service.getDevices().value).toEqual([device]);
    });

    it('should add new value if previous value is array', function () {
      service.setDevices([device, device]);
      service.addDevice(device);

      expect(service.getDevices().value).toEqual([device, device, device]);
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

  it('removeDevice should remove device from device list', fakeAsync(() => {
    const deviceArray = [device] as Device[];
    service.setDevices(deviceArray);
    tick();
    service.removeDevice(device);

    expect(service.hasDevice('00:1e:42:35:73:c4')).toEqual(false);
  }));

  it('fetchVersion should get system version', () => {
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

  it('removeReport should remove device from history list', fakeAsync(() => {
    const reports = [
      {
        status: 'Completed',
        device: device,
        report: 'https://api.testrun.io/report.pdf',
        started: '2023-06-22T10:11:00.123Z',
        finished: '2023-06-22T10:17:00.123Z',
      },
      {
        status: 'Completed',
        device: device,
        report: 'https://api.testrun.io/report.pdf',
        started: '2023-07-22T10:11:00.123Z',
        finished: '2023-07-22T10:17:00.123Z',
      },
    ] as TestrunStatus[];

    service.getHistory().next(reports);
    tick();
    service.removeReport('00:1e:42:35:73:c4', '2023-06-22T10:11:00.123Z');

    expect(
      service
        .getHistory()
        .value?.some(
          report =>
            report.device.mac_addr === '00:1e:42:35:73:c4' &&
            report.started === '2023-06-22T10:11:00.123Z'
        )
    ).toEqual(false);
  }));

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
});
