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
import { Component, Input, TemplateRef } from '@angular/core';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormGroup } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-stepper',
  imports: [
    NgForOf,
    NgTemplateOutlet,
    CdkStepperModule,
    NgIf,
    MatIcon,
    MatButton,
    MatTooltipModule,
  ],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
  providers: [{ provide: CdkStepper, useExisting: StepperComponent }],
})
export class StepperComponent extends CdkStepper {
  @Input() header: TemplateRef<HTMLElement> | undefined;
  @Input() title = '';
  @Input() activeClass = 'active';

  forwardButtonHidden() {
    return this.selectedIndex === this.steps.length - 1;
  }

  backButtonHidden() {
    return this.selectedIndex === 0;
  }

  nextClick() {
    if (
      this.selected?.interacted &&
      !(this.selected?.stepControl as FormGroup)?.valid
    ) {
      this.selected?.stepControl?.markAllAsTouched();
    }
  }

  getStepLabel(isActive: boolean) {
    return isActive
      ? `Step #${this.selectedIndex + 1} out of ${this.steps.length}`
      : '';
  }

  getNavigationLabel(index: number) {
    return `Go to step #${index} out of ${this.title}`;
  }
}
