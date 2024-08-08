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
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { BypassComponent } from './components/bypass/bypass.component';
import { VersionComponent } from './components/version/version.component';
import { CalloutComponent } from './components/callout/callout.component';
import { StoreModule } from '@ngrx/store';
import { appFeatureKey, rootReducer } from './store/reducers';
import { EffectsModule } from '@ngrx/effects';
import { AppEffects } from './store/effects';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { SettingsDropdownComponent } from './pages/settings/components/settings-dropdown/settings-dropdown.component';
import { ShutdownAppComponent } from './components/shutdown-app/shutdown-app.component';
import { WindowProvider } from './providers/window.provider';
import { CertificatesComponent } from './pages/certificates/certificates.component';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from './services/loaderConfig';
import { WifiComponent } from './components/wifi/wifi.component';

import { MqttModule, IMqttServiceOptions } from 'ngx-mqtt';

export const MQTT_SERVICE_OPTIONS: IMqttServiceOptions = {
  hostname: 'localhost',
  port: 9001,
};

@NgModule({
  declarations: [AppComponent, SettingsComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NoopAnimationsModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonToggleModule,
    MatRadioModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
    SpinnerComponent,
    BypassComponent,
    VersionComponent,
    CalloutComponent,
    StoreModule.forRoot({ [appFeatureKey]: rootReducer }),
    EffectsModule.forRoot([AppEffects]),
    CdkTrapFocus,
    SettingsDropdownComponent,
    ShutdownAppComponent,
    CertificatesComponent,
    MqttModule.forRoot(MQTT_SERVICE_OPTIONS),
    WifiComponent,
  ],
  providers: [
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
  bootstrap: [AppComponent],
})
export class AppModule {}
