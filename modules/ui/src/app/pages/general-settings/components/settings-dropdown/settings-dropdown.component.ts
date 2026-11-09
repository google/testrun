import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Input,
  OnInit,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlContainer,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { SystemInterfaces, SettingOption } from '../../../../model/setting';
import { KeyValuePipe } from '@angular/common';

@Component({
  selector: 'app-settings-dropdown',

  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    KeyValuePipe,
  ],
  templateUrl: './settings-dropdown.component.html',
  styleUrl: './settings-dropdown.component.scss',
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDropdownComponent implements OnInit {
  private readonly defaultErrorStateMatcher = inject(ErrorStateMatcher);
  private readonly matSelect = viewChild.required(MatSelect);

  @Input() key = '';
  @Input({ required: true }) controlName = '';
  @Input() groupLabel = '';
  @Input() label = '';
  @Input() description = '';
  @Input() options!: SystemInterfaces;
  /**
   * ID of an error message rendered outside of this component, e.g. a
   * form-level validation error. When set, the select is marked as invalid
   * and is described by the error message.
   */
  errorId = input<string | null>(null);
  parentContainer = inject(ControlContainer);

  /**
   * Puts the select in the error state (`aria-invalid="true"` and error
   * styling) when an external error is linked, in addition to the default
   * control-level validation.
   */
  readonly errorStateMatcher: ErrorStateMatcher = {
    isErrorState: (
      control: AbstractControl | null,
      form: FormGroupDirective | NgForm | null
    ): boolean =>
      Boolean(this.errorId()) ||
      this.defaultErrorStateMatcher.isErrorState(control, form),
  };

  get parentFormGroup() {
    return this.parentContainer.control as FormGroup;
  }

  get describedBy(): string {
    const descriptionId = `${this.key}-description`;
    const errorId = this.errorId();
    return errorId ? `${descriptionId} ${errorId}` : descriptionId;
  }

  ngOnInit() {
    this.parentFormGroup.addControl(this.controlName, new FormControl(''));
    this.parentFormGroup.addControl(this.controlName, new FormControl(''));
  }

  get control(): FormControl {
    return this.parentFormGroup.get(this.controlName) as FormControl;
  }

  /** Moves keyboard focus to the select. */
  focus(): void {
    this.matSelect().focus();
  }

  compare(c1: SettingOption, c2: SettingOption): boolean {
    return c1 && c2 && c1.key === c2.key && c1.value === c2.value;
  }

  asIsOrder() {
    return 1;
  }
}
