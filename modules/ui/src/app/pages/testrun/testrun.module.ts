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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';

import { TestrunRoutingModule } from './testrun-routing.module';
import { TestrunComponent } from './testrun.component';
import { TestrunStatusCardComponent } from './components/testrun-status-card/testrun-status-card.component';
import { TestrunTableComponent } from './components/testrun-table/testrun-table.component';
import { TestrunInitiateFormComponent } from './components/testrun-initiate-form/testrun-initiate-form.component';
import { MatDialogModule } from '@angular/material/dialog';
import { DeviceItemComponent } from '../../components/device-item/device-item.component';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { DeviceTestsComponent } from '../../components/device-tests/device-tests.component';
import { DownloadReportComponent } from '../../components/download-report/download-report.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { CalloutComponent } from '../../components/callout/callout.component';
import { DownloadOptionsComponent } from './components/download-options/download-options.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  declarations: [
    TestrunComponent,
    TestrunStatusCardComponent,
    TestrunTableComponent,
    TestrunInitiateFormComponent,
  ],
  imports: [
    CommonModule,
    TestrunRoutingModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDialogModule,
    DeviceItemComponent,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    DeviceTestsComponent,
    DownloadReportComponent,
    SpinnerComponent,
    CalloutComponent,
    DownloadOptionsComponent,
    MatTooltipModule,
  ],
})
export class TestrunModule {}
