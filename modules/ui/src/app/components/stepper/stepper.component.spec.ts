import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepperComponent } from './stepper.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-stepper-bypass',
  template:
    '<app-stepper [header]="header"></app-stepper>' +
    '  <ng-template #header> <div>Header</div></ng-template>',
})
class TestStepperComponent {}

describe('StepperComponent', () => {
  let component: TestStepperComponent;
  let fixture: ComponentFixture<TestStepperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperComponent],
      declarations: [TestStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have title', () => {
    expect(fixture.nativeElement.querySelector('.form-header')).toBeTruthy();
  });
});
