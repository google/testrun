import { Injectable } from '@angular/core';
import { IMqttMessage, MqttService } from 'ngx-mqtt';
import { catchError, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Adapters } from '../model/setting';
import { TestrunStatus } from '../model/testrun-status';
import { InternetConnection, Topic } from '../model/topic';
import { TestRunService } from './test-run.service';

@Injectable({
  providedIn: 'root',
})
export class TestRunMqttService {
  constructor(
    private mqttService: MqttService,
    private testrunService: TestRunService
  ) {}

  getNetworkAdapters(): Observable<Adapters> {
    return this.topic<Adapters>(Topic.NetworkAdapters);
  }

  getInternetConnection(): Observable<InternetConnection> {
    return this.topic<InternetConnection>(Topic.InternetConnection);
  }

  getStatus(): Observable<TestrunStatus> {
    return this.topic<TestrunStatus>(Topic.Status).pipe(
      map(result => {
        result.report = this.testrunService.changeReportURL(result.report);
        return result;
      })
    );
  }

  private topic<Type>(topicName: string): Observable<Type> {
    return this.mqttService.observe(topicName).pipe(
      map(
        (res: IMqttMessage) =>
          JSON.parse(new TextDecoder().decode(res.payload)) as Type
      ),
      catchError(() => {
        return of({} as Type);
      })
    );
  }
}
