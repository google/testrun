import { Component, Input, TemplateRef } from '@angular/core';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [
    NgForOf,
    NgTemplateOutlet,
    CdkStepperModule,
    NgIf,
    MatIcon,
    MatIconButton,
    MatButton,
  ],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
  providers: [{ provide: CdkStepper, useExisting: StepperComponent }],
})
export class StepperComponent extends CdkStepper {
  @Input() header: TemplateRef<HTMLElement> | undefined;
  @Input() activeClass = 'active';

  stepsCount = [1, 2, 3, 4]; //TODO will be removed when all steps are implemented

  forwardButtonHidden() {
    return this.selectedIndex === this.stepsCount.length - 1;
  }

  backButtonHidden() {
    return this.selectedIndex === 0;
  }

  nextClick() {
    if (
      this.selected?.interacted &&
      !(this.selected?.stepControl as FormGroup).valid
    ) {
      this.selected?.stepControl.markAllAsTouched();
    }
  }
}
