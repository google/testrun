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
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil, tap } from 'rxjs';
import { SystemInterfaces } from '../../services/test-run.service';
import { OnlyDifferentValuesValidator } from './only-different-values.validator';
import { CalloutType } from '../../model/callout-type';
import { CdkTrapFocus, LiveAnnouncer } from '@angular/cdk/a11y';
import { EventType } from '../../model/event-type';
import { SettingOption, SystemConfig } from '../../model/setting';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import { selectSystemConfig } from '../../store/selectors';
import { createSystemConfig } from '../../store/actions';
import { AppEffects } from '../../store/effects';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss'],
  hostDirectives: [CdkTrapFocus],
})
export class GeneralSettingsComponent implements OnInit, OnDestroy {
  @Input() interfaces: SystemInterfaces = {};
  @Input() hasConnectionSettings = false;
  @Output() closeSettingEvent = new EventEmitter<void>();
  @Output() reloadInterfacesEvent = new EventEmitter<void>();
  public readonly CalloutType = CalloutType;
  public readonly EventType = EventType;
  public settingForm!: FormGroup;
  public isSubmitting = false;
  public defaultInternetOption = {
    key: '',
    value: 'Not specified',
  };
  private destroy$: Subject<boolean> = new Subject<boolean>();
  private systemConfig: SystemConfig = {};
  get deviceControl(): FormControl {
    return this.settingForm.get('device_intf') as FormControl;
  }

  get internetControl(): FormControl {
    return this.settingForm.get('internet_intf') as FormControl;
  }

  get isFormValues(): boolean {
    return this.internetControl.value && this.deviceControl.value;
  }

  get isFormError(): boolean {
    return this.settingForm.hasError('hasSameValues');
  }

  get isLessThanOneInterfaces(): boolean {
    return Object.keys(this.interfaces).length < 1;
  }

  constructor(
    private readonly fb: FormBuilder,
    private liveAnnouncer: LiveAnnouncer,
    private readonly onlyDifferentValuesValidator: OnlyDifferentValuesValidator,
    private store: Store<AppState>,
    private effects: AppEffects
  ) {}

  ngOnInit() {
    this.createSettingForm();
    this.cleanFormErrorMessage();

    this.store
      .select(selectSystemConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.systemConfig = config;
        this.setDefaultFormValues(
          this.systemConfig?.network?.device_intf,
          this.systemConfig?.network?.internet_intf
        );
      });

    this.effects.onCreateSystemConfigSuccess$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.closeSetting(EventType.Save);
      });
  }

  reloadSetting(): void {
    this.reloadInterfacesEvent.emit();
  }
  closeSetting(message: string): void {
    this.resetForm();
    this.closeSettingEvent.emit();
    this.liveAnnouncer.announce(
      `The ${message} finished. The connection setting panel is closed.`
    );
    this.setDefaultFormValues(
      this.systemConfig?.network?.device_intf,
      this.systemConfig?.network?.internet_intf
    );
  }

  saveSetting(): void {
    if (this.settingForm.invalid) {
      this.isSubmitting = true;
      this.settingForm.markAllAsTouched();
    } else {
      this.createSystemConfig();
    }
  }

  private createSettingForm(): FormGroup {
    return (this.settingForm = this.fb.group(
      {
        device_intf: [''],
        internet_intf: [this.defaultInternetOption],
      },
      {
        validators: [this.onlyDifferentValuesValidator.onlyDifferentSetting()],
        updateOn: 'change',
      }
    ));
  }

  compare(c1: SettingOption, c2: SettingOption): boolean {
    return c1 && c2 && c1.key === c2.key && c1.value === c2.value;
  }

  private setDefaultFormValues(
    device: string | undefined,
    internet: string | undefined
  ): void {
    if (device && this.interfaces[device]) {
      const deviceData = this.transformValueToObj(device);
      this.deviceControl.setValue(deviceData);
    }
    if (internet && this.interfaces[internet]) {
      const internetData = this.transformValueToObj(internet);
      this.internetControl.setValue(internetData);
    } else {
      this.internetControl.setValue(this.defaultInternetOption);
    }
  }

  private transformValueToObj(value: string): SettingOption {
    return {
      key: value,
      value: this.interfaces[value],
    };
  }

  private cleanFormErrorMessage(): void {
    this.settingForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(() => (this.isSubmitting = false))
      )
      .subscribe();
  }

  private createSystemConfig(): void {
    const { device_intf, internet_intf } = this.settingForm.value;
    const data: SystemConfig = {
      network: {
        device_intf: device_intf.key,
        internet_intf: internet_intf.key,
      },
    };

    this.store.dispatch(createSystemConfig({ data }));
  }

  private resetForm(): void {
    this.settingForm.reset();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
