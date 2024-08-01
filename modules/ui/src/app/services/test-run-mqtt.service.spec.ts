import { TestBed } from '@angular/core/testing';

import { TestRunMqttService } from './test-run-mqtt.service';
import { IMqttMessage, MqttModule, MqttService } from 'ngx-mqtt';
import { MQTT_SERVICE_OPTIONS } from '../app.module';
import SpyObj = jasmine.SpyObj;
import { of } from 'rxjs';
import { MOCK_ADAPTERS } from '../mocks/settings.mock';
import { Topic } from '../model/topic';
import { MOCK_INTERNET } from '../mocks/topic.mock';

describe('TestRunMqttService', () => {
  let service: TestRunMqttService;
  let mockService: SpyObj<MqttService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['observe']);

    TestBed.configureTestingModule({
      imports: [MqttModule.forRoot(MQTT_SERVICE_OPTIONS)],
      providers: [{ provide: MqttService, useValue: mockService }],
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

  function getResponse<Type>(response: Type): IMqttMessage {
    const enc = new TextEncoder();
    const message = enc.encode(JSON.stringify(response));
    return {
      payload: message,
    } as IMqttMessage;
  }
});
