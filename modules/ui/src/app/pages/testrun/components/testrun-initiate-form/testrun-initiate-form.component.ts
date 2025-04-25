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
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  viewChild,
  inject,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TestRunService } from '../../../../services/test-run.service';
import {
  Device,
  TestModule,
  DeviceStatus,
  DeviceView,
} from '../../../../model/device';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { DeviceValidators } from '../../../devices/components/device-form/device.validators';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import { take, timer } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/state';
import { selectDevices } from '../../../../store/selectors';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { TestrunStatus } from '../../../../model/testrun-status';
import { CalloutType } from '../../../../model/callout-type';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { DeviceTestsComponent } from '../../../../components/device-tests/device-tests.component';
import { DeviceItemComponent } from '../../../../components/device-item/device-item.component';
import { SpinnerComponent } from '../../../../components/spinner/spinner.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { CalloutComponent } from '../../../../components/callout/callout.component';

interface DialogData {
  device?: Device;
  testModules: TestModule[];
}

@Component({
  selector: 'app-testrun-initiate-form',
  templateUrl: './testrun-initiate-form.component.html',
  styleUrls: ['./testrun-initiate-form.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDialogModule,
    DeviceItemComponent,
    MatInputModule,
    MatExpansionModule,
    ReactiveFormsModule,
    DeviceTestsComponent,
    SpinnerComponent,
    CalloutComponent,
    MatTooltipModule,
  ],
})
export class TestrunInitiateFormComponent
  extends EscapableDialogComponent
  implements OnInit, AfterViewChecked
{
  private startRequestSent = new BehaviorSubject(false);
  override dialogRef: MatDialogRef<TestrunInitiateFormComponent>;
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly testRunService = inject(TestRunService);
  private fb = inject(FormBuilder);
  private deviceValidators = inject(DeviceValidators);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private store = inject<Store<AppState>>(Store);

  readonly firmwareInput = viewChild.required<ElementRef>('firmwareInput');
  initiateForm!: FormGroup;
  devices$ = this.store.select(selectDevices);
  selectedDevice: Device | null = null;
  testModules: TestModule[] = [];
  prevDevice: Device | null = null;
  setFirmwareFocus = false;
  readonly DeviceStatus = DeviceStatus;
  readonly DeviceView = DeviceView;
  public readonly CalloutType = CalloutType;
  error$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(
    null
  );

  constructor() {
    const dialogRef =
      inject<MatDialogRef<TestrunInitiateFormComponent>>(MatDialogRef);

    super();
    this.dialogRef = dialogRef;
  }

  get firmware() {
    return this.initiateForm.get('firmware') as AbstractControl;
  }

  get test_modules() {
    return this.initiateForm.controls['test_modules'] as FormArray;
  }

  cancel(status: TestrunStatus | null): void {
    this.dialogRef.close(status);
  }

  ngOnInit() {
    this.createInitiateForm();
    this.testModules = this.data?.testModules;

    if (this.data?.device) {
      this.deviceSelected(this.data.device);
    }
  }

  deviceSelected(device: Device) {
    this.selectedDevice = device;
    this.prevDevice = device;
    this.setFirmwareFocus = true;
  }

  changeDevice() {
    this.selectedDevice = null;
    this.firmware.setValue('');
  }

  ngAfterViewChecked() {
    // When change device clicked, previously selected item should be focused
    const item = window.document.querySelector(
      '.device-item-focused button'
    ) as HTMLButtonElement;
    if (item) {
      this.focusButton(item);
      this.prevDevice = null;
      this.changeDetectorRef.detectChanges();
    }
    if (this.setFirmwareFocus) {
      timer(100).subscribe(() => {
        this.firmwareInput()?.nativeElement.focus();
        this.setFirmwareFocus = false;
        this.changeDetectorRef.detectChanges();
      });
    }
  }

  focusButton(button: HTMLButtonElement) {
    button.focus();
  }

  startTestRun() {
    if (!this.firmware.value.trim()) {
      this.firmware.setErrors({ required: true });
    }

    if (this.initiateForm.invalid) {
      this.initiateForm.markAllAsTouched();
      return;
    }

    if (this.isAllTestsDisabled()) {
      this.error$.next(
        'At least one test has to be selected to start test run.'
      );
      return;
    }

    const testModules: { [key: string]: { enabled: boolean } } = {};
    this.initiateForm.value.test_modules.forEach(
      (enabled: boolean, i: number) => {
        testModules[this.testModules[i]?.name] = {
          enabled: enabled,
        };
      }
    );

    if (this.selectedDevice && !this.startRequestSent.value) {
      this.startRequestSent.next(true);
      this.testRunService.fetchVersion();
      this.testRunService
        .startTestrun({
          ...this.selectedDevice,
          firmware: this.firmware.value.trim(),
          test_modules: testModules,
        })
        .pipe(take(1))
        .subscribe({
          next: status => {
            this.cancel(status);
          },
          error: () => {
            this.startRequestSent.next(false);
          },
        });
    }
  }

  private createInitiateForm() {
    this.initiateForm = this.fb.group({
      firmware: ['', [this.deviceValidators.firmwareStringFormat()]],
      test_modules: new FormArray([]),
    });
  }

  private isAllTestsDisabled(): boolean {
    return this.initiateForm.value.test_modules.every((enabled: boolean) => {
      return !enabled;
    });
  }
}
