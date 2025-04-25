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
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Profile } from '../../../model/profile';

@Injectable({ providedIn: 'root' })
export class ProfileValidators {
  readonly MULTIPLE_EMAIL_FORMAT_REGEXP = new RegExp(
    '^(([a-zA-Z0-9_\\-\\.]+)@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.)|(([a-zA-Z0-9\\-]+\\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\\]?)(\\s*(;|,)\\s*|\\s*$))*$',
    'i'
  );

  readonly STRING_FORMAT_REGEXP = new RegExp('^[^"\\\\]*$', 'u');

  // Not allowed symbols: <>?/:;@'"][=^!\#$%&*+{}|()
  readonly PROFILE_NAME_FORMAT_REGEXP = new RegExp(
    '^([^<>?:;@\'\\\\"\\[\\]=^!/,.#$%&*+{}|()]{1,28})$',
    'u'
  );

  public differentProfileName(
    profiles: Profile[],
    profile: Profile | null
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim().toLowerCase();
      if (
        value &&
        profiles.length &&
        (!profile ||
          !profile.created ||
          (profile.created && profile?.name.toLowerCase() !== value))
      ) {
        const isSameProfileName = this.hasSameProfileName(
          value,
          profiles,
          profile?.created
        );
        return isSameProfileName ? { has_same_profile_name: true } : null;
      }
      return null;
    };
  }

  public textRequired(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value?.trim()) {
        return { required: true };
      }
      return null;
    };
  }

  public profileNameFormat(): ValidatorFn {
    return this.stringFormat(this.PROFILE_NAME_FORMAT_REGEXP);
  }

  public multiSelectRequired(g: FormGroup) {
    if (Object.values(g.value).every(value => value === false)) {
      return { required: true };
    }
    return null;
  }

  public emailStringFormat(): ValidatorFn {
    return this.stringFormat(this.MULTIPLE_EMAIL_FORMAT_REGEXP);
  }

  public textFormat(): ValidatorFn {
    return this.stringFormat(this.STRING_FORMAT_REGEXP);
  }

  private stringFormat(regExp: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim();
      if (value) {
        const result = regExp.test(value);
        return !result ? { invalid_format: true } : null;
      }
      return null;
    };
  }

  private hasSameProfileName(
    profileName: string,
    profiles: Profile[],
    created?: string
  ): boolean {
    return (
      profiles.some(
        profile =>
          profile.name.toLowerCase() === profileName &&
          profile.created !== created
      ) || false
    );
  }
}
