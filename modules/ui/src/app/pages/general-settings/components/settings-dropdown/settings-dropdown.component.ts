import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import {
  ControlContainer,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SystemInterfaces, SettingOption } from '../../../../model/setting';
import { KeyValuePipe, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-settings-dropdown',

  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    KeyValuePipe,
    NgIf,
    NgForOf,
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
  @Input() key = '';
  @Input({ required: true }) controlName = '';
  @Input() groupLabel = '';
  @Input() label = '';
  @Input() description = '';
  @Input() options!: SystemInterfaces;
  parentContainer = inject(ControlContainer);

  get parentFormGroup() {
    return this.parentContainer.control as FormGroup;
  }

  ngOnInit() {
    this.parentFormGroup.addControl(this.controlName, new FormControl(''));
    this.parentFormGroup.addControl(this.controlName, new FormControl(''));
  }

  get control(): FormControl {
    return this.parentFormGroup.get(this.controlName) as FormControl;
  }

  compare(c1: SettingOption, c2: SettingOption): boolean {
    return c1 && c2 && c1.key === c2.key && c1.value === c2.value;
  }

  asIsOrder() {
    return 1;
  }
}
