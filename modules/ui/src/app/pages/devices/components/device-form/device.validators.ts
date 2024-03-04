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
import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Device } from '../../../../model/device';
@Injectable({ providedIn: 'root' })

/**
 * Validator uses for Device Name and Device Manufacturer inputs
 */
export class DeviceValidators {
  readonly STRING_FORMAT_REGEXP = new RegExp(
    "^([a-z0-9\\p{L}\\p{M}.',-_ ]{1,64})$",
    'u'
  );

  public deviceStringFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim();
      if (value) {
        const result = this.STRING_FORMAT_REGEXP.test(value);
        return !result ? { invalid_format: true } : null;
      }
      return null;
    };
  }

  public differentMACAddress(devices: Device[], device?: Device): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim();
      if (value && (!device || device?.mac_addr !== value)) {
        const result = this.hasDevice(value, devices);
        return result ? { has_same_mac_address: true } : null;
      }
      return null;
    };
  }

  private hasDevice(macAddress: string, devices: Device[]): boolean {
    return (
      devices.some(device => device.mac_addr === macAddress.trim()) || false
    );
  }
}
