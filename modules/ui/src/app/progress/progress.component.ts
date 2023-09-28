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
import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {TestRunService} from '../test-run.service';
import {IDevice, IResult, StatusOfTestrun, TestrunStatus, TestsData} from '../model/testrun-status';
import {interval, map, shareReplay, Subject, takeUntil, tap} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {ProgressInitiateFormComponent} from './progress-initiate-form/progress-initiate-form.component';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressComponent implements OnInit, OnDestroy {
  public systemStatus$!: Observable<TestrunStatus>;
  public breadcrumbs$!: Observable<string[]>;
  public dataSource$!: Observable<IResult[] | undefined>;
  public readonly StatusOfTestrun = StatusOfTestrun;

  private destroy$: Subject<boolean> = new Subject<boolean>();
  private startInterval = false;

  constructor(private readonly testRunService: TestRunService, public dialog: MatDialog) {
    this.testRunService.getSystemStatus();
  }

  ngOnInit(): void {
    this.systemStatus$ = this.testRunService.systemStatus$.pipe(
      tap((res) => {
        if (res.status === StatusOfTestrun.InProgress && !this.startInterval) {
          this.pullingSystemStatusData();
        }
        if (res.status !== StatusOfTestrun.InProgress) {
          this.destroy$.next(true);
          this.startInterval = false;
        }
      }),
      shareReplay({refCount: true, bufferSize: 1})
    );

    this.breadcrumbs$ = this.systemStatus$.pipe(
      map((res: TestrunStatus) => res?.device),
      map((res: IDevice) => [res?.manufacturer, res?.model, res?.firmware])
    )

    this.dataSource$ = this.systemStatus$.pipe(
      map((res: TestrunStatus) => (res.tests as TestsData)?.results)
    );
  }

  private pullingSystemStatusData(): void {
    this.startInterval = true;
    interval(5000).pipe(
      takeUntil(this.destroy$),
      tap(() => this.testRunService.getSystemStatus()),
    ).subscribe();
  }

  public stopTestrun(): void {
    this.testRunService.stopTestrun()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openTestRunModal(): void {
    this.dialog.open(ProgressInitiateFormComponent, {
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog'
    });
  }
}
