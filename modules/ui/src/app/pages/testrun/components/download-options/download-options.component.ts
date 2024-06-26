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
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TestrunStatus } from '../../../../model/testrun-status';
import { MatOptionSelectionChange } from '@angular/material/core';

export enum DownloadOption {
  PDF = 'PDF Report',
  ZIP = 'ZIP File',
}
@Component({
  selector: 'app-download-options',
  templateUrl: './download-options.component.html',
  styleUrl: './download-options.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadOptionsComponent {
  @Input() data!: TestrunStatus;
  DownloadOption = DownloadOption;
  constructor(private datePipe: DatePipe) {}

  onSelected(
    event: MatOptionSelectionChange,
    data: TestrunStatus,
    type: string
  ) {
    if (event.isUserInput) {
      this.createLink(data, type);
    }
  }

  createLink(data: TestrunStatus, type: string) {
    if (!data.report) {
      return;
    }
    const link = document.createElement('a');
    link.href =
      type === DownloadOption.PDF ? data.report : this.getZipLink(data.report);
    link.target = '_blank';
    link.download = this.getReportTitle(data);
    link.dispatchEvent(new MouseEvent('click'));
  }

  getZipLink(reportURL: string): string {
    return reportURL.replace('report', 'export');
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
