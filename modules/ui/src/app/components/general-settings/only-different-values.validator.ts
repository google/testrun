import {Injectable} from '@angular/core';
import {AbstractControl, FormControl, ValidationErrors, ValidatorFn} from '@angular/forms';

@Injectable({providedIn: 'root'})

export class OnlyDifferentValuesValidator {
  public onlyDifferentSetting(): ValidatorFn {
    return (form: AbstractControl): ValidationErrors | null => {
      const deviceControl = form.get('device_intf') as FormControl;
      const internetControl = form.get('internet_intf') as FormControl;

      if (!deviceControl || !internetControl) {
        return null;
      }

      const deviceControlValue = deviceControl.value;
      const internetControlValue = internetControl.value;

      if (!deviceControlValue || !internetControlValue) {
        return null;
      }

      if (deviceControlValue === internetControlValue) {
        return {'hasSameValues': true}
      }
      return null;
    }
  }
}
