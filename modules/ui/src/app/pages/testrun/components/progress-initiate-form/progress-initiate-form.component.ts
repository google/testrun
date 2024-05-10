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
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TestRunService } from '../../../../services/test-run.service';
import { Device, TestModule, DeviceView } from '../../../../model/device';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { DeviceValidators } from '../../../devices/components/device-form/device.validators';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import { take } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/state';
import { selectDevices } from '../../../../store/selectors';

interface DialogData {
  device?: Device;
}

@Component({
  selector: 'app-progress-initiate-form',
  templateUrl: './progress-initiate-form.component.html',
  styleUrls: ['./progress-initiate-form.component.scss'],
})
export class ProgressInitiateFormComponent
  extends EscapableDialogComponent
  implements OnInit, AfterViewChecked
{
  @ViewChild('firmwareInput') firmwareInput!: ElementRef;
  initiateForm!: FormGroup;
  devices$ = this.store.select(selectDevices);
  selectedDevice: Device | null = null;
  testModules: TestModule[] = [];
  prevDevice: Device | null = null;
  setFirmwareFocus = false;
  readonly DeviceView = DeviceView;

  constructor(
    public override dialogRef: MatDialogRef<ProgressInitiateFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private readonly testRunService: TestRunService,
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private store: Store<AppState>
  ) {
    super(dialogRef);
  }

  get firmware() {
    return this.initiateForm.get('firmware') as AbstractControl;
  }

  cancel(data?: string): void {
    this.testRunService.setIsOpenStartTestrun(false);
    this.dialogRef.close(data);
  }

  ngOnInit() {
    this.createInitiateForm();
    this.testModules = this.testRunService.getTestModules();

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
      this.firmwareInput?.nativeElement.focus();
      this.setFirmwareFocus = false;
      this.changeDetectorRef.detectChanges();
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

    if (this.selectedDevice) {
      this.testRunService.fetchVersion();
      this.testRunService
        .startTestrun({
          ...this.selectedDevice,
          firmware: this.firmware.value.trim(),
        })
        .pipe(take(1))
        .subscribe(() => {
          this.testRunService.getSystemStatus();
          this.cancel('testrunStarted');
        });
    }
  }

  private createInitiateForm() {
    this.initiateForm = this.fb.group({
      firmware: ['', [this.deviceValidators.deviceStringFormat()]],
      test_modules: new FormArray([]),
    });
  }
}
