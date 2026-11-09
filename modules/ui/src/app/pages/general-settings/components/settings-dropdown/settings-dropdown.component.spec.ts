import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsDropdownComponent } from './settings-dropdown.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MOCK_INTERFACES } from '../../../../mocks/settings.mock';

@Component({
  template:
    '<form [formGroup]="testForm">' +
    '<app-settings-dropdown controlName="test" key="test" ' +
    'groupLabel="Test port" description="Test port description" ' +
    'label="Test port label" [errorId]="errorId" [options]="options">' +
    '</app-settings-dropdown></form>',
  imports: [ReactiveFormsModule, SettingsDropdownComponent],
})
class TestHostComponent {
  public testForm = new FormGroup({
    test: new FormControl(''),
  });
  public options = MOCK_INTERFACES;
  public errorId: string | null = null;
}

describe('SettingsDropdownComponent', () => {
  let host: TestHostComponent;
  let component: SettingsDropdownComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let compiled: HTMLElement;
  let select: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    component = fixture.debugElement.query(
      By.directive(SettingsDropdownComponent)
    ).componentInstance;
    select = compiled.querySelector('#test-group') as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('without errorId', () => {
    it('should be described by the description only', () => {
      expect(select.getAttribute('aria-describedby')).toEqual(
        'test-description'
      );
    });

    it('should not be marked as invalid', () => {
      expect(select.getAttribute('aria-invalid')).toEqual('false');
    });
  });

  describe('with errorId', () => {
    beforeEach(() => {
      host.errorId = 'test-error';
      fixture.detectChanges();
    });

    it('should be described by the description and the error', () => {
      expect(select.getAttribute('aria-describedby')).toEqual(
        'test-description test-error'
      );
    });

    it('should be marked as invalid', () => {
      expect(select.getAttribute('aria-invalid')).toEqual('true');
    });

    it('should display the form field in the error state', () => {
      const formField = compiled.querySelector('mat-form-field');

      expect(formField?.classList).toContain('mat-form-field-invalid');
    });

    it('should restore the description and valid state when errorId is cleared', () => {
      host.errorId = null;
      fixture.detectChanges();

      const formField = compiled.querySelector('mat-form-field');

      expect(select.getAttribute('aria-describedby')).toEqual(
        'test-description'
      );
      expect(select.getAttribute('aria-invalid')).toEqual('false');
      expect(formField?.classList).not.toContain('mat-form-field-invalid');
    });
  });

  describe('#focus', () => {
    it('should move focus to the select', () => {
      component.focus();

      expect(document.activeElement).toBe(select);
    });
  });
});
