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
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Device, TestModule } from '../../../../model/device';
import { DeviceValidators } from './device.validators';
import { Subject } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import { DevicesStore } from '../../devices.store';

const MAC_ADDRESS_PATTERN =
  '^[\\s]*[a-fA-F0-9]{2}(?:[:][a-fA-F0-9]{2}){5}[\\s]*$';

interface DialogData {
  title?: string;
  device?: Device;
  devices: Device[];
  testModules: TestModule[];
}

export enum FormAction {
  Delete = 'Delete',
  Save = 'Save',
}

export interface FormResponse {
  device?: Device;
  action: FormAction;
}

@Component({
  selector: 'app-device-form',
  templateUrl: './device-form.component.html',
  styleUrls: ['./device-form.component.scss'],
  providers: [DevicesStore],
})
export class DeviceFormComponent
  extends EscapableDialogComponent
  implements OnInit, OnDestroy
{
  deviceForm!: FormGroup;
  testModules: TestModule[] = [];
  error$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(
    null
  );
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    public override dialogRef: MatDialogRef<DeviceFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
    private deviceValidators: DeviceValidators,
    private devicesStore: DevicesStore
  ) {
    super(dialogRef);
  }

  get model() {
    return this.deviceForm.get('model') as AbstractControl;
  }

  get manufacturer() {
    return this.deviceForm.get('manufacturer') as AbstractControl;
  }

  get mac_addr() {
    return this.deviceForm.get('mac_addr') as AbstractControl;
  }

  get test_modules() {
    return this.deviceForm.controls['test_modules'] as FormArray;
  }

  ngOnInit() {
    this.createDeviceForm();
    this.testModules = this.data.testModules;
    if (this.data.device) {
      this.model.setValue(this.data.device.model);
      this.manufacturer.setValue(this.data.device.manufacturer);
      this.mac_addr.setValue(this.data.device.mac_addr);
    }
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  delete(): void {
    this.dialogRef.close({ action: FormAction.Delete } as FormResponse);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  saveDevice() {
    this.checkMandatoryFields();
    if (this.deviceForm.invalid) {
      this.deviceForm.markAllAsTouched();
      return;
    }

    if (this.isAllTestsDisabled()) {
      this.error$.next(
        'At least one test has to be selected to save a Device.'
      );
      return;
    }

    const device = this.createDeviceFromForm();

    this.updateDevice(device, () => {
      this.dialogRef.close({
        action: FormAction.Save,
        device,
      } as FormResponse);
    });
  }

  private updateDevice(device: Device, callback: () => void) {
    if (this.data.device) {
      this.devicesStore.editDevice({
        device,
        mac_addr: this.data.device.mac_addr,
        onSuccess: callback,
      });
    } else {
      this.devicesStore.saveDevice({ device, onSuccess: callback });
    }
  }

  private isAllTestsDisabled(): boolean {
    return this.deviceForm.value.test_modules.every((enabled: boolean) => {
      return !enabled;
    });
  }

  private createDeviceFromForm(): Device {
    const testModules: { [key: string]: { enabled: boolean } } = {};
    this.deviceForm.value.test_modules.forEach(
      (enabled: boolean, i: number) => {
        testModules[this.testModules[i]?.name] = {
          enabled: enabled,
        };
      }
    );
    return {
      model: this.model.value.trim(),
      manufacturer: this.manufacturer.value.trim(),
      mac_addr: this.mac_addr.value.trim(),
      test_modules: testModules,
    } as Device;
  }

  /**
   * Model, manufacturer, MAC address are mandatory.
   * It should be checked on submit. Other validation happens on blur.
   */
  private checkMandatoryFields() {
    this.setRequiredErrorIfEmpty(this.model);
    this.setRequiredErrorIfEmpty(this.manufacturer);
    this.setRequiredErrorIfEmpty(this.mac_addr);
  }

  private setRequiredErrorIfEmpty(control: AbstractControl) {
    if (!control.value.trim()) {
      control.setErrors({ required: true });
    }
  }

  private createDeviceForm() {
    this.deviceForm = this.fb.group({
      model: ['', [this.deviceValidators.deviceStringFormat()]],
      manufacturer: ['', [this.deviceValidators.deviceStringFormat()]],
      mac_addr: [
        '',
        [
          Validators.pattern(MAC_ADDRESS_PATTERN),
          this.deviceValidators.differentMACAddress(
            this.data.devices,
            this.data.device
          ),
        ],
      ],
      test_modules: new FormArray([]),
    });
  }
}
