import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsDropdownComponent } from './settings-dropdown.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MOCK_INTERFACES } from '../../../../mocks/settings.mock';

/** Text of the elements referenced by an `aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  template:
    '<form [formGroup]="testForm">' +
    '<app-settings-dropdown controlName="test" key="test" ' +
    'groupLabel="Test port" description="Test port description" ' +
    'label="Test port label" [errorId]="errorId" [options]="options" ' +
    '[required]="required" [hasInfo]="hasInfo">' +
    '<p class="message">Test port instruction</p>' +
    '</app-settings-dropdown></form>',
  imports: [ReactiveFormsModule, SettingsDropdownComponent],
})
class TestHostComponent {
  public testForm = new FormGroup({
    test: new FormControl(''),
  });
  public options = MOCK_INTERFACES;
  public errorId: string | null = null;
  public required = false;
  public hasInfo = false;
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

  describe('required', () => {
    it('should report the required state to assistive technology', () => {
      expect(select.getAttribute('aria-required')).toEqual('false');

      host.required = true;
      fixture.detectChanges();

      expect(select.getAttribute('aria-required')).toEqual('true');

      host.required = false;
      fixture.detectChanges();

      expect(select.getAttribute('aria-required')).toEqual('false');
    });
  });

  describe('with info', () => {
    beforeEach(() => {
      host.hasInfo = true;
      fixture.detectChanges();
    });

    it('should be described by the description and the info column', () => {
      expect(select.getAttribute('aria-describedby')).toEqual(
        'test-description test-info'
      );
      expect(textOfIdRefs(select.getAttribute('aria-describedby'))).toEqual(
        'Test port description Test port instruction'
      );
    });

    it('should be described by the error after the info column', () => {
      host.errorId = 'test-error';
      fixture.detectChanges();

      expect(select.getAttribute('aria-describedby')).toEqual(
        'test-description test-info test-error'
      );
    });

    it('should be described by the description only when hasInfo is cleared', () => {
      expect(select.getAttribute('aria-describedby'))
        .withContext('precondition')
        .toEqual('test-description test-info');

      host.hasInfo = false;
      fixture.detectChanges();

      expect(select.getAttribute('aria-describedby')).toEqual(
        'test-description'
      );
    });
  });

  describe('#focus', () => {
    it('should move focus to the select', () => {
      component.focus();

      expect(document.activeElement).toBe(select);
    });
  });
});
