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
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, tap } from 'rxjs';
import {
  SystemInterfaces,
  TestRunService,
} from '../../services/test-run.service';
import { OnlyDifferentValuesValidator } from './only-different-values.validator';
import { CalloutType } from '../../model/callout-type';
import { Observable } from 'rxjs/internal/Observable';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss'],
})
export class GeneralSettingsComponent implements OnInit, OnDestroy {
  @Input() interfaces: SystemInterfaces = {};
  @Output() closeSettingEvent = new EventEmitter<void>();
  @Output() reloadInterfacesEvent = new EventEmitter<void>();
  public readonly CalloutType = CalloutType;
  public settingForm!: FormGroup;
  public isSubmitting = false;
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

  closeSetting(): void {
    this.resetForm();
    this.closeSettingEvent.emit();
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
        device_intf: ['', Validators.required],
        internet_intf: ['', Validators.required],
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

  private setDefaultFormValues(
    device: string | undefined,
    internet: string | undefined
  ): void {
    this.deviceControl.setValue(device);
    this.internetControl.setValue(internet);
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
        device_intf,
        internet_intf,
      },
    };

    this.testRunService
      .createSystemConfig(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.closeSetting();
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
          if (device_intf && internet_intf) {
            this.setDefaultFormValues(device_intf, internet_intf);
          }
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
