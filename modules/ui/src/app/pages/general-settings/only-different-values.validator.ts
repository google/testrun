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
import {
  AbstractControl,
  FormControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { FormKey } from '../../model/setting';

@Injectable({ providedIn: 'root' })
export class OnlyDifferentValuesValidator {
  public onlyDifferentSetting(): ValidatorFn {
    return (form: AbstractControl): ValidationErrors | null => {
      const deviceControl = form.get(FormKey.DEVICE) as FormControl;
      const internetControl = form.get(FormKey.INTERNET) as FormControl;

      if (!deviceControl || !internetControl) {
        return null;
      }

      const deviceControlValue = deviceControl.value;
      const internetControlValue = internetControl.value;

      if (!deviceControlValue || !internetControlValue) {
        return null;
      }

      if (
        deviceControlValue.key === internetControlValue.key &&
        deviceControlValue.key &&
        internetControlValue.key
      ) {
        return { hasSameValues: true };
      }
      return null;
    };
  }
}
