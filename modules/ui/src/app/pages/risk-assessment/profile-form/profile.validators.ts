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
import { Profile } from '../../../model/profile';
@Injectable({ providedIn: 'root' })
export class ProfileValidators {
  public differentProfileName(profiles: Profile[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim();
      if (value && profiles.length) {
        const isSameProfileName = this.hasSameProfileName(value, profiles);
        return isSameProfileName ? { has_same_profile_name: true } : null;
      }
      return null;
    };
  }

  private hasSameProfileName(
    profileName: string,
    profiles: Profile[]
  ): boolean {
    return (
      profiles.some(profile => profile.name === profileName.trim()) || false
    );
  }
}
