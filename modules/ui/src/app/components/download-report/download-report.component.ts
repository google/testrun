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
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TestrunStatus } from '../../model/testrun-status';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-download-report',
  templateUrl: './download-report.component.html',
  styleUrls: ['./download-report.component.scss'],
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadReportComponent {
  @Input() data!: TestrunStatus;

  constructor(private datePipe: DatePipe) {}

  getTestRunId(data: TestrunStatus) {
    return `${data.device.manufacturer} ${data.device.model} ${
      data.device.firmware
    } ${this.getFormattedDateString(data.started)}`;
  }

  getReportTitle(data: TestrunStatus) {
    return `${data.device.manufacturer} ${data.device.model} ${
      data.device.firmware
    } ${data.status} ${this.getFormattedDateString(data.started)}`
      .replace(/ /g, '_')
      .toLowerCase();
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }
}
