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
import {
  SystemInterfaces,
  TestRunService,
} from '../../services/test-run.service';
import { OnlyDifferentValuesValidator } from './only-different-values.validator';
import { CalloutType } from '../../model/callout-type';
import { Observable } from 'rxjs/internal/Observable';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { EventType } from '../../model/event-type';
import { SettingOption } from '../../model/setting';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss'],
})
export class GeneralSettingsComponent implements OnInit, OnDestroy {
  private _interfaces: SystemInterfaces = {};
  @Input()
  get interfaces(): SystemInterfaces {
    return this._interfaces;
  }
  set interfaces(value: SystemInterfaces) {
    this._interfaces = value;
    this.setSystemSetting();
  }
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
  hasConnectionSetting$!: Observable<boolean | null>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

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

  get isLessThanTwoInterfaces(): boolean {
    return Object.keys(this.interfaces).length < 2;
  }

  constructor(
    private readonly testRunService: TestRunService,
    private readonly fb: FormBuilder,
    private liveAnnouncer: LiveAnnouncer,
    private readonly onlyDifferentValuesValidator: OnlyDifferentValuesValidator
  ) {}

  ngOnInit() {
    this.hasConnectionSetting$ = this.testRunService.hasConnectionSetting$.pipe(
      shareReplay({ refCount: true, bufferSize: 1 })
    );

    this.createSettingForm();
    this.setSettingView();
    this.cleanFormErrorMessage();
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
    this.setSystemSetting();
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

  private setSettingView(): void {
    this.testRunService
      .getSystemConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        if (config?.network) {
          const { device_intf, internet_intf } = config.network;
          if (device_intf && internet_intf) {
            this.testRunService.setHasConnectionSetting(true);
          } else {
            this.testRunService.setHasConnectionSetting(false);
          }
          this.setDefaultFormValues(device_intf, internet_intf);
        } else {
          this.testRunService.setHasConnectionSetting(false);
        }
        this.testRunService.setSystemConfig(config);
      });
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
      const interneData = this.transformValueToObj(internet);
      this.internetControl.setValue(interneData);
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
    const data = {
      network: {
        device_intf: device_intf.key,
        internet_intf: internet_intf.key,
      },
    };

    this.testRunService
      .createSystemConfig(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.closeSetting(EventType.Save);
        this.testRunService.setSystemConfig(data);
        this.testRunService.setHasConnectionSetting(true);
      });
  }

  private setSystemSetting(): void {
    this.testRunService.systemConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        if (config?.network) {
          const { device_intf, internet_intf } = config.network;
          this.setDefaultFormValues(device_intf, internet_intf);
        }
      });
  }

  private resetForm(): void {
    this.settingForm.reset();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
