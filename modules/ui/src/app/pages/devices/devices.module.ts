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
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { DevicesRoutingModule } from './devices-routing.module';
import { DevicesComponent } from './devices.component';
import { DeviceItemComponent } from '../../components/device-item/device-item.component';
import { DeviceTestsComponent } from '../../components/device-tests/device-tests.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';

@NgModule({
  declarations: [DevicesComponent],
  imports: [
    CommonModule,
    DevicesRoutingModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    ScrollingModule,
    HttpClientModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatInputModule,
    DeviceItemComponent,
    DeviceTestsComponent,
    SpinnerComponent,
    SimpleDialogComponent,
    NgxMaskDirective,
    NgxMaskPipe,
  ],
  providers: [provideNgxMask()],
})
export class DevicesModule {}
