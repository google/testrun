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
import { Device } from '../model/device';

import { TestRunService, UNAVAILABLE_VERSION } from './test-run.service';
import { SystemConfig, SystemInterfaces } from '../model/setting';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/testrun.mock';
import {
  StatusOfTestResult,
  StatusOfTestrun,
  TestrunStatus,
} from '../model/testrun-status';
import { device, DEVICES_FORM, MOCK_MODULES } from '../mocks/device.mock';
import { NEW_VERSION, VERSION } from '../mocks/version.mock';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../store/state';
import { Certificate } from '../model/certificate';
import { certificate } from '../mocks/certificate.mock';
import {
  COPY_PROFILE_MOCK,
  NEW_PROFILE_MOCK,
  PROFILE_FORM,
  PROFILE_MOCK,
} from '../mocks/profile.mock';
import { ProfileRisk } from '../model/profile';

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

  it('getTestModules should return modules', () => {
    let result: string[] = [];
    const testModules = MOCK_MODULES;

    service.getTestModules().subscribe(res => {
      expect(res).toEqual(result);
    });

    result = testModules;
    service.getTestModules();
    const req = httpTestingController.expectOne(
      'http://localhost:8000/system/modules'
    );

    expect(req.request.method).toBe('GET');

    req.flush(testModules);
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
    const systemStatusUrl = 'http://localhost:8000/system/status';

    it('should get system status data with no changes', () => {
      const result = { ...MOCK_PROGRESS_DATA_IN_PROGRESS };

      service.fetchSystemStatus().subscribe(res => {
        expect(res).toEqual(result);
      });

      const req = httpTestingController.expectOne(systemStatusUrl);
      expect(req.request.method).toBe('GET');
      req.flush(result);
    });

    it('should get system status as empty object if error happens', () => {
      const mockError = { error: 'someError' } as ErrorEvent;

      service.fetchSystemStatus().subscribe(res => {
        expect(res).toEqual({} as TestrunStatus);
      });

      const req = httpTestingController.expectOne(systemStatusUrl);

      req.error(mockError);
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
        expect(res).toEqual(MOCK_PROGRESS_DATA_IN_PROGRESS);
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(JSON.stringify({ device }));
      req.flush(MOCK_PROGRESS_DATA_IN_PROGRESS);
    });
  });

  describe('getHistory', () => {
    it('should return reports', () => {
      let result: TestrunStatus[] | null = null;

      const reports = [
        {
          status: 'Complete',
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
      cyan: false,
      grey: false,
    };

    const statusesForGreenRes = [
      StatusOfTestResult.Compliant,
      StatusOfTestrun.Proceed,
      StatusOfTestResult.CompliantLimited,
      StatusOfTestResult.CompliantHigh,
    ];

    const statusesForBlueRes = [
      StatusOfTestResult.SmartReady,
      StatusOfTestResult.InProgress,
    ];

    const statusesForCyanRes = [StatusOfTestResult.Info];

    const statusesForRedRes = [
      StatusOfTestResult.NonCompliant,
      StatusOfTestrun.DoNotProceed,
      StatusOfTestResult.Error,
    ];

    const statusesForGreyRes = [
      StatusOfTestResult.NotDetected,
      StatusOfTestResult.NotStarted,
      StatusOfTestResult.Skipped,
      StatusOfTestResult.Disabled,
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

    statusesForCyanRes.forEach(testCase => {
      it(`should return class "cyan" if test result is "${testCase}"`, () => {
        const expectedResult = { ...availableResultClasses, cyan: true };

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

  describe('#getRiskClass', () => {
    it('should return "red" class as true if risk result is "High"', () => {
      const expectedResult = {
        red: true,
        cyan: false,
      };

      const result = service.getRiskClass(ProfileRisk.HIGH);

      expect(result).toEqual(expectedResult);
    });

    it('should return "cyan" class as true if risk result is "Limited"', () => {
      const expectedResult = {
        red: false,
        cyan: true,
      };

      const result = service.getRiskClass(ProfileRisk.LIMITED);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('#testrunInProgress', () => {
    const resultsInProgress = [
      StatusOfTestrun.InProgress,
      StatusOfTestrun.WaitingForDevice,
      StatusOfTestrun.Starting,
      StatusOfTestrun.Monitoring,
      StatusOfTestrun.Validating,
    ];

    const resultsNotInProgress = [
      StatusOfTestrun.Idle,
      StatusOfTestrun.Cancelled,
      StatusOfTestrun.Complete,
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

  it('fetchProfiles should return sorted list of profiles', () => {
    service.fetchProfiles().subscribe(res => {
      expect(res).toEqual([COPY_PROFILE_MOCK, PROFILE_MOCK]);
    });

    const req = httpTestingController.expectOne(
      'http://localhost:8000/profiles'
    );

    expect(req.request.method).toBe('GET');

    req.flush([PROFILE_MOCK, COPY_PROFILE_MOCK]);
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

  it('downloadZip should download zip', fakeAsync(() => {
    // create spy object with a click() method
    const spyObj = jasmine.createSpyObj('a', ['click', 'dispatchEvent']);
    spyOn(document, 'createElement').and.returnValue(spyObj);

    service.downloadZip('localhost:8080/export/test', '');
    const req = httpTestingController.expectOne('localhost:8080/export/test');
    req.flush(new Blob());
    tick();

    expect(req.request.method).toBe('POST');

    expect(document.createElement).toHaveBeenCalledTimes(1);
    expect(document.createElement).toHaveBeenCalledWith('a');

    expect(spyObj.href).toBeDefined();
    expect(spyObj.target).toBe('_blank');
    expect(spyObj.download).toBe('report.zip');
    expect(spyObj.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(spyObj.dispatchEvent).toHaveBeenCalledWith(new MouseEvent('click'));
  }));

  describe('fetchProfilesFormat', () => {
    it('should get system status data with no changes', () => {
      const result = { ...PROFILE_FORM };

      service.fetchProfilesFormat().subscribe(res => {
        expect(res).toEqual(result);
      });

      const req = httpTestingController.expectOne(
        'http://localhost:8000/profiles/format'
      );
      expect(req.request.method).toBe('GET');
      req.flush(result);
    });
  });

  describe('#saveProfile ', () => {
    it('should have necessary request data', () => {
      const apiUrl = 'http://localhost:8000/profiles';

      service.saveProfile(NEW_PROFILE_MOCK).subscribe(res => {
        expect(res).toEqual(true);
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(JSON.stringify(NEW_PROFILE_MOCK));
      req.flush(true);
    });

    it('should return false if error happens', () => {
      const mockErrorResponse = { status: 500, statusText: 'Error' };
      const data = 'Invalid request parameters';
      const apiUrl = 'http://localhost:8000/profiles';

      service.saveProfile(NEW_PROFILE_MOCK).subscribe(res => {
        expect(res).toEqual(false);
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(JSON.stringify(NEW_PROFILE_MOCK));
      req.flush(data, mockErrorResponse);
    });
  });

  describe('fetchQuestionnaireFormat', () => {
    it('should get system status data with no changes', () => {
      const result = { ...DEVICES_FORM };

      service.fetchQuestionnaireFormat().subscribe(res => {
        expect(res).toEqual(result);
      });

      const req = httpTestingController.expectOne(
        'http://localhost:8000/devices/format'
      );
      expect(req.request.method).toBe('GET');
      req.flush(result);
    });
  });
});
