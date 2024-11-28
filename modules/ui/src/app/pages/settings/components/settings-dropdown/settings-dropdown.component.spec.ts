import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsDropdownComponent } from './settings-dropdown.component';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component } from '@angular/core';

@Component({
  template:
    '<form><app-settings-dropdown controlName="test">' +
    '</app-settings-dropdown></form>',
  standalone: false,
})
class DummyComponent {
  public testForm!: FormGroup;
  constructor(private readonly fb: FormBuilder) {
    this.testForm = this.fb.group({
      test: [''],
    });
  }
}

describe('SettingsDropdownComponent', () => {
  let component: DummyComponent;
  let fixture: ComponentFixture<DummyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsDropdownComponent, ReactiveFormsModule, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DummyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
