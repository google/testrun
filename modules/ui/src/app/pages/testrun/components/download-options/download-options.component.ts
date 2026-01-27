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
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  ResultOfTestrun,
  TestrunStatus,
} from '../../../../model/testrun-status';
import { DownloadReportZipComponent } from '../../../../components/download-report-zip/download-report-zip.component';
import { Profile } from '../../../../model/profile';
import { MatButtonModule } from '@angular/material/button';

export enum DownloadOption {
  PDF = 'PDF Report',
  ZIP = 'ZIP File',
}
@Component({
  selector: 'app-download-options',
  templateUrl: './download-options.component.html',
  styleUrl: './download-options.component.scss',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    DownloadReportZipComponent,
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadOptionsComponent {
  private datePipe = inject(DatePipe);
  isOpenDownloadOptions: boolean = false;
  @Input() profiles: Profile[] = [];
  @Input() data!: TestrunStatus;
  DownloadOption = DownloadOption;

  downloadPdf(data: TestrunStatus) {
    this.createLink(data);
    this.sendGAEvent(data);
  }

  createLink(data: TestrunStatus) {
    if (!data.report) {
      return;
    }
    const link = document.createElement('a');
    link.href = data.report;
    link.target = '_blank';
    link.download = this.getReportTitle(data);
    link.dispatchEvent(new MouseEvent('click'));
  }

  getReportTitle(data: TestrunStatus) {
    if (!data.device) {
      return '';
    }
    return `${data.device.manufacturer} ${data.device.model} ${
      data.device.firmware
    } ${data.status} ${this.getFormattedDateString(data.started)}`
      .replace(/ /g, '_')
      .toLowerCase();
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }

  sendGAEvent(data: TestrunStatus) {
    let event = 'download_report_pdf';
    if (data.result === ResultOfTestrun.Compliant) {
      event += '_compliant';
    } else if (data.result === ResultOfTestrun.NonCompliant) {
      event += '_non_compliant';
    }
    // @ts-expect-error data layer is not null
    window.dataLayer.push({
      event: event,
    });
  }

  openDownloadOptions(): void {
    this.isOpenDownloadOptions = !this.isOpenDownloadOptions;
  }
}
