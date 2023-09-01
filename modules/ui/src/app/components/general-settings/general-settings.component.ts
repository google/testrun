import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Subject, takeUntil, tap} from 'rxjs';
import {TestRunService} from '../../test-run.service';
import {OnlyDifferentValuesValidator} from './only-different-values.validator';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss']
})
export class GeneralSettingsComponent implements OnInit, OnDestroy {
  @Output() closeSettingEvent = new EventEmitter<void>();
  @Output() openSettingEvent = new EventEmitter<void>();
  public readonly systemInterfaces$ = this.testRunService.getSystemInterfaces();
  public settingForm!: FormGroup;
  public isSubmitting = false;
  public hasSetting = false;
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

  constructor(
    private readonly testRunService: TestRunService,
    private readonly fb: FormBuilder,
    private readonly onlyDifferentValuesValidator: OnlyDifferentValuesValidator
  ) {
  }

  ngOnInit() {
    this.createSettingForm();

    this.setSettingView();

    this.cleanFormErrorMessage();
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
    return this.settingForm = this.fb.group({
        device_intf: ['', Validators.required],
        internet_intf: ['', Validators.required],
      },
      {
        validators: [this.onlyDifferentValuesValidator.onlyDifferentSetting()],
        updateOn: 'change',
      }
    )
  }

  private setSettingView(): void {
    this.testRunService.getSystemConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        config => {
          const {device_intf, internet_intf} = config.network;
          if (device_intf && internet_intf) {
            this.setDefaultFormValues(device_intf, internet_intf);
            this.hasSetting = true;
          } else {
            this.openSetting();
          }
          this.testRunService.setSystemConfig(config);
        }
      );
  }

  private setDefaultFormValues(device: string, internet: string): void {
    this.deviceControl.setValue(device);
    this.internetControl.setValue(internet);
  }

  private cleanFormErrorMessage(): void {
    this.settingForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.isSubmitting = false),
      ).subscribe();
  }

  private createSystemConfig(): void {
    const {device_intf, internet_intf} = this.settingForm.value;
    const data = {
      network: {
        device_intf,
        internet_intf
      }
    }

    this.testRunService.createSystemConfig(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.closeSetting();
        this.testRunService.setSystemConfig(data);
        this.hasSetting = true;
      });
  }

  private openSetting(): void {
    this.openSettingEvent.emit();
  }

  private setSystemSetting(): void {
    this.testRunService.systemConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        const {device_intf, internet_intf} = config.network;
        if (device_intf && internet_intf) {
          this.setDefaultFormValues(device_intf, internet_intf);
        }
      })
  }

  private resetForm(): void {
    this.settingForm.reset();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
