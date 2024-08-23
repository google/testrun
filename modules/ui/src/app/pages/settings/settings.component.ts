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
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil, tap } from 'rxjs';
import { OnlyDifferentValuesValidator } from './only-different-values.validator';
import { CalloutType } from '../../model/callout-type';
import { CdkTrapFocus, LiveAnnouncer } from '@angular/cdk/a11y';
import { EventType } from '../../model/event-type';
import { FormKey, SystemConfig } from '../../model/setting';
import { SettingsStore } from './settings.store';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  hostDirectives: [CdkTrapFocus],
  providers: [SettingsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild('reloadSettingLink') public reloadSettingLink!: ElementRef;
  @Output() closeSettingEvent = new EventEmitter<void>();

  private isSettingsDisable = false;
  get settingsDisable(): boolean {
    return this.isSettingsDisable;
  }
  @Input() set settingsDisable(value: boolean) {
    this.isSettingsDisable = value;
    if (value) {
      this.disableSettings();
    } else {
      this.enableSettings();
    }
  }
  public readonly CalloutType = CalloutType;
  public readonly EventType = EventType;
  public readonly FormKey = FormKey;
  public settingForm!: FormGroup;
  viewModel$ = this.settingsStore.viewModel$;

  private destroy$: Subject<boolean> = new Subject<boolean>();

  get deviceControl(): FormControl {
    return this.settingForm.get(FormKey.DEVICE) as FormControl;
  }

  get internetControl(): FormControl {
    return this.settingForm.get(FormKey.INTERNET) as FormControl;
  }

  get logLevel(): FormControl {
    return this.settingForm.get(FormKey.LOG_LEVEL) as FormControl;
  }

  get monitorPeriod(): FormControl {
    return this.settingForm.get(FormKey.MONITOR_PERIOD) as FormControl;
  }

  get isFormValues(): boolean {
    return this.internetControl?.value.value && this.deviceControl?.value.value;
  }

  get isFormError(): boolean {
    return this.settingForm.hasError('hasSameValues');
  }

  constructor(
    private readonly fb: FormBuilder,
    private liveAnnouncer: LiveAnnouncer,
    private readonly onlyDifferentValuesValidator: OnlyDifferentValuesValidator,
    private settingsStore: SettingsStore,
    private readonly loaderService: LoaderService
  ) {}

  ngOnInit() {
    this.createSettingForm();
    this.cleanFormErrorMessage();
    this.settingsStore.getInterfaces();
    this.settingsStore.getSystemConfig();
    this.setDefaultFormValues();
  }

  reloadSetting(): void {
    if (this.settingsDisable) {
      return;
    }
    this.showLoading();
    this.getSystemInterfaces();
    this.settingsStore.getSystemConfig();
    this.setDefaultFormValues();
  }
  closeSetting(message: string): void {
    this.resetForm();
    this.closeSettingEvent.emit();
    this.liveAnnouncer.announce(
      `The ${message} finished. The system settings panel is closed.`
    );
    this.setDefaultFormValues();
  }

  saveSetting(): void {
    if (this.settingForm.invalid) {
      this.settingsStore.setIsSubmitting(true);
      this.settingForm.markAllAsTouched();
    } else {
      this.createSystemConfig();
    }
  }

  private disableSettings(): void {
    this.settingForm?.disable();
    this.reloadSettingLink?.nativeElement.setAttribute('aria-disabled', 'true');
  }

  private enableSettings(): void {
    this.settingForm?.enable();
    this.reloadSettingLink?.nativeElement.removeAttribute('aria-disabled');
  }

  private createSettingForm() {
    this.settingForm = this.fb.group(
      {
        device_intf: [''],
        internet_intf: [''],
        log_level: [''],
        monitor_period: [''],
      },
      {
        validators: [this.onlyDifferentValuesValidator.onlyDifferentSetting()],
        updateOn: 'change',
      }
    );
  }

  private setDefaultFormValues() {
    this.settingsStore.setDefaultFormValues(this.settingForm);
  }

  private cleanFormErrorMessage(): void {
    this.settingForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.settingsStore.setIsSubmitting(false))
      )
      .subscribe();
  }

  private createSystemConfig(): void {
    const { device_intf, internet_intf, log_level, monitor_period } =
      this.settingForm.value;
    const data: SystemConfig = {
      network: {
        device_intf: device_intf.key,
        internet_intf: internet_intf.key,
      },
      log_level: log_level.key,
      monitor_period: Number(monitor_period.key),
    };
    this.settingsStore.updateSystemConfig({
      onSystemConfigUpdate: () => {
        this.closeSetting(EventType.Save);
      },
      config: data,
    });
  }

  private resetForm(): void {
    this.settingForm.reset();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getSystemInterfaces(): void {
    this.settingsStore.getInterfaces();
    this.hideLoading();
  }

  getSystemConfig(): void {
    this.settingsStore.getSystemConfig();
  }

  private showLoading() {
    this.loaderService.setLoading(true);
  }

  private hideLoading() {
    this.loaderService.setLoading(false);
  }
}
