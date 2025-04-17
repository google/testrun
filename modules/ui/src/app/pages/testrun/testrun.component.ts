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
  inject,
} from '@angular/core';
import {
  StatusOfTestrun,
  TestrunStatus,
  TestsResponse,
} from '../../model/testrun-status';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TestrunInitiateFormComponent } from './components/testrun-initiate-form/testrun-initiate-form.component';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { LoaderService } from '../../services/loader.service';
import { LOADER_TIMEOUT_CONFIG_TOKEN } from '../../services/loaderConfig';
import { FocusManagerService } from '../../services/focus-manager.service';
import { TestrunStore } from './testrun.store';
import { TestRunService } from '../../services/test-run.service';
import { TestModule } from '../../model/device';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TestrunTableComponent } from './components/testrun-table/testrun-table.component';
import { TestrunStatusCardComponent } from './components/testrun-status-card/testrun-status-card.component';
import { DownloadOptionsComponent } from './components/download-options/download-options.component';

@Component({
  selector: 'app-progress',
  templateUrl: './testrun.component.html',
  styleUrls: ['./testrun.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDialogModule,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    SpinnerComponent,
    MatTooltipModule,
    TestrunTableComponent,
    TestrunStatusCardComponent,
    DownloadOptionsComponent,
  ],
  providers: [
    LoaderService,
    { provide: LOADER_TIMEOUT_CONFIG_TOKEN, useValue: 0 },
    TestrunStore,
  ],
})
export class TestrunComponent implements OnInit, OnDestroy {
  private readonly testRunService = inject(TestRunService);
  dialog = inject(MatDialog);
  private readonly focusManagerService = inject(FocusManagerService);
  testrunStore = inject(TestrunStore);

  public readonly StatusOfTestrun = StatusOfTestrun;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  viewModel$ = this.testrunStore.viewModel$;

  ngOnInit(): void {
    combineLatest([
      this.testrunStore.isOpenStartTestrun$,
      this.testrunStore.testModules$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isOpenStartTestrun, testModules]) => {
        if (isOpenStartTestrun) {
          this.openTestRunModal(testModules);
        }
      });
  }

  isTestrunInProgress(status?: string) {
    return this.testRunService.testrunInProgress(status);
  }

  public openStopTestrunDialog() {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: `Stop Testrun`,
      data: {
        icon: 'stop_circle',
        title: `Stop Testrun?`,
        content:
          'Testrun will be stopped without any track records and report generation.',
        confirmName: 'Stop',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: ['simple-dialog', 'stop-testrun'],
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
    this.setCancellingStatus();
    this.sendCloseRequest();
  }

  getTestRunName(systemStatus: TestrunStatus): string {
    if (systemStatus?.device) {
      const device = systemStatus.device;
      return `${device.manufacturer} ${device.model} ${device.firmware}`;
    } else {
      return '';
    }
  }
  private setCancellingStatus() {
    this.testrunStore.setCancellingStatus();
    const actionsButton = window.document.querySelector('app-side-button-menu');
    timer(2000).subscribe(() => {
      this.focusManagerService.focusFirstElementInContainer(actionsButton);
    });
  }

  private sendCloseRequest() {
    this.testrunStore.stopTestrun();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openTestRunModal(testModules: TestModule[]): void {
    const dialogRef = this.dialog.open(TestrunInitiateFormComponent, {
      ariaLabel: 'Initiate testrun',
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
      data: {
        testModules,
      },
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: TestrunStatus) => {
        if (status) {
          // @ts-expect-error data layer is not null
          window.dataLayer.push({
            event: 'successful_testrun_initiation',
          });
          this.testrunStore.setStatus(status);
        }
        this.testrunStore.setIsOpenStartTestrun(false);
        timer(1000).subscribe(() => {
          this.focusManagerService.focusFirstElementInContainer();
        });
      });
  }

  resultIsEmpty(tests: TestsResponse | undefined) {
    return this.testrunStore.resultIsEmpty(tests);
  }
}
