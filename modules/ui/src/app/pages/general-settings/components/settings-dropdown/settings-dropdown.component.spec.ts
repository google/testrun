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
import { SettingOption, SystemInterfaces } from '../../../../model/setting';
import { LOG_LEVELS, MONITORING_PERIOD } from '../../general-settings.store';

/** IDs referenced by an ID reference list attribute, e.g. `aria-labelledby`. */
function idRefsOf(element: Element, attribute: string): string[] {
  return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

/** Text of the elements referenced by an `aria-labelledby` or `aria-describedby` value. */
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

/** Ports as listed by the API: a name without spaces and a MAC address. */
const PORTS: SystemInterfaces = {
  enx00e04c020fa8: '00:e0:4c:02:0f:a8',
  enx207bd26205e9: '20:7b:d2:62:05:e9',
};

interface SettingsRow {
  key: string;
  groupLabel: string;
  description: string;
  label: string;
  options: SystemInterfaces;
  value: SettingOption;
  hasInfo: boolean;
}

/**
 * The four dropdowns of the General Settings page, each set to its longest
 * option.
 */
const GENERAL_SETTINGS_ROWS: SettingsRow[] = [
  {
    key: 'device',
    groupLabel: 'Device port',
    description: 'Port where IoT device is connected for testing',
    label: 'Device connection port',
    options: PORTS,
    value: { key: 'enx00e04c020fa8', value: '00:e0:4c:02:0f:a8' },
    hasInfo: true,
  },
  {
    key: 'internet',
    groupLabel: 'Internet port',
    description: 'Port used for internet connection',
    label: 'Internet connection port',
    options: PORTS,
    value: { key: 'enx207bd26205e9', value: '20:7b:d2:62:05:e9' },
    hasInfo: true,
  },
  {
    key: 'log-level',
    groupLabel: 'Log level',
    description: 'Logging level of details',
    label: 'Log level',
    options: LOG_LEVELS,
    value: { key: 'WARNING', value: LOG_LEVELS.WARNING },
    hasInfo: false,
  },
  {
    key: 'monitoring-period',
    groupLabel: 'Monitoring Time',
    description:
      'Time period for Testrun to observe the device before starting tests',
    label: 'Monitoring period',
    options: MONITORING_PERIOD,
    value: { key: '30', value: MONITORING_PERIOD[30] },
    hasInfo: false,
  },
];

/** The dropdown rows of the General Settings page, with their instructions. */
@Component({
  template: `
    <form [formGroup]="form">
      @for (row of rows; track row.key) {
        <app-settings-dropdown
          [controlName]="row.key"
          [key]="row.key"
          [groupLabel]="row.groupLabel"
          [description]="row.description"
          [label]="row.label"
          [options]="row.options"
          [hasInfo]="row.hasInfo">
          @if (row.hasInfo) {
            <p class="message">This port is required</p>
            <p class="message">
              If a port is missing from this list, you can Refresh the System
              settings
            </p>
          }
        </app-settings-dropdown>
      }
    </form>
  `,
  // As styled by GeneralSettingsComponent.
  styles: '.message { margin: 0; font-size: 14px; line-height: 20px; }',
  imports: [ReactiveFormsModule, SettingsDropdownComponent],
})
class GeneralSettingsRowsHostComponent {
  public form = new FormGroup({});
  public rows = GENERAL_SETTINGS_ROWS;
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

  describe('accessible name', () => {
    /** The name a screen reader announces for the select. */
    function accessibleName(): string {
      return textOfIdRefs(select.getAttribute('aria-labelledby'));
    }

    it('should be labelled by the visible label, then by the value it shows', () => {
      const shownValue = select.querySelector('.mat-mdc-select-value');

      expect(idRefsOf(select, 'aria-labelledby')).toEqual([
        'test-label',
        shownValue?.id as string,
      ]);
      expect(select.hasAttribute('aria-label'))
        .withContext('aria-label would override aria-labelledby')
        .toBeFalse();
    });

    it('should include the visible placeholder while no option is selected', () => {
      expect(accessibleName()).toBe('Test port Test port label');
    });

    it('should include the selected option', () => {
      component.control.setValue(MOCK_DEVICE_VALUE);
      fixture.detectChanges();

      expect(accessibleName()).toBe('Test port mockDeviceKey mockDeviceValue');
    });

    it('should follow the option selected with the arrow keys', async () => {
      const matSelect =
        await TestbedHarnessEnvironment.loader(fixture).getHarness(
          MatSelectHarness
        );
      const trigger = await matSelect.host();

      await trigger.sendKeys(TestKey.DOWN_ARROW);

      expect(accessibleName()).toBe('Test port mockDeviceKey mockDeviceValue');

      await trigger.sendKeys(TestKey.DOWN_ARROW);

      expect(accessibleName()).toBe(
        'Test port mockInternetKey mockInternetValue'
      );
      expect(await matSelect.isOpen())
        .withContext('the closed select changes its value in place')
        .toBeFalse();
    });

    it('should keep the selected option in the name while the options are shown', async () => {
      component.control.setValue(MOCK_DEVICE_VALUE);
      fixture.detectChanges();
      const matSelect =
        await TestbedHarnessEnvironment.loader(fixture).getHarness(
          MatSelectHarness
        );

      await matSelect.open();

      const listbox = document.getElementById(
        select.getAttribute('aria-controls') ?? ''
      ) as HTMLElement;
      expect(accessibleName()).toBe('Test port mockDeviceKey mockDeviceValue');
      expect(textOfIdRefs(listbox.getAttribute('aria-labelledby')))
        .withContext('the options are named by the setting label first')
        .toMatch(/^Test port\b/);
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

  describe('on the General Settings page', () => {
    let rowsFixture: ComponentFixture<GeneralSettingsRowsHostComponent>;
    let rowsHost: GeneralSettingsRowsHostComponent;
    let form: HTMLFormElement;

    /** The `app-settings-dropdown` row of a setting. */
    function rowOf(setting: SettingsRow): HTMLElement {
      return form
        .querySelector(`#${setting.key}-group`)
        ?.closest('app-settings-dropdown') as HTMLElement;
    }

    function boxOf(row: HTMLElement, selector: string): DOMRect {
      return (
        row.querySelector(selector) as HTMLElement
      ).getBoundingClientRect();
    }

    /**
     * Checks that the select shows the whole text, i.e. its value or
     * placeholder, without clipping any of it.
     */
    function expectWholeTextVisible(setting: SettingsRow, text: string): void {
      const value = rowOf(setting).querySelector(
        '.mat-mdc-select-value'
      ) as HTMLElement;

      expect(value.textContent?.replace(/\s+/g, ' ').trim())
        .withContext(`${setting.groupLabel}: shown text`)
        .toBe(text);
      expect(value.clientWidth)
        .withContext(`${setting.groupLabel}: width of "${text}"`)
        .toBeGreaterThan(0);
      expect(value.scrollWidth)
        .withContext(`${setting.groupLabel}: clipped "${text}"`)
        .toBeLessThanOrEqual(value.clientWidth);
    }

    function expectWholeValuesVisible(): void {
      for (const setting of GENERAL_SETTINGS_ROWS) {
        expectWholeTextVisible(
          setting,
          `${setting.value.key} ${setting.value.value}`
        );
      }
    }

    beforeEach(async () => {
      rowsFixture = TestBed.createComponent(GeneralSettingsRowsHostComponent);
      rowsHost = rowsFixture.componentInstance;
      rowsFixture.detectChanges();
      for (const setting of GENERAL_SETTINGS_ROWS) {
        rowsHost.form.get(setting.key)?.setValue(setting.value);
      }
      rowsFixture.detectChanges();
      await rowsFixture.whenStable();
      form = (rowsFixture.nativeElement as HTMLElement).querySelector(
        'form'
      ) as HTMLFormElement;
    });

    describe('accessible names', () => {
      /** The name a screen reader announces for the select of a setting. */
      function accessibleNameOf(setting: SettingsRow): string {
        const select = form.querySelector(`#${setting.key}-group`);

        return textOfIdRefs(select?.getAttribute('aria-labelledby') ?? null);
      }

      it('should name every dropdown by its label and selected value', () => {
        expect(GENERAL_SETTINGS_ROWS.map(accessibleNameOf)).toEqual([
          'Device port enx00e04c020fa8 00:e0:4c:02:0f:a8',
          'Internet port enx207bd26205e9 20:7b:d2:62:05:e9',
          'Log level WARNING Warnings, errors, critical issues',
          'Monitoring Time 30 Extremely fast device',
        ]);
      });

      it('should name an empty dropdown by its label and visible placeholder', () => {
        const [, internet] = GENERAL_SETTINGS_ROWS;
        rowsHost.form.get(internet.key)?.setValue(null);
        rowsFixture.detectChanges();

        expect(accessibleNameOf(internet)).toBe(
          'Internet port Internet connection port'
        );
      });

      it('should leave a missing subtitle out of the name', () => {
        const monitoring = GENERAL_SETTINGS_ROWS[3];
        rowsHost.form
          .get(monitoring.key)
          ?.setValue({ key: '60', value: MONITORING_PERIOD[60] });
        rowsFixture.detectChanges();

        expect(accessibleNameOf(monitoring)).toBe('Monitoring Time 60');
      });
    });

    // Widths of the rows measured on the page at each viewport size.
    for (const { zoom, viewport, rowWidth } of [
      { zoom: '200%', viewport: '640×480', rowWidth: 471 },
      { zoom: '400%', viewport: '320×256', rowWidth: 147 },
    ]) {
      describe(`at ${zoom} zoom (${viewport} viewport, ${rowWidth}px rows)`, () => {
        beforeEach(() => {
          form.style.width = `${rowWidth}px`;
        });

        it('should show the whole selected value of every dropdown', () => {
          expectWholeValuesVisible();
        });

        it('should show the whole placeholder of an empty dropdown', () => {
          const [device] = GENERAL_SETTINGS_ROWS;
          rowsHost.form.get(device.key)?.setValue(null);
          rowsFixture.detectChanges();

          expectWholeTextVisible(device, device.label);
        });

        it('should stack the label, the select and the instructions in reading order', () => {
          for (const setting of GENERAL_SETTINGS_ROWS) {
            const row = rowOf(setting);
            const label = boxOf(row, '.label-column');
            const select = boxOf(row, 'mat-form-field');
            const info = boxOf(row, '.info-column');

            expect(select.top)
              .withContext(`${setting.groupLabel}: select below the label`)
              .toBeGreaterThanOrEqual(label.bottom);
            expect(info.top)
              .withContext(
                `${setting.groupLabel}: instructions below the select`
              )
              .toBeGreaterThanOrEqual(select.bottom);
            expect(select.width)
              .withContext(`${setting.groupLabel}: select as wide as the row`)
              .toBeCloseTo(row.clientWidth, 0);
          }
        });

        it('should fit every dropdown in its row without horizontal scrolling', () => {
          for (const setting of GENERAL_SETTINGS_ROWS) {
            const row = rowOf(setting);
            const { left, right } = row.getBoundingClientRect();

            expect(row.scrollWidth)
              .withContext(`${setting.groupLabel}: horizontal overflow`)
              .toBeLessThanOrEqual(row.clientWidth);
            for (const selector of [
              '.label-column',
              'mat-form-field',
              '.info-column',
            ]) {
              const column = boxOf(row, selector);
              expect(column.left)
                .withContext(`${setting.groupLabel}: left of ${selector}`)
                .toBeGreaterThanOrEqual(left);
              expect(column.right)
                .withContext(`${setting.groupLabel}: right of ${selector}`)
                .toBeLessThanOrEqual(right);
            }
          }
        });

        it('should wrap long options in the open dropdown instead of scrolling it sideways', async () => {
          const [device] = GENERAL_SETTINGS_ROWS;
          const select = await TestbedHarnessEnvironment.loader(
            rowsFixture
          ).getHarness(
            MatSelectHarness.with({ selector: `#${device.key}-group` })
          );

          await select.open();

          const panel = document.querySelector(
            '.mat-mdc-select-panel'
          ) as HTMLElement;
          expect(panel.querySelectorAll('mat-option').length)
            .withContext('options')
            .toBe(Object.keys(PORTS).length);
          expect(panel.scrollWidth)
            .withContext('horizontal overflow')
            .toBeLessThanOrEqual(panel.clientWidth);
        });
      });
    }

    for (const { name, rowWidth } of [
      { name: 'at 100% zoom (1280×960 viewport, 1115px rows)', rowWidth: 1115 },
      {
        name: 'in the narrowest rows with three columns (816px)',
        rowWidth: 816,
      },
    ]) {
      describe(name, () => {
        beforeEach(() => {
          form.style.width = `${rowWidth}px`;
        });

        it('should keep the label, the select and the instructions side by side', () => {
          for (const setting of GENERAL_SETTINGS_ROWS) {
            const row = rowOf(setting);
            const label = boxOf(row, '.label-column');
            const select = boxOf(row, 'mat-form-field');
            const info = boxOf(row, '.info-column');

            expect(select.left)
              .withContext(`${setting.groupLabel}: select after the label`)
              .toBeGreaterThanOrEqual(label.right);
            expect(info.left)
              .withContext(
                `${setting.groupLabel}: instructions after the select`
              )
              .toBeGreaterThanOrEqual(select.right);
            expect([select.top, info.top])
              .withContext(`${setting.groupLabel}: tops of a single row`)
              .toEqual([label.top, label.top]);
          }
        });

        it('should show the whole selected value of every dropdown', () => {
          expectWholeValuesVisible();
        });
      });
    }
  });
});
