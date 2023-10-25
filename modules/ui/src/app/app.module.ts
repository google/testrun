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
<<<<<<< HEAD
import {HttpClientModule} from '@angular/common/http';
=======
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
>>>>>>> dev
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatRadioModule} from '@angular/material/radio';
import {BrowserModule} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {GeneralSettingsComponent} from './components/general-settings/general-settings.component';
import {ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSnackBarModule} from '@angular/material/snack-bar';
<<<<<<< HEAD
=======
import {ErrorInterceptor} from './interceptors/error.interceptor';
import {LoadingInterceptor} from './interceptors/loading.interceptor';
import {SpinnerComponent} from './components/spinner/spinner.component';
>>>>>>> dev

@NgModule({
  declarations: [AppComponent, GeneralSettingsComponent],
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
    HttpClientModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
<<<<<<< HEAD
  ],
  providers: [],
=======
    SpinnerComponent,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true
    },
    {
      provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true
    }
  ],
>>>>>>> dev
  bootstrap: [AppComponent]
})
export class AppModule {
}
