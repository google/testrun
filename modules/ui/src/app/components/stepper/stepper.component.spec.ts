import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperComponent } from './stepper.component';
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkStep } from '@angular/cdk/stepper';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-stepper-bypass',
  standalone: true,
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
  @ViewChild('stepper') public stepper!: StepperComponent;
  testForm;
  firstStep;
  secondStep;
  constructor(private fb: FormBuilder) {
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
    component.stepper.nextClick();

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