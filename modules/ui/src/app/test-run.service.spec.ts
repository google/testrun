import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {fakeAsync, getTestBed, TestBed, tick} from '@angular/core/testing';
import {Device, TestModule} from './model/device';

import {TestRunService} from './test-run.service';
import {SystemConfig} from './model/setting';
import {MOCK_PROGRESS_DATA_IN_PROGRESS} from './mocks/progress.mock';
import {StatusOfTestResult, TestrunStatus} from './model/testrun-status';
import {device} from './mocks/device.mock';

const MOCK_SYSTEM_CONFIG: SystemConfig = {
  network: {
    device_intf: 'mockDeviceValue',
    internet_intf: 'mockInternetValue'
  }
}

describe('TestRunService', () => {
  let injector: TestBed;
  let httpTestingController: HttpTestingController;
  let service: TestRunService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestRunService]
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
    ] as TestModule[]);
  });

  it('getDevices should return devices', () => {
    let result: Device[] | null = null;
    const deviceArray = [device] as Device[];

    service.getDevices().subscribe((res) => {
      expect(res).toEqual(result);
    });

    result = deviceArray;
    service.fetchDevices();
    const req = httpTestingController.expectOne('http://localhost:8000/devices');

    expect(req.request.method).toBe('GET');

    req.flush(deviceArray);
  });

  it('setSystemConfig should update the systemConfig data', () => {
    service.setSystemConfig(MOCK_SYSTEM_CONFIG);

    service.systemConfig$.subscribe(data => {
      expect(data).toEqual(MOCK_SYSTEM_CONFIG);
    })

  })

  it('getSystemConfig should return systemConfig data', () => {
    const apiUrl = 'http://localhost:8000/system/config'

    service.getSystemConfig().subscribe((res) => {
      expect(res).toEqual(MOCK_SYSTEM_CONFIG);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_SYSTEM_CONFIG);
  });

  it('createSystemConfig should call systemConfig data', () => {
    const apiUrl = 'http://localhost:8000/system/config'

    service.createSystemConfig(MOCK_SYSTEM_CONFIG).subscribe((res) => {
      expect(res).toEqual({});
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(MOCK_SYSTEM_CONFIG);
    req.flush({});
  });

  it('getSystemInterfaces should return array of interfaces', () => {
    const apiUrl = 'http://localhost:8000/system/interfaces'
    const mockSystemInterfaces: string[] = ['mockValue', 'mockValue'];

    service.getSystemInterfaces().subscribe((res) => {
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

    expect(service.hasDevice("00:1e:42:35:73:c4")).toEqual(true);
    expect(service.hasDevice("    00:1e:42:35:73:c4    ")).toEqual(true);
  }));

  it('getSystemStatus should get system status data', () => {
    const result = MOCK_PROGRESS_DATA_IN_PROGRESS;

    service.systemStatus$.subscribe((res) => {
      expect(res).toEqual(result);
    });

    service.getSystemStatus();
    const req = httpTestingController.expectOne('http://localhost:8000/system/status');
    expect(req.request.method).toBe('GET');
    req.flush(result);
  });

  it('stopTestrun should have necessary request data', () => {
    const apiUrl = 'http://localhost:8000/system/stop'

    service.stopTestrun().subscribe((res) => {
      expect(res).toEqual(true);
    });

    const req = httpTestingController.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  describe('#startTestRun', () => {
    it('should have necessary request data', () => {
      const apiUrl = 'http://localhost:8000/system/start'

      service.startTestrun(device).subscribe((res) => {
        expect(res).toEqual(true);
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(JSON.stringify({device}));
      req.flush({});
    });

    it('should have error when timeout exceeded', fakeAsync(() => {
      const apiUrl = 'http://localhost:8000/system/start'

      service.startTestrun(device, 1000).subscribe(() => {
      }, (error) => {
        expect(error.toString()).toEqual('Timeout has occurred');
      });

      httpTestingController.expectOne(apiUrl);
      tick(1001);
    }));
  });

  it('getHistory should return history', () => {
    let result: TestrunStatus[] = [];

    const history = [{
      "status": "Completed",
      "device": device,
      "report": "https://api.testrun.io/report.pdf",
      "started": "2023-06-22T10:11:00.123Z",
      "finished": "2023-06-22T10:17:00.123Z",
    }] as TestrunStatus[];

    service.getHistory().subscribe((res) => {
      expect(res).toEqual(result);
    });

    result = history;
    service.fetchHistory();
    const req = httpTestingController.expectOne('http://localhost:8000/history');

    expect(req.request.method).toBe('GET');

    req.flush(history);
  });

  describe('#getResultClass', () => {
    it('should return class "green" if test result is "Compliant" or "Smart Ready"', () => {
      const expectedResult = {
        green: true, red: false, grey: false
      };

      const result1 = service.getResultClass(StatusOfTestResult.Compliant);
      const result2 = service.getResultClass(StatusOfTestResult.SmartReady);

      expect(result1).toEqual(expectedResult);
      expect(result2).toEqual(expectedResult);
    });

    it('should return class "read" if test result is "Non Compliant"', () => {
      const expectedResult = {
        green: false, red: true, grey: false
      };

      const result = service.getResultClass(StatusOfTestResult.NonCompliant);

      expect(result).toEqual(expectedResult);
    });

    it('should return class "grey" if test result is "Skipped" or "Not Started"', () => {
      const expectedResult = {
        green: false, red: false, grey: true
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
});
