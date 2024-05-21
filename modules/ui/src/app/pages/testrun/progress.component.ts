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
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  StatusOfTestrun,
  TestrunStatus,
  TestsResponse,
} from '../../model/testrun-status';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProgressInitiateFormComponent } from './components/progress-initiate-form/progress-initiate-form.component';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { LoaderService } from '../../services/loader.service';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from '../../services/loaderConfig';
import { FocusManagerService } from '../../services/focus-manager.service';
import { TestrunStore } from './testrun.store';
import { TestRunService } from '../../services/test-run.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    LoaderService,
    { provide: LOADER_TIMEOUT_CONFIG_TOKEN, useValue: 0 },
    TestrunStore,
  ],
})
export class ProgressComponent implements OnInit, OnDestroy {
  public readonly StatusOfTestrun = StatusOfTestrun;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  viewModel$ = this.testrunStore.viewModel$;

  constructor(
    private readonly testRunService: TestRunService,
    private readonly notificationService: NotificationService,
    public dialog: MatDialog,
    private readonly focusManagerService: FocusManagerService,
    public testrunStore: TestrunStore
  ) {}

  ngOnInit(): void {
    this.testrunStore.isOpenStartTestrun$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpenStartTestrun => {
        if (isOpenStartTestrun) {
          this.openTestRunModal();
        }
      });

    this.testrunStore.isStopTestrun$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isStop => {
        if (isStop) {
          this.stopTestrun();
          this.notificationService.dismissSnackBar();
        }
      });
  }

  isTestrunInProgress(status?: string) {
    return this.testRunService.testrunInProgress(status);
  }

  public openStopTestrunDialog(systemStatus: TestrunStatus) {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: `Stop testrun ${this.getTestRunName(systemStatus)}`,
      data: {
        title: `Stop testrun ${this.getTestRunName(systemStatus)}`,
        content:
          'Are you sure you would like to stop testrun without a report generation?',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'delete-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stopTestrun => {
        if (stopTestrun) {
          this.stopTestrun();
        }
      });
  }

  public stopTestrun(): void {
    this.showLoading();
    this.setCancellingStatus();
    this.sendCloseRequest();
  }

  private getTestRunName(systemStatus: TestrunStatus): string {
    if (systemStatus?.device) {
      const device = systemStatus.device;
      return `${device.manufacturer} ${device.model} v${device.firmware}`;
    } else {
      return '';
    }
  }
  private setCancellingStatus() {
    this.testrunStore.setCancellingStatus();
  }
  private showLoading() {
    this.testrunStore.showLoading();
  }
  private sendCloseRequest() {
    this.testrunStore.stopTestrun();
  }

  ngOnDestroy() {
    this.notificationService.dismissSnackBar();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openTestRunModal(): void {
    const dialogRef = this.dialog.open(ProgressInitiateFormComponent, {
      ariaLabel: 'Initiate testrun',
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((startTestrun: boolean) => {
        if (startTestrun) {
          // @ts-expect-error data layer is not null
          window.dataLayer.push({
            event: 'successful_testrun_initiation',
          });
          this.testrunStore.getSystemStatus();
        }
        this.testrunStore.setIsOpenStartTestrun(false);
        timer(10)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.focusManagerService.focusFirstElementInContainer();
          });
      });
  }

  resultIsEmpty(tests: TestsResponse | undefined) {
    return this.testrunStore.resultIsEmpty(tests);
  }
}
