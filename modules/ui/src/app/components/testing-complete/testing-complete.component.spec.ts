import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';

import { TestingCompleteComponent } from './testing-complete.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Component, NgZone } from '@angular/core';
import { MOCK_PROGRESS_DATA_COMPLIANT } from '../../mocks/testrun.mock';
import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import {
  DialogCloseAction,
  DownloadZipModalComponent,
} from '../download-zip-modal/download-zip-modal.component';
import { FocusManagerService } from '../../services/focus-manager.service';
import { DeviceStatus, TestingType } from '../../model/device';
import { TestRunService } from '../../services/test-run.service';
import { TestrunStatus } from '../../model/testrun-status';
import { PROFILE_MOCK } from '../../mocks/profile.mock';

describe('TestingCompleteComponent', () => {
  let component: TestingCompleteComponent;
  let fixture: ComponentFixture<TestingCompleteComponent>;
  const mockFocusManagerService = jasmine.createSpyObj(
    'mockFocusManagerService',
    ['focusFirstElementInContainer']
  );
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'risk-assessment', component: FakeRiskAssessmentComponent },
        ]),
        TestingCompleteComponent,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: FocusManagerService, useValue: mockFocusManagerService },
        // Used by the dialog content.
        {
          provide: TestRunService,
          useValue: jasmine.createSpyObj('TestRunService', [
            'getRiskClass',
            'downloadZip',
            'getReportLink',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestingCompleteComponent);
    component = fixture.componentInstance;
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('#onInit', () => {
    it('should focus first element in container when dialog closes with Close action', fakeAsync(() => {
      const openSpy = spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of({ action: DialogCloseAction.Close }),
      } as MatDialogRef<typeof DownloadZipModalComponent>);

      component.ngOnInit();

      tick(1000);

      expect(openSpy).toHaveBeenCalledWith(DownloadZipModalComponent, {
        ariaModal: true,
        data: {
          profiles: [],
          testrunStatus: MOCK_PROGRESS_DATA_COMPLIANT,
          isTestingComplete: true,
          report: '/report/123',
          export: '',
          isPilot: false,
          device: {
            status: DeviceStatus.VALID,
            manufacturer: 'Delta',
            model: '03-DIN-CPU',
            mac_addr: '01:02:03:04:05:06',
            firmware: '1.2.2',
          },
          started: '2023-06-22T09:20:00.123Z',
        },
        autoFocus: 'first-tabbable',
        ariaDescribedBy: 'testing-result-subtitle testing-result-main-info',
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'initiate-test-run-dialog',
      });

      tick(1000);

      expect(
        mockFocusManagerService.focusFirstElementInContainer
      ).toHaveBeenCalled();
      openSpy.calls.reset();
    }));
  });

  describe('"Testing complete" dialog (WCAG 1.3.1, 2.4.6, 4.1.2)', () => {
    const DESCRIPTION =
      'Your device has met the initial device qualification requirements. Please send your Testrun ZIP file to the qualification lab for verification. The lab will then contact you with further instructions.';
    /** Device Qualification testing that has just completed. */
    const QUALIFICATION_COMPLETE: TestrunStatus = {
      ...MOCK_PROGRESS_DATA_COMPLIANT,
      device: {
        ...MOCK_PROGRESS_DATA_COMPLIANT.device,
        test_pack: TestingType.Qualification,
      },
      description: DESCRIPTION,
    };

    beforeEach(() => {
      component.data = QUALIFICATION_COMPLETE;
    });

    afterEach(() => {
      // Closes as Cancel does: the dialog expects a close action.
      component.dialog.openDialogs.forEach(dialogRef =>
        dialogRef.close({ action: DialogCloseAction.Close })
      );
    });

    /**
     * Lets the component open the dialog, as it does once testing completes,
     * and returns its `role="dialog"` element.
     */
    function openTestingCompleteDialog(): HTMLElement {
      // In the Angular zone, as in the app, so that the dialog renders.
      TestBed.inject(NgZone).run(() => component.ngOnInit());
      tick(1000);
      // `mat-dialog-title` registers its id with the dialog in a microtask.
      flush();
      return document.querySelector(
        '.initiate-test-run-dialog mat-dialog-container'
      ) as HTMLElement;
    }

    it('should mark the dialog as modal', fakeAsync(() => {
      const dialog = openTestingCompleteDialog();

      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    }));

    it('should name the dialog by its visible device heading', fakeAsync(() => {
      const dialog = openTestingCompleteDialog();
      const heading = dialog.querySelector(
        'h2.testing-result-title'
      ) as HTMLElement;

      expect(textOfIdRefs(dialog.getAttribute('aria-labelledby'))).toBe(
        'Delta 03-DIN-CPU 1.2.2'
      );
      expect(dialog.getAttribute('aria-labelledby')).toBe(heading?.id);
      // A static name would override the visible heading.
      expect(dialog.hasAttribute('aria-label')).toBeFalse();
    }));

    it('should title the dialog with its only heading, a native level 2 heading', fakeAsync(() => {
      const dialog = openTestingCompleteDialog();
      const headings = dialog.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, [role="heading"]'
      );
      const title = headings[0];

      expect(headings.length).toBe(1);
      expect(title?.tagName).toBe('H2');
      expect(title?.classList).toContain('testing-result-title');
      // Native semantics leave no ARIA heading role to keep in sync.
      expect(title?.hasAttribute('role')).toBeFalse();
      expect(title?.hasAttribute('aria-level')).toBeFalse();
    }));

    it('should describe the dialog by its visible subtitle and result', fakeAsync(() => {
      const dialog = openTestingCompleteDialog();

      // Announces that testing has finished, as the replaced static name did.
      expect(textOfIdRefs(dialog.getAttribute('aria-describedby'))).toBe(
        `Device Qualification testing has just finished Compliant ${DESCRIPTION}`
      );
    }));

    it('should keep the Risk Profile options reachable in the modal dialog', fakeAsync(() => {
      component.profiles = [PROFILE_MOCK];
      const dialog = openTestingCompleteDialog();
      const select = dialog.querySelector('mat-select') as HTMLElement;

      (dialog.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
      flush();

      // Some screen readers hide content outside an `aria-modal` dialog, so
      // the dialog owns the options panel that renders in another overlay.
      const panelId = `${select.id}-panel`;
      expect(idRefsOf(dialog, 'aria-owns')).toContain(panelId);
      expect(document.getElementById(panelId)?.getAttribute('role')).toBe(
        'listbox'
      );
    }));

    it('should keep the title look', fakeAsync(() => {
      const dialog = openTestingCompleteDialog();
      const title = dialog.querySelector(
        '.testing-result-title'
      ) as HTMLElement;
      const style = getComputedStyle(title);
      // The former `<p>` title inherited the font of its heading block.
      const headingBlockStyle = getComputedStyle(
        dialog.querySelector('.testing-result-heading') as HTMLElement
      );

      // No padding, margin, or 40px line strut from `<h2>` or the Material
      // dialog title.
      expect(boxSides(style, 'margin')).toEqual(['0px', '0px', '0px', '0px']);
      expect(boxSides(style, 'padding')).toEqual(['0px', '0px', '0px', '0px']);
      expect(title.offsetHeight).toBe(40);
      expect(style.fontSize).toBe('32px');
      expect(style.lineHeight).toBe('40px');
      expect(style.textAlign).toBe('center');
      // `colors.$grey-900`, not the Material dialog title color.
      expect(style.color).toBe('rgb(0, 29, 53)');
      // The dialog font, not the bold `<h2>` or Material title typography.
      expect(style.fontFamily).toBe(headingBlockStyle.fontFamily);
      expect(style.fontWeight).toBe(headingBlockStyle.fontWeight);
      expect(style.letterSpacing).toBe(headingBlockStyle.letterSpacing);
    }));
  });
});

/** IDs referenced by an ID reference list attribute, e.g. `aria-owns`. */
function idRefsOf(element: Element, attribute: string): string[] {
  return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

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

@Component({
  selector: 'app-fake-risk-assessment-component',
  template: '',
})
class FakeRiskAssessmentComponent {}
