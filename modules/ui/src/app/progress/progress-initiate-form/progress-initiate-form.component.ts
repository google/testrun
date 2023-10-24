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
import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TestRunService} from '../../services/test-run.service';
import {Observable} from 'rxjs/internal/Observable';
import {Device, TestModule} from '../../model/device';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {DeviceValidators} from '../../device-repository/device-form/device.validators';
import {StatusOfTestrun, TestrunStatus} from '../../model/testrun-status';
import {tap} from 'rxjs/internal/operators/tap';
import {interval} from 'rxjs/internal/observable/interval';
import {takeUntil} from 'rxjs/internal/operators/takeUntil';
import {Subject} from 'rxjs/internal/Subject';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-progress-initiate-form',
  templateUrl: './progress-initiate-form.component.html',
  styleUrls: ['./progress-initiate-form.component.scss']
})
export class ProgressInitiateFormComponent implements OnInit, OnDestroy {
  initiateForm!: FormGroup;
  devices$!: Observable<Device[] | null>;
  selectedDevice: Device | null = null;
  testModules: TestModule[] = [];
  public systemStatus$!: Observable<TestrunStatus>;
  startInterval = false;
  destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    public dialogRef: MatDialogRef<ProgressInitiateFormComponent>,
    private readonly testRunService: TestRunService,
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private notificationService: NotificationService) {
  }

  get firmware() {
    return this.initiateForm.get('firmware')!;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  testRunStarted = false;

  ngOnInit() {
    this.devices$ = this.testRunService.getDevices();
    this.createInitiateForm();
    this.testModules = this.testRunService.getTestModules();

    this.testRunService.systemStatus$.pipe(
      tap((res) => {
        if (this.testRunStarted) {
          if (res.status === StatusOfTestrun.WaitingForDevice && !this.startInterval) {
            this.pullingSystemStatusData();
            this.notify(res.status, 0);
          }
          if (res.status !== StatusOfTestrun.WaitingForDevice) {
            this.dismiss();
            this.destroy$.next(true);
            this.startInterval = false;
            this.dialogRef.close();
          }
        }
      }),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  deviceSelected(device: Device) {
    this.selectedDevice = device;
  }

  changeDevice() {
    this.selectedDevice = null;
    this.firmware.setValue('');
  }

  startTestRun() {
    if (!this.firmware.value.trim()) {
      this.firmware.setErrors({required: true});
    }

    if (this.initiateForm.invalid) {
      this.initiateForm.markAllAsTouched();
      return;
    }

    if (this.selectedDevice) {
      this.selectedDevice.firmware = this.firmware.value.trim();
      this.testRunService.startTestrun(this.selectedDevice)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          () => {
            this.testRunStarted = true;
            this.testRunService.getSystemStatus();
          },
          () => {
            this.startInterval = false;
          });
    }
  }

  private createInitiateForm() {
    this.initiateForm = this.fb.group({
      firmware: ['', [this.deviceValidators.deviceStringFormat()]],
      test_modules: new FormArray([])
    });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  private pullingSystemStatusData(): void {
    this.startInterval = true;
    interval(5000).pipe(
      takeUntil(this.destroy$),
      tap(() => this.testRunService.getSystemStatus()),
    ).subscribe();
  }

  private notify(message: string, duration = 5000) {
    this.notificationService.notify(message, duration);
  }

  private dismiss() {
    this.notificationService.dismiss();
  }
}
