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
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { TestrunTableComponent } from './testrun-table.component';

import {
  IResult,
  RequiredResult,
  StatusOfTestResult,
} from '../../../../model/testrun-status';
import {
  TEST_DATA,
  TEST_DATA_RESULT,
  TEST_DATA_RESULT_WITH_RECOMMENDATIONS,
} from '../../../../mocks/testrun.mock';
import { TestRunService } from '../../../../services/test-run.service';
import { Component, Input } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { TestResultDialogComponent } from '../test-result-dialog/test-result-dialog.component';

describe('ProgressTableComponent', () => {
  let component: TestrunTableComponent;
  let fixture: ComponentFixture<TestrunTableComponent>;

  const testRunServiceMock = jasmine.createSpyObj(['getResultClass']);

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [TestrunTableComponent],
        providers: [{ provide: TestRunService, useValue: testRunServiceMock }],
      });
      fixture = TestBed.createComponent(TestrunTableComponent);
      component = fixture.componentInstance;
      component.dataSource = TEST_DATA.results;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#getResultClass should call the service method getResultClass"', () => {
      const expectedResult = {
        green: false,
        red: true,
        blue: false,
        cyan: false,
        grey: false,
      };

      testRunServiceMock.getResultClass.and.returnValue(expectedResult);

      const result = component.getResultClass(StatusOfTestResult.NonCompliant);

      expect(testRunServiceMock.getResultClass).toHaveBeenCalledWith(
        StatusOfTestResult.NonCompliant
      );
      expect(result).toEqual(expectedResult);
    });

    it('#trackTest should return name and status', () => {
      expect(component.trackTest(1, TEST_DATA_RESULT[0])).toEqual(
        'dns.network.hostname_resolutionCompliant'
      );
    });

    it('#getRequiredResultClass should return class', () => {
      const result1 = component.getRequiredResultClass(
        RequiredResult.Informational
      );
      const result2 = component.getRequiredResultClass(
        RequiredResult.RequiredIfApplicable
      );
      const result3 = component.getRequiredResultClass(RequiredResult.Required);

      expect(result1).toEqual('informational');
      expect(result2).toEqual('required-if-applicable');
      expect(result3).toEqual('required');
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [FakeCalloutComponent],
        providers: [{ provide: TestRunService, useValue: testRunServiceMock }],
        imports: [
          BrowserAnimationsModule,
          MatIconModule,
          TestrunTableComponent,
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(TestrunTableComponent);
      component = fixture.componentInstance;
      compiled = fixture.nativeElement as HTMLElement;
    });

    describe('with not dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource = undefined;
        fixture.detectChanges();
      });

      it('should be unavailable', () => {
        const tests = compiled.querySelector('mat-table');

        expect(tests).toBeNull();
      });
    });

    describe('with dataSource$ data', () => {
      beforeEach(() => {
        component.dataSource = TEST_DATA.results;
        fixture.detectChanges();
      });

      it('should be available', () => {
        const tests = compiled.querySelector('mat-table');

        expect(tests).not.toBeNull();
      });

      it('should have rows as provided from data', () => {
        const expectedRowsLength = (TEST_DATA.results as IResult[]).length;
        const testsRows = compiled.querySelectorAll('mat-row');

        expect(testsRows.length).toBe(expectedRowsLength);
      });

      it('should maintain readable minimum column widths for Name and Description at 200% zoom (475px container)', () => {
        compiled.style.width = '475px';
        fixture.detectChanges();

        const tableEl = compiled.querySelector('mat-table') as HTMLElement;
        const nameCell = compiled.querySelector(
          'mat-cell.mat-column-name'
        ) as HTMLElement;
        const descriptionCell = compiled.querySelector(
          'mat-cell.mat-column-description'
        ) as HTMLElement;

        expect(tableEl.getBoundingClientRect().width).toBeGreaterThanOrEqual(
          640
        );
        expect(nameCell.getBoundingClientRect().width).toBeGreaterThanOrEqual(
          150
        );
        expect(
          descriptionCell.getBoundingClientRect().width
        ).toBeGreaterThanOrEqual(180);
      });
    });

    describe('with recommendations', () => {
      beforeEach(() => {
        component.dataSource = TEST_DATA_RESULT_WITH_RECOMMENDATIONS;
        fixture.detectChanges();
      });

      it('should have clickable row', () => {
        const clickableRow = compiled.querySelector('mat-row.clickable-row');

        expect(clickableRow).not.toBeNull();
      });

      it('#onRowSelected should open test result modal', fakeAsync(() => {
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof TestResultDialogComponent>);
        tick();

        const testResult = TEST_DATA_RESULT_WITH_RECOMMENDATIONS[0];
        component.onRowSelected(testResult);
        tick();

        expect(openSpy).toHaveBeenCalledWith(TestResultDialogComponent, {
          ariaModal: true,
          data: {
            testResult,
          },
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: ['simple-dialog'],
        });

        openSpy.calls.reset();
      }));
    });

    describe('accessibility', () => {
      const INSTRUCTIONS =
        'Select the info button on any non-compliant or error test row to view detailed test results and steps to resolve.';
      const NON_COMPLIANT_WITH_STEPS = TEST_DATA_RESULT_WITH_RECOMMENDATIONS[0];
      const ERROR_WITH_DETAILS: IResult = {
        name: 'ntp.network.ntp_support',
        description: 'An error occurred whilst running this test',
        result: StatusOfTestResult.Error,
        details: 'NTP server capture file not found',
        required_result: RequiredResult.Required,
      };
      const ERROR_WITHOUT_DETAILS: IResult = {
        name: 'dns.mdns',
        description: 'An error occurred whilst running this test',
        result: StatusOfTestResult.Error,
        required_result: RequiredResult.Informational,
      };
      // The API also sends details for passed tests; they stay inline under
      // the description, so these rows get no details dialog.
      const COMPLIANT_WITH_DETAILS: IResult = {
        name: 'ntp.network.ntp_dhcp',
        description: 'Device sent NTP request to DHCP provided server',
        result: StatusOfTestResult.Compliant,
        details: 'NTP request to 10.10.10.5',
        required_result: RequiredResult.Required,
      };
      const DETAILS_BUTTON = 'mat-cell.mat-column-clickableIcon button';

      const getRows = (): HTMLElement[] =>
        Array.from(compiled.querySelectorAll<HTMLElement>('mat-row'));
      const getRowName = (row: HTMLElement): string =>
        row.querySelector('mat-cell.mat-column-name')?.textContent?.trim() ??
        '';
      const getRow = (name: string): HTMLElement =>
        getRows().find(row => getRowName(row) === name) as HTMLElement;
      const getDetailsButton = (name: string): HTMLButtonElement | null =>
        getRow(name).querySelector<HTMLButtonElement>(DETAILS_BUTTON);
      const getInstructions = (table: HTMLElement): HTMLElement | null =>
        document.getElementById(table.getAttribute('aria-describedby') ?? '');

      beforeEach(() => {
        component.dataSource = [
          TEST_DATA_RESULT[0],
          NON_COMPLIANT_WITH_STEPS,
          ERROR_WITH_DETAILS,
          ERROR_WITHOUT_DETAILS,
          COMPLIANT_WITH_DETAILS,
        ];
        fixture.detectChanges();
      });

      it('should name the table and describe it by the visible instructions above it', () => {
        const table = compiled.querySelector('mat-table') as HTMLElement;

        expect(table.getAttribute('role')).toBe('table');
        expect(table.getAttribute('aria-label')).toBe('Test results');
        expect(textOfIdRefs(table.getAttribute('aria-describedby'))).toBe(
          INSTRUCTIONS
        );
        const instructions = getInstructions(table);
        expect(instructions).withContext('instructions').not.toBeNull();
        expect(instructions?.getBoundingClientRect().width).toBeGreaterThan(1);
        expect(instructions?.getBoundingClientRect().height).toBeGreaterThan(1);
        expect(
          (instructions?.compareDocumentPosition(table) ?? 0) &
            Node.DOCUMENT_POSITION_FOLLOWING
        )
          .withContext('the instructions are read before the table')
          .toBeTruthy();
      });

      it('should show the instructions with at least 4.5:1 text contrast', () => {
        const table = compiled.querySelector('mat-table') as HTMLElement;
        const instructions = getInstructions(table) as HTMLElement;
        expect(instructions).withContext('instructions').not.toBeNull();

        const ratio = contrastRatio(
          getComputedStyle(instructions).color,
          effectiveBackground(instructions)
        );

        expect(ratio)
          .withContext(`contrast ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(4.5);
      });

      it('should name the details column header with text, not only an aria-label', () => {
        const header = compiled.querySelector(
          'mat-header-cell.mat-column-clickableIcon'
        ) as HTMLElement;
        const headerText = header.querySelector('span');

        expect(header.getAttribute('role')).toBe('columnheader');
        expect(header.textContent?.trim()).toBe('Details');
        expect(header.hasAttribute('aria-label'))
          .withContext('the header text is its only name')
          .toBeFalse();
        // Visually hidden: the 50px icon column has no room for the word.
        expect(headerText?.getBoundingClientRect().width).toBeLessThanOrEqual(
          1
        );
        expect(headerText?.getBoundingClientRect().height).toBeLessThanOrEqual(
          1
        );
      });

      it('should keep table rows out of the tab order', () => {
        const rows = getRows();

        expect(rows.length).toBe(5);
        rows.forEach(row => {
          expect(row.getAttribute('role'))
            .withContext(getRowName(row))
            .toBe('row');
          expect(row.hasAttribute('tabindex'))
            .withContext(getRowName(row))
            .toBeFalse();
        });
      });

      it('should offer a details button that announces it opens a dialog', () => {
        const button = getDetailsButton(NON_COMPLIANT_WITH_STEPS.name);

        expect(button?.tagName).toBe('BUTTON');
        expect(button?.type).toBe('button');
        expect(button?.disabled).toBeFalse();
        expect(button?.getAttribute('aria-haspopup')).toBe('dialog');
        expect(button?.getAttribute('aria-label')).toBe(
          'View test details and steps to resolve for dns.network.from_dhcp'
        );
        expect(
          button?.querySelector('mat-icon')?.getAttribute('aria-hidden')
        ).toBe('true');
      });

      it('should offer a details button for error results with details', () => {
        expect(
          getDetailsButton(ERROR_WITH_DETAILS.name)?.getAttribute('aria-label')
        ).toBe('View test details for ntp.network.ntp_support');
      });

      it('should offer the details button only for results with steps to resolve or error details', () => {
        const rowsWithButton = getRows()
          .filter(row => row.querySelector(DETAILS_BUTTON))
          .map(getRowName);

        expect(rowsWithButton).toEqual([
          NON_COMPLIANT_WITH_STEPS.name,
          ERROR_WITH_DETAILS.name,
        ]);
      });

      it('should show the accessible name as a tooltip without announcing it twice', async () => {
        await fixture.whenStable(); // AriaDescriber updates aria-describedby asynchronously
        const buttons = fixture.debugElement.queryAll(By.css(DETAILS_BUTTON));

        expect(buttons.length).toBe(2);
        buttons.forEach(({ nativeElement, injector }) => {
          const button = nativeElement as HTMLButtonElement;
          expect(injector.get(MatTooltip).message).toBe(
            button.getAttribute('aria-label') as string
          );
          expect(button.hasAttribute('aria-describedby')).toBeFalse();
        });
      });

      it('should open the test result dialog once when the details button is clicked', () => {
        const openSpy = spyOn(component.dialog, 'open');

        getDetailsButton(ERROR_WITH_DETAILS.name)?.click();

        expect(openSpy).toHaveBeenCalledOnceWith(
          TestResultDialogComponent,
          jasmine.objectContaining({
            ariaModal: true,
            data: { testResult: ERROR_WITH_DETAILS },
          })
        );
        expect(openSpy.calls.mostRecent().args[1]?.ariaLabel)
          .withContext('a static name would override the test name heading')
          .toBeUndefined();
      });

      it('should leave Enter and Space to the native details button so the dialog opens once', () => {
        const openSpy = spyOn(component.dialog, 'open');
        const button = getDetailsButton(NON_COMPLIANT_WITH_STEPS.name);
        expect(button).withContext('details button').not.toBeNull();

        // The browser turns Enter and Space on a <button> into one click; rows
        // must not handle these keys as well and open a second dialog.
        button?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
        button?.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', bubbles: true })
        );

        expect(openSpy).not.toHaveBeenCalled();
      });

      it('should return focus to the details button when the dialog is closed with Escape', async () => {
        const button = getDetailsButton(
          ERROR_WITH_DETAILS.name
        ) as HTMLButtonElement;
        expect(button).withContext('details button').not.toBeNull();
        const rootLoader =
          TestbedHarnessEnvironment.documentRootLoader(fixture);

        button.focus();
        button.click();
        const dialog = await rootLoader.getHarness(MatDialogHarness);
        expect(textOfIdRefs(await dialog.getAriaLabelledby())).toBe(
          ERROR_WITH_DETAILS.name
        );

        await dialog.close();
        await fixture.whenStable();

        expect(await rootLoader.getAllHarnesses(MatDialogHarness)).toEqual([]);
        expect(document.activeElement).toBe(button);
      });

      it('should still open the dialog when a mouse user clicks an error row with details', () => {
        const openSpy = spyOn(component.dialog, 'open');

        (
          getRow(ERROR_WITH_DETAILS.name).querySelector(
            'mat-cell.mat-column-description'
          ) as HTMLElement
        ).click();

        expect(openSpy).toHaveBeenCalledOnceWith(
          TestResultDialogComponent,
          jasmine.objectContaining({ data: { testResult: ERROR_WITH_DETAILS } })
        );
      });

      // Cells clip their content with `overflow: hidden`.
      it('should fit the details button and its keyboard focus ring inside its cell', () => {
        const button = getDetailsButton(
          ERROR_WITH_DETAILS.name
        ) as HTMLButtonElement;
        expect(button).withContext('details button').not.toBeNull();

        button.focus();

        expect(button.matches(':focus-visible'))
          .withContext(
            'DIAG ' +
              JSON.stringify({
                hasFocus: document.hasFocus(),
                active: document.activeElement === button,
                visibility: document.visibilityState,
              })
          )
          .toBeTrue();
        const style = getComputedStyle(button);
        expect(style.outlineStyle).toBe('solid');
        const ring =
          parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        const box = button.getBoundingClientRect();
        const cell = (
          button.closest('mat-cell') as HTMLElement
        ).getBoundingClientRect();
        // WCAG 2.5.8 Target Size (Minimum).
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
        expect(box.left - ring).toBeGreaterThanOrEqual(cell.left);
        expect(box.right + ring).toBeLessThanOrEqual(cell.right);
        expect(box.top - ring).toBeGreaterThanOrEqual(cell.top);
        expect(box.bottom + ring).toBeLessThanOrEqual(cell.bottom);
      });

      it('should not make single-line rows with a details button any taller', () => {
        compiled.style.width = '1100px';
        fixture.componentRef.setInput('dataSource', [
          { ...NON_COMPLIANT_WITH_STEPS, name: 'dns.a', description: 'Short' },
          { ...TEST_DATA_RESULT[0], name: 'dns.b', description: 'Short' },
        ]);
        fixture.detectChanges();

        const [rowWithButton, rowWithoutButton] = getRows();
        expect(rowWithButton.querySelector(DETAILS_BUTTON))
          .withContext('details button')
          .not.toBeNull();
        expect(rowWithButton.getBoundingClientRect().height).toBe(
          rowWithoutButton.getBoundingClientRect().height
        );
        expect(rowWithoutButton.getBoundingClientRect().height).toBe(
          parseFloat(getComputedStyle(rowWithoutButton).minHeight)
        );
      });

      describe('test result dialog (WCAG 1.3.1, 2.4.6, 4.1.2)', () => {
        afterEach(() => {
          component.dialog.closeAll();
        });

        /** Activates the details button of a result and returns the `role="dialog"` element it opens. */
        async function openTestResultDialog(
          result: IResult
        ): Promise<HTMLElement> {
          getDetailsButton(result.name)?.click();
          // The click runs in the Angular zone, which renders the dialog in the
          // CDK overlay; `mat-dialog-title` then registers its id in a microtask.
          await fixture.whenStable();
          return document.querySelector(
            '.simple-dialog mat-dialog-container'
          ) as HTMLElement;
        }

        it('should mark the dialog as modal', async () => {
          const dialog = await openTestResultDialog(ERROR_WITH_DETAILS);

          expect(dialog.getAttribute('role')).toBe('dialog');
          expect(dialog.getAttribute('aria-modal')).toBe('true');
        });

        it('should name the dialog by the test name, its only, level 2, heading', async () => {
          const dialog = await openTestResultDialog(NON_COMPLIANT_WITH_STEPS);
          const heading = dialog.querySelector('h2') as HTMLElement;

          expect(textOfIdRefs(dialog.getAttribute('aria-labelledby'))).toBe(
            'dns.network.from_dhcp'
          );
          expect(dialog.getAttribute('aria-labelledby')).toBe(heading?.id);
          // A static name would override the test name.
          expect(dialog.hasAttribute('aria-label')).toBeFalse();
          expect(
            dialog.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')
              .length
          ).toBe(1);
        });

        it('should keep the title look', async () => {
          const dialog = await openTestResultDialog(NON_COMPLIANT_WITH_STEPS);
          const title = dialog.querySelector('.dialog-title') as HTMLElement;
          const style = getComputedStyle(title);

          // The Material dialog title margin, not the `<h2>` one.
          expect(boxSides(style, 'margin')).toEqual([
            '0px',
            '0px',
            '1px',
            '0px',
          ]);
          expect(boxSides(style, 'padding')).toEqual([
            '48px',
            '24px',
            '40px',
            '24px',
          ]);
          expect(title.offsetHeight).toBe(120);
          // Not the bold, 1.5em `<h2>` typography.
          expect(style.fontSize).toBe('24px');
          expect(style.lineHeight).toBe('32px');
          expect(style.fontWeight).toBe('500');
          expect(style.textAlign).toBe('center');
        });
      });
    });
  });
});

/** Whitespace-normalized text of the elements referenced by an ID list. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Computed top, right, bottom, and left values of `margin` or `padding`. */
function boxSides(
  style: CSSStyleDeclaration,
  property: 'margin' | 'padding'
): string[] {
  return ['top', 'right', 'bottom', 'left'].map(side =>
    style.getPropertyValue(`${property}-${side}`)
  );
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
  selector: 'app-callout',
  template: '<div></div>',
  standalone: false,
})
class FakeCalloutComponent {
  @Input() type = '';
}
