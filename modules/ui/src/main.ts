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
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { IMqttServiceOptions } from 'ngx-mqtt/lib/mqtt.model';
import { importProvidersFrom } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { AppEffects } from './app/store/effects';
import { MqttModule } from 'ngx-mqtt';
import { StoreModule } from '@ngrx/store';
import { appFeatureKey, rootReducer } from './app/store/reducers';
import { MatNativeDateModule } from '@angular/material/core';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  provideHttpClient,
} from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { WindowProvider } from './app/providers/window.provider';
import { ErrorInterceptor } from './app/interceptors/error.interceptor';
import { LoadingInterceptor } from './app/interceptors/loading.interceptor';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from './app/services/loaderConfig';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const MQTT_SERVICE_OPTIONS: IMqttServiceOptions = {
  hostname: window.location.hostname,
  port: 9001,
};

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      NoopAnimationsModule,
      RouterModule.forRoot(routes, { useHash: true }),
      StoreModule.forRoot({ [appFeatureKey]: rootReducer }),
      EffectsModule.forRoot([AppEffects]),
      MqttModule.forRoot(MQTT_SERVICE_OPTIONS),
      MatNativeDateModule,
      HttpClientModule
    ),
    provideHttpClient(),
    WindowProvider,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true,
    },
    { provide: LOADER_TIMEOUT_CONFIG_TOKEN, useValue: 1000 },
  ],
});
