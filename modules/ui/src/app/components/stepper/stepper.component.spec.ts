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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperComponent } from './stepper.component';
import { Component, ViewEncapsulation, viewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkStep } from '@angular/cdk/stepper';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-stepper-bypass',

  imports: [
    CdkStep,
    StepperComponent,
    MatFormField,
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './stepper-test.component.html',
})
class TestStepperComponent {
  private fb = inject(FormBuilder);

  readonly stepper = viewChild.required<StepperComponent>('stepper');
  testForm;
  firstStep;
  secondStep;
  constructor() {
    this.firstStep = this.fb.group({
      firstControl: ['', [Validators.required]],
    });
    this.secondStep = this.fb.group({
      secondControl: ['', [Validators.required]],
    });
    this.testForm = this.fb.group({
      steps: this.fb.array([this.firstStep, this.secondStep]),
    });
  }
}

describe('StepperComponent', () => {
  let component: TestStepperComponent;
  let fixture: ComponentFixture<TestStepperComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperComponent, TestStepperComponent, NoopAnimationsModule],
    })
      .overrideComponent(TestStepperComponent, {
        set: { encapsulation: ViewEncapsulation.None },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TestStepperComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have title', () => {
    expect(fixture.nativeElement.querySelector('.form-header')).toBeTruthy();
  });

  it('should not mark selected step touched if not interacted', () => {
    component.stepper().nextClick();

    expect(component.firstStep.touched).toBeFalse();
  });

  it('should mark selected step touched if interacted', () => {
    const button = compiled.querySelector(
      '.form-button-forward'
    ) as HTMLButtonElement;
    button.click();

    expect(component.firstStep.touched).toBeTrue();
  });
});
