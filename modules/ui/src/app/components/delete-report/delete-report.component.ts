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
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ReportActionComponent } from '../report-action/report-action.component';
import { TestRunService } from '../../services/test-run.service';
import { MatDialog } from '@angular/material/dialog';
import { DeleteFormComponent } from '../delete-form/delete-form.component';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-delete-report',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './delete-report.component.html',
  styleUrls: ['./delete-report.component.scss'],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteReportComponent
  extends ReportActionComponent
  implements OnDestroy
{
  private destroy$: Subject<boolean> = new Subject<boolean>();
  constructor(
    private testRunService: TestRunService,
    public dialog: MatDialog,
    datePipe: DatePipe
  ) {
    super(datePipe);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  deleteReport(event: Event) {
    event.preventDefault();
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: 'Delete report dialog',
      data: {
        title: 'Delete report',
        content: this.getTestRunId(this.data),
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'delete-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteReport => {
        if (deleteReport) {
          this.testRunService
            .deleteReport(this.data.device.mac_addr, this.data.started || '')
            .subscribe(() => {
              this.testRunService.removeReport(
                this.data.device.mac_addr,
                this.data.started || ''
              );
            });
        }
      });
  }
}
