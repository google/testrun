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
  HostBinding,
  HostListener,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Profile } from '../../model/profile';
import { MatDialog } from '@angular/material/dialog';
import { DownloadZipModalComponent } from '../download-zip-modal/download-zip-modal.component';
import { ReportActionComponent } from '../report-action/report-action.component';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { TestingType } from '../../model/device';

@Component({
  selector: 'app-download-report-zip',
  templateUrl: './download-report-zip.component.html',
  styleUrl: './download-report-zip.component.scss',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  providers: [DatePipe, MatTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadReportZipComponent
  extends ReportActionComponent
  implements OnInit
{
  @Input() profiles: Profile[] = [];
  @Input() report: string | null | undefined = null;
  @Input() export: string | null | undefined = null;

  @HostListener('click', ['$event'])
  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    this.dialog.open(DownloadZipModalComponent, {
      ariaLabel: 'Download zip',
      data: {
        profiles: this.profiles,
        report: this.report,
        export: this.export,
        isPilot: this.data?.device.test_pack === TestingType.Pilot,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });
  }

  @HostBinding('tabIndex')
  readonly tabIndex = 0;

  @HostListener('mouseenter')
  @HostListener('keyup', ['$event'])
  onEvent(): void {
    this.tooltip.show();
  }

  @HostListener('mouseleave')
  @HostListener('keydown', ['$event'])
  outEvent(): void {
    this.tooltip.hide();
  }

  ngOnInit() {
    if (this.data) {
      this.tooltip.message = `Download zip for Testrun # ${this.getTestRunId(this.data)}`;
    }
  }

  constructor(
    datePipe: DatePipe,
    public dialog: MatDialog,
    public tooltip: MatTooltip
  ) {
    super(datePipe);
  }
}
