import { TestBed } from '@angular/core/testing';

import { TestRunMqttService } from './test-run-mqtt.service';
import { IMqttMessage, MqttService } from 'ngx-mqtt';
import SpyObj = jasmine.SpyObj;
import { of } from 'rxjs';
import { MOCK_ADAPTERS } from '../mocks/settings.mock';
import { Topic } from '../model/topic';
import { MOCK_INTERNET } from '../mocks/topic.mock';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/testrun.mock';
import { TestRunService } from './test-run.service';

describe('TestRunMqttService', () => {
  let service: TestRunMqttService;
  let mockService: SpyObj<MqttService>;
  let testRunServiceMock: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['observe']);
    testRunServiceMock = jasmine.createSpyObj(['changeReportURL']);

    TestBed.configureTestingModule({
      providers: [
        { provide: MqttService, useValue: mockService },
        { provide: TestRunService, useValue: testRunServiceMock },
      ],
    });
    service = TestBed.inject(TestRunMqttService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNetworkAdapters', () => {
    beforeEach(() => {
      mockService.observe.and.returnValue(of(getResponse(MOCK_ADAPTERS)));
    });

    it('should subscribe the topic', done => {
      service.getNetworkAdapters().subscribe(() => {
        expect(mockService.observe).toHaveBeenCalledWith(Topic.NetworkAdapters);
        done();
      });
    });

    it('should return object of type', done => {
      service.getNetworkAdapters().subscribe(res => {
        expect(res).toEqual(MOCK_ADAPTERS);
        done();
      });
    });
  });

  describe('getInternetConnection', () => {
    beforeEach(() => {
      mockService.observe.and.returnValue(of(getResponse(MOCK_INTERNET)));
    });

    it('should subscribe the topic', done => {
      service.getInternetConnection().subscribe(() => {
        expect(mockService.observe).toHaveBeenCalledWith(
          Topic.InternetConnection
        );
        done();
      });
    });

    it('should return object of type', done => {
      service.getInternetConnection().subscribe(res => {
        expect(res).toEqual(MOCK_INTERNET);
        done();
      });
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      mockService.observe.and.returnValue(
        of(getResponse(MOCK_PROGRESS_DATA_IN_PROGRESS))
      );
      testRunServiceMock.changeReportURL.and.returnValue('');
    });

    it('should subscribe the topic', done => {
      service.getStatus().subscribe(() => {
        expect(mockService.observe).toHaveBeenCalledWith(Topic.Status);
        done();
      });
    });

    it('should return object of type', done => {
      service.getStatus().subscribe(res => {
        expect(res).toEqual(MOCK_PROGRESS_DATA_IN_PROGRESS);
        done();
      });
    });
  });

  function getResponse<Type>(response: Type): IMqttMessage {
    const enc = new TextEncoder();
    const message = enc.encode(JSON.stringify(response));
    return {
      payload: message,
    } as IMqttMessage;
  }
});
