import { TestBed } from '@angular/core/testing';

import { TestRunMqttService } from './test-run-mqtt.service';
import { IMqttMessage, MqttConnectionState, MqttService } from 'ngx-mqtt';
import SpyObj = jasmine.SpyObj;
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { MOCK_ADAPTERS } from '../mocks/settings.mock';
import { Topic } from '../model/topic';
import { MOCK_INFO, MOCK_INTERNET } from '../mocks/topic.mock';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/testrun.mock';
import { TestRunService } from './test-run.service';

describe('TestRunMqttService', () => {
  let service: TestRunMqttService;
  let mockService: SpyObj<MqttService>;
  let testRunServiceMock: SpyObj<TestRunService>;
  let stateSubject: BehaviorSubject<MqttConnectionState>;
  let onOffline: Subject<void>;
  let onError: Subject<Error>;

  beforeEach(() => {
    stateSubject = new BehaviorSubject<MqttConnectionState>(
      MqttConnectionState.CONNECTED
    );
    onOffline = new Subject<void>();
    onError = new Subject<Error>();
    mockService = jasmine.createSpyObj(['observe'], {
      state: stateSubject,
      onOffline,
      onError,
    });
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

  describe('connection state tracking', () => {
    let connectionStates: boolean[];

    beforeEach(() => {
      connectionStates = [];
      service
        .getConnectionState()
        .subscribe(isConnected => connectionStates.push(isConnected));
    });

    it('should report connected when MqttConnectionState is CONNECTED', () => {
      stateSubject.next(MqttConnectionState.CONNECTED);

      expect(service.isConnected()).toBeTrue();
      expect(connectionStates).toEqual([true]);
    });

    it('should report connection loss when MqttConnectionState is CLOSED', () => {
      stateSubject.next(MqttConnectionState.CLOSED);

      expect(service.isConnected()).toBeFalse();
      expect(connectionStates).toEqual([true, false]);
    });

    it('should not report connection loss while CONNECTING (initial handshake / reconnect)', () => {
      stateSubject.next(MqttConnectionState.CONNECTING);

      expect(service.isConnected()).toBeFalse();
      expect(connectionStates).toEqual([true]);
    });

    it('should report connection loss on offline event', () => {
      onOffline.next();

      expect(connectionStates).toEqual([true, false]);
    });

    it('should report connection loss on error event', () => {
      onError.next(new Error('broker error'));

      expect(connectionStates).toEqual([true, false]);
    });

    it('should report connection loss when a topic subscription fails', () => {
      mockService.observe.and.returnValue(
        throwError(() => new Error('subscription failed'))
      );

      service.getStatus().subscribe();

      expect(connectionStates).toEqual([true, false]);
    });

    it('should report connected again once the broker reconnects', () => {
      stateSubject.next(MqttConnectionState.CLOSED);
      stateSubject.next(MqttConnectionState.CONNECTING);
      stateSubject.next(MqttConnectionState.CONNECTED);

      expect(service.isConnected()).toBeTrue();
      expect(connectionStates).toEqual([true, false, true]);
    });
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

  describe('getInfo', () => {
    beforeEach(() => {
      mockService.observe.and.returnValue(of(getResponse(MOCK_INFO)));
    });

    it('should subscribe the topic', done => {
      service.getInfo().subscribe(() => {
        expect(mockService.observe).toHaveBeenCalledWith(Topic.Info);
        done();
      });
    });

    it('should return object of type', done => {
      service.getInfo().subscribe(res => {
        expect(res).toEqual(MOCK_INFO);
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
