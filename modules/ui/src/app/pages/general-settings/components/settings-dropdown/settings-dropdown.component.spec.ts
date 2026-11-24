import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsDropdownComponent } from './settings-dropdown.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import {
  MOCK_DEVICE_VALUE,
  MOCK_INTERFACES,
} from '../../../../mocks/settings.mock';

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

type Rgb = [number, number, number];

/** Parses a computed `rgb()`/`rgba()` or `color(srgb …)` value; alpha is ignored. */
function parseColor(value: string): Rgb {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  if (srgb) {
    return [
      Number(srgb[1]) * 255,
      Number(srgb[2]) * 255,
      Number(srgb[3]) * 255,
    ];
  }
  const rgb = /^rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)/.exec(value);
  if (!rgb) {
    throw new Error(`Unsupported color format: ${value}`);
  }
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio (1–21) between two computed colors. */
function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [
    luminance(parseColor(foreground)),
    luminance(parseColor(background)),
  ].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** First non-transparent background of the element or its ancestors. */
function effectiveBackground(element: Element): string {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
      return background;
    }
  }
  return 'rgb(255, 255, 255)';
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

  describe('option text contrast', () => {
    /** The white General Settings page behind the closed select. */
    const PAGE_BACKGROUND = 'rgb(255, 255, 255)';
    /** The #f0f4f9 select panel. */
    const PANEL_BACKGROUND = 'rgb(240, 244, 249)';
    /** The #c2e7ff selected and keyboard-highlighted options. */
    const HIGHLIGHT_BACKGROUND = 'rgb(194, 231, 255)';

    let matSelect: MatSelectHarness;

    beforeEach(async () => {
      // A saved port, shown as its name over a subtitle such as its IP address.
      component.control.setValue(MOCK_DEVICE_VALUE);
      fixture.detectChanges();
      matSelect =
        await TestbedHarnessEnvironment.loader(fixture).getHarness(
          MatSelectHarness
        );
    });

    /**
     * Checks that both lines of an option, the name and the subtitle below
     * it, sit on the expected background with at least the 4.5:1 contrast
     * required for 16px regular text (WCAG 1.4.3).
     */
    function expectReadableOptionText(
      option: Element | null,
      background: string
    ): void {
      const lines = Array.from(
        option?.querySelectorAll<HTMLElement>('.option-value') ?? []
      );
      expect(lines.length).withContext('lines of option text').toBe(2);

      for (const line of lines) {
        expect(effectiveBackground(line))
          .withContext(`${line.className} background`)
          .toBe(background);
        const ratio = contrastRatio(getComputedStyle(line).color, background);
        expect(ratio)
          .withContext(`${line.className}: ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(4.5);
      }
    }

    function subtitleOf(option: Element | null): string | undefined {
      return option?.querySelector('.option-value.bottom')?.textContent?.trim();
    }

    it('should show the selected value with at least 4.5:1 contrast in the closed select', () => {
      const trigger = select.querySelector('.mat-mdc-select-trigger');

      expect(subtitleOf(trigger)).toBe('mockDeviceValue');
      expectReadableOptionText(trigger, PAGE_BACKGROUND);
    });

    describe('when open', () => {
      let listbox: HTMLElement;

      beforeEach(async () => {
        await matSelect.open();
        listbox = document.getElementById(
          select.getAttribute('aria-controls') ?? ''
        ) as HTMLElement;
      });

      it('should show unselected options with at least 4.5:1 contrast', () => {
        const option = listbox.querySelector(
          'mat-option[aria-selected="false"]'
        );

        expect(subtitleOf(option)).toBe('mockInternetValue');
        expectReadableOptionText(option, PANEL_BACKGROUND);
      });

      it('should show the selected option with at least 4.5:1 contrast', () => {
        const option = listbox.querySelector(
          'mat-option[aria-selected="true"]'
        );

        expect(subtitleOf(option)).toBe('mockDeviceValue');
        expectReadableOptionText(option, HIGHLIGHT_BACKGROUND);
      });

      it('should keep options readable while moving through them with the keyboard', async () => {
        await (await matSelect.host()).sendKeys(TestKey.DOWN_ARROW);

        const highlighted = document.getElementById(
          select.getAttribute('aria-activedescendant') ?? ''
        );
        expect(subtitleOf(highlighted))
          .withContext('the highlight moved to the unselected option')
          .toBe('mockInternetValue');
        expectReadableOptionText(highlighted, HIGHLIGHT_BACKGROUND);
        expectReadableOptionText(
          listbox.querySelector('mat-option[aria-selected="true"]'),
          HIGHLIGHT_BACKGROUND
        );
      });
    });
  });
});
