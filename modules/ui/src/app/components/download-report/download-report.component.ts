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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReportActionComponent } from '../report-action/report-action.component';

@Component({
  selector: 'app-download-report',
  templateUrl: './download-report.component.html',
  styleUrls: ['./download-report.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadReportComponent extends ReportActionComponent {
  @Input() href: string | undefined;
  @Input() title!: string;

  getReportTitle(data: TestrunStatus) {
    return `${data.device.manufacturer} ${data.device.model} ${
      data.device.firmware
    } ${data.status} ${this.getFormattedDateString(data.started)}`
      .replace(/ /g, '_')
      .toLowerCase();
  }
}
