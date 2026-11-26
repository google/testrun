import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import {
  DialogCloseAction,
  DownloadZipModalComponent,
} from './download-zip-modal.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  PROFILE_MOCK,
  PROFILE_MOCK_2,
  PROFILE_MOCK_3,
} from '../../mocks/profile.mock';
import { MOCK_PROGRESS_DATA_NON_COMPLIANT } from '../../mocks/testrun.mock';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../services/test-run.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { FocusManagerService } from '../../services/focus-manager.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { device } from '../../mocks/device.mock';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';
import {
  HashLocationStrategy,
  LocationStrategy,
  PlatformLocation,
} from '@angular/common';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { Profile, ProfileRisk } from '../../model/profile';

describe('DownloadZipModalComponent', () => {
  // @ts-expect-error data layer should be defined
  window.dataLayer = window.dataLayer || [];
  let component: DownloadZipModalComponent;
  let fixture: ComponentFixture<DownloadZipModalComponent>;
  let router: Router;
  const testRunServiceMock = jasmine.createSpyObj('testRunServiceMock', [
    'getRiskClass',
    'downloadZip',
    'getReportLink',
  ]);
  const focusServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('focusServiceMock', ['focusFirstElementInContainer']);
  const actionBehaviorSubject$ = new BehaviorSubject({
    action: DialogCloseAction.Close,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        DownloadZipModalComponent,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
            beforeClosed: () => actionBehaviorSubject$.asObservable(),
          },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            profiles: [PROFILE_MOCK_2, PROFILE_MOCK],
            report: 'localhost:8080',
            export: 'localhost:8080',
            device: device,
            started: '2026-02-02 17:24:52',
          },
        },
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: FocusManagerService, useValue: focusServiceMock },
      ],
    });
  });

  describe('with profiles', () => {
    beforeEach(() => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          profiles: [PROFILE_MOCK_2, PROFILE_MOCK, PROFILE_MOCK_3],
          report: 'localhost:8080',
          export: 'localhost:8080',
          isPilot: true,
          device: device,
          started: '2026-02-02 17:24:52',
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      router = TestBed.inject(Router);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have dropdown with profiles', async () => {
      const select = fixture.nativeElement.querySelector('mat-select');

      expect(select).toBeTruthy();
    });

    it('should preselect "no profile" option', async () => {
      expect(component.selectedProfile.name).toEqual(
        'No Risk Profile selected'
      );
    });

    it('should close with Redirect action on redirect button click', fakeAsync(() => {
      const result = {
        action: DialogCloseAction.Redirect,
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();

      fixture.ngZone?.run(() => {
        const closeSpy = spyOn(component.dialogRef, 'close');
        const redirectLink = fixture.nativeElement.querySelector(
          '.redirect-link'
        ) as HTMLAnchorElement;

        redirectLink.click();

        tick(2000);

        expect(router.url).toBe(Routes.RiskAssessment);
        expect(
          focusServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();
        expect(closeSpy).toHaveBeenCalledWith(result);

        closeSpy.calls.reset();
        discardPeriodicTasks();
      });
    }));

    it('should close with Close action on cancel button click', async () => {
      const result = {
        action: DialogCloseAction.Close,
      };
      const closeSpy = spyOn(component.dialogRef, 'close');
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();

      const cancelButton = fixture.nativeElement.querySelector(
        '.cancel-button'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(closeSpy).toHaveBeenCalledWith(result);

      closeSpy.calls.reset();
    });

    it('should close with Download action and profile on download button click', async () => {
      const result = {
        action: DialogCloseAction.Download,
        profile: '',
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(closeSpy).toHaveBeenCalledWith(result);
      expect(testRunServiceMock.downloadZip).toHaveBeenCalled();
      expect(router.url).not.toBe(Routes.RiskAssessment);
      closeSpy.calls.reset();
    });

    it('should send GA event if report is for Pilot program', async () => {
      const result = {
        action: DialogCloseAction.Download,
        profile: '',
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: { event: string }) => item.event === 'pilot_download_zip'
        )
      ).toBeTruthy();
      closeSpy.calls.reset();
    });

    it('should have filtered and sorted profiles', async () => {
      expect(component.profiles).toEqual([
        component.NO_PROFILE,
        PROFILE_MOCK,
        PROFILE_MOCK_2,
      ]);
    });

    it('#getRiskClass should call the service method getRiskClass"', () => {
      const expectedResult = {
        red: true,
        cyan: false,
      };

      testRunServiceMock.getRiskClass.and.returnValue(expectedResult);

      const result = component.getRiskClass('High');

      expect(testRunServiceMock.getRiskClass).toHaveBeenCalledWith('High');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('"Download" button (WCAG 2.5.3 Label in Name)', () => {
    beforeEach(() => {
      // Other specs leave download or redirect actions in the shared subject,
      // which the component replays on init.
      actionBehaviorSubject$.next({ action: DialogCloseAction.Close });
    });

    function getDownloadButton(dialogData: object): HTMLButtonElement {
      TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });
      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      fixture.detectChanges();
      return fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;
    }

    it('should start its name with the visible "Download" text when opened from a report', () => {
      const downloadButton = getDownloadButton({
        profiles: [PROFILE_MOCK],
        report: 'localhost:8080',
        export: 'localhost:8080',
        device: device,
        started: '2026-02-02 17:24:52',
      });

      expect(visibleLabel(downloadButton)).toBe('Download');
      expect(accessibleName(downloadButton)).toBe('Download ZIP file');
      expect(downloadButton.hasAttribute('aria-label'))
        .withContext('an aria-label overrides the visible text')
        .toBeFalse();
    });

    it('should be named by its visible "Download ZIP file" text when testing is complete', () => {
      const downloadButton = getDownloadButton({
        profiles: [PROFILE_MOCK],
        testrunStatus: MOCK_PROGRESS_DATA_NON_COMPLIANT,
        isTestingComplete: true,
        report: MOCK_PROGRESS_DATA_NON_COMPLIANT.report,
        export: MOCK_PROGRESS_DATA_NON_COMPLIANT.export,
        device: MOCK_PROGRESS_DATA_NON_COMPLIANT.device,
        started: MOCK_PROGRESS_DATA_NON_COMPLIANT.started,
      });

      expect(visibleLabel(downloadButton)).toBe('Download ZIP file');
      expect(accessibleName(downloadButton))
        .withContext('"ZIP file" must not be repeated')
        .toBe('Download ZIP file');
      expect(downloadButton.hasAttribute('aria-label'))
        .withContext('an aria-label overrides the visible text')
        .toBeFalse();
    });
  });

  describe('"Risk Profile" select (WCAG 1.3.1, 3.3.2, 4.1.2)', () => {
    /** Listed right after "No Risk Profile selected": profiles are sorted by name. */
    const HIGH_RISK_PROFILE: Profile = {
      ...PROFILE_MOCK,
      risk: ProfileRisk.HIGH,
    };
    let compiled: HTMLElement;
    let select: HTMLElement;

    async function createComponent(profiles: Profile[]): Promise<void> {
      // Other specs leave download or redirect actions in the shared subject,
      // which the component replays on init.
      actionBehaviorSubject$.next({ action: DialogCloseAction.Close });
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          profiles,
          report: 'localhost:8080',
          export: 'localhost:8080',
          device: device,
          started: '2026-02-02 17:24:52',
        },
      });
      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      // MatSelect applies its initial value after a microtask.
      await fixture.whenStable();
      fixture.detectChanges();
      select = compiled.querySelector('mat-select') as HTMLElement;
    }

    function getSelectHarness(): Promise<MatSelectHarness> {
      return TestbedHarnessEnvironment.loader(fixture).getHarness(
        MatSelectHarness
      );
    }

    describe('with profiles', () => {
      beforeEach(() => createComponent([PROFILE_MOCK_2, HIGH_RISK_PROFILE]));

      it('should show a visible "Risk Profile" label', () => {
        const label = compiled.querySelector<HTMLElement>(
          '.profile-select mat-label'
        );

        expect(label ? visibleLabel(label) : null).toBe('Risk Profile');
      });

      it('should be labelled by its visible label, then by the profile it shows', () => {
        const [labelId, ...valueIds] = idRefsOf(select, 'aria-labelledby');
        const label = labelId ? document.getElementById(labelId) : null;
        const shownValue = select.querySelector('.mat-mdc-select-value');

        expect(label ? visibleLabel(label) : null)
          .withContext('first reference: the visible label')
          .toBe('Risk Profile');
        expect(valueIds)
          .withContext('then only the shown value')
          .toEqual([shownValue?.id as string]);
        expect(select.hasAttribute('aria-label'))
          .withContext('aria-label would override aria-labelledby')
          .toBeFalse();
      });

      it('should announce that no profile is selected', () => {
        expect(accessibleName(select)).toBe(
          'Risk Profile No Risk Profile selected'
        );
      });

      it('should announce the selected profile and its risk level', async () => {
        const matSelect = await getSelectHarness();

        await matSelect.clickOptions({ text: /Primary profile/ });

        expect(accessibleName(select)).toBe(
          'Risk Profile Primary profile High risk'
        );
      });

      it('should follow the profile selected with the arrow keys', async () => {
        const matSelect = await getSelectHarness();
        const trigger = await matSelect.host();

        await trigger.sendKeys(TestKey.DOWN_ARROW);

        expect(accessibleName(select)).toBe(
          'Risk Profile Primary profile High risk'
        );

        await trigger.sendKeys(TestKey.DOWN_ARROW);

        expect(accessibleName(select)).toBe('Risk Profile Second profile name');
        expect(await matSelect.isOpen())
          .withContext('the closed select changes its value in place')
          .toBeFalse();
      });

      it('should be described by its instructions, not named by them', async () => {
        await fixture.whenStable();
        fixture.detectChanges(); // Material syncs aria-describedby after content is checked

        expect(textOfIdRefs(select.getAttribute('aria-describedby'))).toBe(
          'Please choose a Risk Profile from the list'
        );
        expect(accessibleName(select))
          .withContext('the instructions must not be announced twice')
          .not.toContain('Please choose a Risk Profile from the list');
      });
    });

    describe('without profiles', () => {
      beforeEach(() => createComponent([]));

      it('should name the disabled select by its label and the shown value', () => {
        expect(select.getAttribute('aria-disabled')).toBe('true');
        expect(accessibleName(select)).toBe(
          'Risk Profile No Risk Profile selected'
        );
      });
    });
  });

  describe('"Risk Assessment" link (WCAG 2.5.3, 4.1.2)', () => {
    for (const { variant, profiles } of [
      { variant: 'with profiles', profiles: [PROFILE_MOCK] },
      { variant: 'without profiles', profiles: [] },
    ]) {
      describe(variant, () => {
        let link: HTMLAnchorElement;

        beforeEach(() => {
          // Other specs leave download or redirect actions in the shared
          // subject, which the component replays on init.
          actionBehaviorSubject$.next({ action: DialogCloseAction.Close });
          // The app writes its URLs after a hash (`useHash: true` in main.ts).
          TestBed.overrideProvider(LocationStrategy, {
            useFactory: (platformLocation: PlatformLocation) =>
              new HashLocationStrategy(platformLocation),
            deps: [PlatformLocation],
          });
          TestBed.overrideProvider(MAT_DIALOG_DATA, {
            useValue: {
              profiles,
              report: 'localhost:8080',
              export: 'localhost:8080',
              device: device,
              started: '2026-02-02 17:24:52',
            },
          });
          TestBed.compileComponents();
          fixture = TestBed.createComponent(DownloadZipModalComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          link = fixture.nativeElement.querySelector(
            '.redirect-link'
          ) as HTMLAnchorElement;
        });

        it('should be a link to the Risk Assessment page', () => {
          expect(link.getAttribute('href')).toBe('#/risk-assessment');
          expect(link.hasAttribute('role'))
            .withContext('a link with an href has the link role natively')
            .toBeFalse();
          expect(link.hasAttribute('tabindex'))
            .withContext('a link with an href is in the tab order natively')
            .toBeFalse();
          expect(link.tabIndex).toBe(0);
        });

        it('should be named by its visible "Risk Assessment" text', () => {
          expect(visibleLabel(link)).toBe('Risk Assessment');
          expect(accessibleName(link)).toBe('Risk Assessment');
          expect(link.hasAttribute('aria-label'))
            .withContext('an aria-label overrides the visible text')
            .toBeFalse();
        });

        it('should look like a link, not only by its color', () => {
          // Its color is below 3:1 against the surrounding text (WCAG 1.4.1).
          expect(getComputedStyle(link).textDecorationLine).toBe('underline');
        });

        it('should close the dialog to open the page instead of following the link', () => {
          const closeSpy = spyOn(component.dialogRef, 'close');
          let defaultPrevented = false;
          // Runs after the link's own listeners and keeps the test page in place.
          const recordDefaultPrevented = (event: Event) => {
            defaultPrevented = event.defaultPrevented;
            event.preventDefault();
          };
          document.addEventListener('click', recordDefaultPrevented);

          link.click();

          document.removeEventListener('click', recordDefaultPrevented);
          expect(defaultPrevented)
            .withContext('the page opens once the dialog closes')
            .toBeTrue();
          expect(closeSpy).toHaveBeenCalledOnceWith({
            action: DialogCloseAction.Redirect,
          });
        });

        it('should close the dialog once when activated with Enter', () => {
          const closeSpy = spyOn(component.dialogRef, 'close');
          const enter = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          });

          link.dispatchEvent(enter);
          // Synthetic events skip default actions; browsers click a link on Enter.
          if (!enter.defaultPrevented) {
            link.click();
          }

          expect(closeSpy).toHaveBeenCalledOnceWith({
            action: DialogCloseAction.Redirect,
          });
        });
      });
    }
  });

  describe('initial focus (WCAG 2.4.3)', () => {
    let compiled: HTMLElement;

    function createComponent(dialogData: object): void {
      // Other specs leave download or redirect actions in the shared subject,
      // which the component replays on init.
      actionBehaviorSubject$.next({ action: DialogCloseAction.Close });
      TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });
      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
    }

    /**
     * Moves focus as `MatDialog` does on open with `autoFocus: true` or
     * `'first-tabbable'`: to the `[cdkFocusInitial]` element, else to the first
     * tabbable one.
     */
    function focusInitialElement(): void {
      const focusTrap = TestBed.inject(FocusTrapFactory).create(compiled);
      focusTrap.focusInitialElement();
      focusTrap.destroy();
    }

    it('should start on the Risk Profile select, not on the Risk Assessment link', () => {
      createComponent({
        profiles: [PROFILE_MOCK],
        report: 'localhost:8080',
        export: 'localhost:8080',
        device: device,
        started: '2026-02-02 17:24:52',
      });

      focusInitialElement();

      expect(document.activeElement).toBe(compiled.querySelector('mat-select'));
    });

    it('should start on the Risk Profile select when testing is complete', () => {
      createComponent({
        profiles: [PROFILE_MOCK],
        testrunStatus: MOCK_PROGRESS_DATA_COMPLIANT,
        isTestingComplete: true,
        report: MOCK_PROGRESS_DATA_COMPLIANT.report,
        export: MOCK_PROGRESS_DATA_COMPLIANT.export,
        device: MOCK_PROGRESS_DATA_COMPLIANT.device,
        started: MOCK_PROGRESS_DATA_COMPLIANT.started,
      });

      focusInitialElement();

      expect(document.activeElement).toBe(compiled.querySelector('mat-select'));
    });

    it('should start on the Risk Assessment link while the select is disabled', () => {
      createComponent({
        profiles: [],
        report: 'localhost:8080',
        export: 'localhost:8080',
        device: device,
        started: '2026-02-02 17:24:52',
      });

      focusInitialElement();

      expect(document.activeElement).toBe(
        compiled.querySelector('.redirect-link')
      );
    });
  });

  describe('with no profiles', () => {
    beforeEach(() => {
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          profiles: [],
          report: 'localhost:8080',
          export: 'localhost:8080',
          device: device,
          started: '2026-02-02 17:24:52',
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      router = TestBed.inject(Router);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should have disabled dropdown', async () => {
      const select = fixture.nativeElement.querySelector('mat-select');

      expect(select.classList.contains('mat-mdc-select-disabled')).toBeTruthy();
    });

    it('should close with Redirect action on redirect button click', fakeAsync(() => {
      const result = {
        action: DialogCloseAction.Redirect,
      };
      actionBehaviorSubject$.next(result);
      fixture.detectChanges();

      fixture.ngZone?.run(() => {
        const closeSpy = spyOn(component.dialogRef, 'close');
        const redirectLink = fixture.nativeElement.querySelector(
          '.redirect-link'
        ) as HTMLAnchorElement;

        redirectLink.click();

        tick(2000);

        expect(router.url).toBe(Routes.RiskAssessment);
        expect(
          focusServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();
        expect(closeSpy).toHaveBeenCalledWith(result);

        closeSpy.calls.reset();
        discardPeriodicTasks();
      });
    }));

    it('should close with Close action on cancel button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const cancelButton = fixture.nativeElement.querySelector(
        '.cancel-button'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(closeSpy).toHaveBeenCalledWith({
        action: DialogCloseAction.Close,
      });

      closeSpy.calls.reset();
    });

    it('should close with empty profile on download button click', async () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;

      downloadButton.click();

      expect(closeSpy).toHaveBeenCalledWith({
        action: DialogCloseAction.Download,
        profile: '',
      });

      closeSpy.calls.reset();
    });
  });

  describe('when testing is complete', () => {
    let compiled: HTMLElement;

    beforeEach(() => {
      // Earlier specs leave other close actions in the shared subject.
      actionBehaviorSubject$.next({ action: DialogCloseAction.Close });
      TestBed.overrideProvider(MAT_DIALOG_DATA, {
        useValue: {
          profiles: [PROFILE_MOCK],
          testrunStatus: MOCK_PROGRESS_DATA_COMPLIANT,
          isTestingComplete: true,
          report: MOCK_PROGRESS_DATA_COMPLIANT.report,
          export: MOCK_PROGRESS_DATA_COMPLIANT.export,
          device: MOCK_PROGRESS_DATA_COMPLIANT.device,
          started: MOCK_PROGRESS_DATA_COMPLIANT.started,
        },
      });

      TestBed.compileComponents();
      fixture = TestBed.createComponent(DownloadZipModalComponent);
      component = fixture.componentInstance;
      compiled = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
    });

    const getPdfReportLink = () =>
      compiled.querySelector('app-download-report a') as HTMLAnchorElement;

    it('should render the PDF report download as one link without nested controls', () => {
      const link = getPdfReportLink();

      expect(
        compiled.querySelectorAll(
          'app-download-report a, app-download-report button'
        ).length
      )
        .withContext('interactive elements in the PDF report control')
        .toBe(1);
      expect(link.getAttribute('href')).toBe('/report/123');
      expect(link.download).toBe(
        'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20'
      );
      expect(
        link.querySelector('a, button, input, select, textarea, [tabindex]')
      )
        .withContext('interactive control nested inside the link')
        .toBeNull();
    });

    it('should name the PDF report link by its visible text, not the file name', () => {
      const link = getPdfReportLink();

      expect(link.textContent?.trim()).toBe('Download PDF report');
      expect(link.hasAttribute('aria-label')).toBeFalse();
      expect(link.hasAttribute('aria-labelledby')).toBeFalse();
    });

    it('should keep the PDF report link in the tab order', () => {
      expect(getPdfReportLink().tabIndex).toBe(0);
    });

    it('should close the dialog when the PDF report link is activated', () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const link = getPdfReportLink();
      // Stop the browser from opening the report; listeners still run.
      link.addEventListener('click', event => event.preventDefault());

      // A mouse click and Enter on a link both dispatch `click`.
      link.click();

      expect(closeSpy).toHaveBeenCalledOnceWith({
        action: DialogCloseAction.Close,
      });
    });
  });
});

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}

/** Collapses whitespace the way the accessible name computation does. */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Text of a subtree as assistive technology reads it: skips `aria-hidden` and
 * CSS-hidden nodes. With `visibleOnly`, it also skips visually hidden text
 * (clipped to 1 x 1 px), so it returns only what sighted users read.
 */
function textOf(node: Node, visibleOnly = false): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (
    !(node instanceof HTMLElement) ||
    node.getAttribute('aria-hidden') === 'true'
  ) {
    return '';
  }
  const { display, visibility } = getComputedStyle(node);
  const { width, height } = node.getBoundingClientRect();
  if (
    display === 'none' ||
    visibility === 'hidden' ||
    (visibleOnly && width <= 1 && height <= 1)
  ) {
    return '';
  }
  return Array.from(node.childNodes, child => textOf(child, visibleOnly)).join(
    ''
  );
}

/** IDs referenced by an ID reference list attribute, e.g. `aria-labelledby`. */
function idRefsOf(element: Element, attribute: string): string[] {
  return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
}

/** Accessible name of a control named by ARIA attributes or its content. */
function accessibleName(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  return normalizeWhitespace(
    labelledBy
      ? textOfIdRefs(labelledBy)
      : element.getAttribute('aria-label') || textOf(element)
  );
}

/** Text label that sighted users see on a control. */
function visibleLabel(element: HTMLElement): string {
  return normalizeWhitespace(textOf(element, true));
}
