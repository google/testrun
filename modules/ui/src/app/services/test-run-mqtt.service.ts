import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IMqttMessage, MqttConnectionState, MqttService } from 'ngx-mqtt';
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  filter,
  merge,
  Observable,
  of,
  tap,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { Adapters } from '../model/setting';
import { TestrunStatus } from '../model/testrun-status';
import { Info, InternetConnection, Topic } from '../model/topic';
import { TestRunService } from './test-run.service';

@Injectable({
  providedIn: 'root',
})
export class TestRunMqttService {
  private mqttService = inject(MqttService);
  private testrunService = inject(TestRunService);
  private destroyRef = inject(DestroyRef);

  /**
   * Confirmed health of the MQTT connection.
   *
   * Starts optimistic (`true`) and is only flipped to `false` once the broker
   * connection is confirmed lost (CLOSED / offline / error). The transient
   * CONNECTING state is intentionally ignored so that the initial handshake on
   * app start-up (e.g. a page reload during an active test) is not reported as
   * a connection loss.
   */
  private connectionState$ = new BehaviorSubject<boolean>(true);
  /** Latest raw client state (ngx-mqtt exposes `state` as a plain Subject). */
  private currentState = MqttConnectionState.CLOSED;

  constructor() {
    this.initConnectionTracking();
  }

  private initConnectionTracking(): void {
    this.mqttService.state
      .pipe(
        tap(state => (this.currentState = state)),
        filter(state => state !== MqttConnectionState.CONNECTING),
        map(state => state === MqttConnectionState.CONNECTED),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(isConnected => this.connectionState$.next(isConnected));

    merge(this.mqttService.onOffline, this.mqttService.onError)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.connectionState$.next(false));
  }

  /**
   * Whether the MQTT client is connected to the broker right now.
   * Used as a pre-flight check before starting a testrun.
   */
  isConnected(): boolean {
    return this.currentState === MqttConnectionState.CONNECTED;
  }

  /**
   * Emits `false` when the MQTT connection is confirmed lost and `true` once
   * it is (re-)established. Used to detect a drop during an active testrun.
   */
  getConnectionState(): Observable<boolean> {
    return this.connectionState$.pipe(distinctUntilChanged());
  }

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
        result.export = this.testrunService.changeReportURL(result.export);
        return result;
      })
    );
  }

  getInfo(): Observable<Info> {
    return this.topic<Info>(Topic.Info);
  }

  private topic<Type>(topicName: string): Observable<Type> {
    return this.mqttService.observe(topicName).pipe(
      map(
        (res: IMqttMessage) =>
          JSON.parse(new TextDecoder().decode(res.payload)) as Type
      ),
      catchError(() => {
        this.connectionState$.next(false);
        return of({} as Type);
      })
    );
  }
}
