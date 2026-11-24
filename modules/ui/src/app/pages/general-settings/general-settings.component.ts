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
  OnDestroy,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, takeUntil, tap } from 'rxjs';
import { OnlyDifferentValuesValidator } from './only-different-values.validator';
import { CalloutType } from '../../model/callout-type';
import { FormKey, SystemConfig } from '../../model/setting';
import { GeneralSettingsStore } from './general-settings.store';
import { LoaderService } from '../../services/loader.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { SettingsDropdownComponent } from './components/settings-dropdown/settings-dropdown.component';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { CalloutComponent } from '../../components/callout/callout.component';
import { CommonModule } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { TestRunService } from '../../services/test-run.service';
import { Router } from '@angular/router';
import { Routes } from '../../model/routes';
import { LocalStorageService } from '../../services/local-storage.service';
import { _IdGenerator, LiveAnnouncer } from '@angular/cdk/a11y';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
declare const gtag: Function;

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss'],
  imports: [
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonToggleModule,
    MatRadioModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDividerModule,
    MatCheckbox,
    FormsModule,
    SpinnerComponent,
    CalloutComponent,
    SettingsDropdownComponent,
    CommonModule,
  ],
  providers: [GeneralSettingsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly onlyDifferentValuesValidator = inject(
    OnlyDifferentValuesValidator
  );
  private settingsStore = inject(GeneralSettingsStore);
  private readonly loaderService = inject(LoaderService);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly deviceDropdown =
    viewChild<SettingsDropdownComponent>('deviceDropdown');
  private readonly internetDropdown =
    viewChild<SettingsDropdownComponent>('internetDropdown');

  /** ID of the error shown when both ports have the same value. */
  readonly portsErrorId = inject(_IdGenerator).getId('mat-mdc-error-');

  private isSettingsDisable = false;
  get settingsDisable(): boolean {
    return this.isSettingsDisable;
  }
  set settingsDisable(value: boolean) {
    this.isSettingsDisable = value;
    if (value) {
      this.disableSettings();
    } else {
      this.enableSettings();
    }
  }
  public readonly CalloutType = CalloutType;
  public readonly FormKey = FormKey;
  public settingForm!: FormGroup;
  public analyticsForm!: FormGroup;
  public readonly Routes = Routes;
  viewModel$ = this.settingsStore.viewModel$;

  private destroy$: Subject<boolean> = new Subject<boolean>();
  private testRunService = inject(TestRunService);
  private route = inject(Router);

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
    return (
      this.deviceControl?.value?.value &&
      (this.isInternetControlDisabled || this.internetControl?.value?.value)
    );
  }

  get isInternetControlDisabled(): boolean {
    return this.internetControl?.disabled;
  }

  get isFormError(): boolean {
    return this.settingForm.hasError('hasSameValues');
  }

  ngOnInit() {
    this.createSettingForm();
    this.createAnalyticsForm();
    this.cleanFormErrorMessage();
    this.settingsStore.getInterfaces();
    this.getSystemConfig();
    this.setDefaultFormValues();
    this.settingsStore.systemStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(systemStatus => {
        if (systemStatus?.status) {
          const isTestrunInProgress = this.testRunService.testrunInProgress(
            systemStatus.status
          );
          if (isTestrunInProgress !== this.isSettingsDisable) {
            this.settingsDisable = isTestrunInProgress;
          }
        }
      });
  }

  navigateToRuntime(): void {
    this.route.navigate([Routes.Testing]);
  }

  reloadSetting(): void {
    this.showLoading();
    this.getSystemInterfaces();
    this.getSystemConfig();
    this.setDefaultFormValues();
  }

  saveSetting(): void {
    if (this.settingForm.invalid) {
      // Focus has to be moved before the "Save" button gets disabled,
      // otherwise keyboard focus is lost.
      this.focusInvalidPortField();
      this.settingsStore.setIsSubmitting(true);
      this.settingForm.markAllAsTouched();
    } else {
      this.createSystemConfig();
      this.settingForm.markAsPristine();
      this.analyticsForm.markAsPristine();
    }
  }

  /**
   * Moves keyboard focus to the port that has to be changed: the internet
   * port or, when it is disabled, the device port.
   */
  private focusInvalidPortField(): void {
    const portDropdown = this.isInternetControlDisabled
      ? this.deviceDropdown()
      : this.internetDropdown();
    portDropdown?.focus();
  }

  /**
   * Tells screen reader users that the settings were saved, and only then
   * moves keyboard focus away from the "Save" button that saving disabled.
   */
  private announceSettingsSaved(): void {
    this.liveAnnouncer
      .announce('General settings saved.', 'polite')
      .then(() => this.focusPageHeading());
  }

  /**
   * Moves keyboard focus to the "Settings" page heading if it was lost
   * because the focused "Save" button got disabled. Depending on the browser,
   * focus then moves to the page body or stays on the disabled button. Focus
   * that the user has moved elsewhere in the meantime is left as is.
   */
  private focusPageHeading(): void {
    const focusedElement = document.activeElement;
    const isFocusLost =
      !focusedElement ||
      focusedElement === document.body ||
      focusedElement.matches(':disabled');
    if (isFocusLost) {
      this.elementRef.nativeElement
        .closest('app-settings')
        ?.querySelector<HTMLElement>('h2')
        ?.focus();
    }
  }

  private disableSettings(): void {
    this.settingsStore.setFormDisable(this.settingForm);
  }

  private enableSettings(): void {
    this.settingsStore.setFormEnable(this.settingForm);
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

  private createAnalyticsForm() {
    this.analyticsForm = this.fb.group({
      optOut: new FormControl(!this.localStorageService.getGAConsent()),
    });
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
        internet_intf: this.isInternetControlDisabled ? '' : internet_intf.key,
      },
      log_level: log_level.key,
      monitor_period: Number(monitor_period.key),
    };
    this.settingsStore.updateSystemConfig({
      onSystemConfigUpdate: () => {
        this.setDefaultFormValues();
        this.announceSettingsSaved();
      },
      config: data,
    });
    gtag('consent', 'update', {
      analytics_storage: this.analyticsForm.value.optOut ? 'denied' : 'granted',
    });
    this.localStorageService.setGAConsent(!this.analyticsForm.value.optOut);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  /**
   * Fetches the network interfaces again and tells screen reader users once
   * the refreshed interfaces are loaded.
   */
  getSystemInterfaces(): void {
    this.settingsStore.refreshInterfaces({
      onInterfacesRefresh: () => {
        this.liveAnnouncer.announce('Network interfaces refreshed.', 'polite');
      },
    });
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
