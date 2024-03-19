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
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestrunStatus } from '../../model/testrun-status';
import { CommonModule, DatePipe } from '@angular/common';
import { DownloadReportComponent } from '../download-report/download-report.component';
import { MatIcon } from '@angular/material/icon';
import { ReportActionComponent } from '../report-action/report-action.component';

@Component({
  selector: 'app-download-report-zip',
  templateUrl: './download-report-zip.component.html',
  standalone: true,
  imports: [CommonModule, DownloadReportComponent, MatIcon],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadReportZipComponent extends ReportActionComponent {
  getZipLink(data: TestrunStatus) {
    return data.report?.replace('report', 'export');
  }
}
