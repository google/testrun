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
  ViewChild,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TestRunService } from '../../services/test-run.service';
import { Observable } from 'rxjs/internal/Observable';
import { Device, TestModule } from '../../model/device';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { DeviceValidators } from '../../device-repository/device-form/device.validators';
import { EscapableDialogComponent } from '../../components/escapable-dialog/escapable-dialog.component';
import { take } from 'rxjs';

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
  devices$!: Observable<Device[] | null>;
  selectedDevice: Device | null = null;
  testModules: TestModule[] = [];
  prevDevice: Device | null = null;
  setFirmwareFocus = false;

  constructor(
    public override dialogRef: MatDialogRef<ProgressInitiateFormComponent>,
    private readonly testRunService: TestRunService,
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    super(dialogRef);
  }

  get firmware() {
    return this.initiateForm.get('firmware') as AbstractControl;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  ngOnInit() {
    this.devices$ = this.testRunService.getDevices();
    this.createInitiateForm();
    this.testModules = this.testRunService.getTestModules();
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
      this.selectedDevice.firmware = this.firmware.value.trim();
      this.testRunService
        .startTestrun(this.selectedDevice)
        .pipe(take(1))
        .subscribe(() => {
          this.testRunService.getSystemStatus();
          this.cancel();
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
