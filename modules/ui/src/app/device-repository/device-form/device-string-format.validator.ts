import {Injectable} from '@angular/core';
import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

@Injectable({providedIn: 'root'})

/**
 * Validator uses for Device Name and Device Manufacturer inputs
 */
export class DeviceStringFormatValidator {

  readonly STRING_FORMAT_REGEXP = new RegExp('^([a-z0-9\\p{L}\\p{M}.\',-_ ]{1,64})$', 'u');

  public deviceStringFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim();
      if (value) {
        let result = this.STRING_FORMAT_REGEXP.test(value);
        return !result ? {'invalid_format': true} : null;
      }
      return null;
    }
  }
}
