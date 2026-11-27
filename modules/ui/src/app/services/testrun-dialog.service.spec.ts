import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { TestrunDialogService } from './testrun-dialog.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FocusManagerService } from './focus-manager.service';
import { of } from 'rxjs';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/testrun.mock';
import { TestrunInitiateFormComponent } from '../pages/testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { device, MOCK_TEST_MODULES } from '../mocks/device.mock';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../store/state';
import { fetchSystemStatusSuccess } from '../store/actions';
import { selectDevices } from '../store/selectors';
import { ApplicationRef, NgZone } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from './test-run.service';
import { TestRunMqttService } from './test-run-mqtt.service';
import { MqttErrorDialogService } from './mqtt-error-dialog.service';

describe('TestrunDialogService', () => {
  let service: TestrunDialogService;
  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);
  let store: MockStore<AppState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FocusManagerService, useValue: stateServiceMock },
        {
          provide: MatDialogRef,
          useValue: {},
        },
        provideMockStore({}),
      ],
    });
    service = TestBed.inject(TestrunDialogService);
    store = TestBed.inject(MockStore);
    stateServiceMock.focusFirstElementInContainer.calls.reset();
    spyOn(store, 'dispatch').and.callThrough();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('#openInitiateDialog', () => {
    it('should open initiate test run modal', fakeAsync(() => {
      const openSpy = spyOn(service.dialog, 'open').and.returnValue({
        afterClosed: () => of(MOCK_PROGRESS_DATA_IN_PROGRESS),
      } as MatDialogRef<typeof TestrunInitiateFormComponent>);

      service
        .openInitiateDialog({
          testModules: MOCK_TEST_MODULES,
          device: device,
          devices: [device],
        })
        .subscribe();

      expect(openSpy).toHaveBeenCalledWith(TestrunInitiateFormComponent, {
        ariaModal: true,
        data: {
          devices: [device],
          device: device,
          testModules: MOCK_TEST_MODULES,
        },
        autoFocus: 'first-tabbable',
        hasBackdrop: true,
        disableClose: true,
        panelClass: 'initiate-test-run-dialog',
      });

      expect(store.dispatch).toHaveBeenCalledWith(
        fetchSystemStatusSuccess({
          systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
        })
      );

      openSpy.calls.reset();
    }));
  });

  describe('#handleFocus', () => {
    it('should focus the first element when no dialog is open', fakeAsync(() => {
      spyOnProperty(service.dialog, 'openDialogs', 'get').and.returnValue([]);

      service.handleFocus(0);
      tick(1);

      expect(
        stateServiceMock.focusFirstElementInContainer
      ).toHaveBeenCalledTimes(1);
    }));

    it('should not steal focus while a dialog is open', fakeAsync(() => {
      spyOnProperty(service.dialog, 'openDialogs', 'get').and.returnValue([
        {} as MatDialogRef<unknown>,
      ]);

      service.handleFocus(0);
      tick(1);

      expect(
        stateServiceMock.focusFirstElementInContainer
      ).not.toHaveBeenCalled();
    }));
  });
});

describe('TestrunDialogService "Start new Testrun" dialog (WCAG 1.3.1, 2.4.6, 4.1.2)', () => {
  let service: TestrunDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        // Used by the form that the dialog renders.
        {
          provide: TestRunService,
          useValue: jasmine.createSpyObj('TestRunService', [
            'startTestrun',
            'fetchVersion',
          ]),
        },
        {
          provide: TestRunMqttService,
          useValue: jasmine.createSpyObj('TestRunMqttService', ['isConnected']),
        },
        {
          provide: MqttErrorDialogService,
          useValue: jasmine.createSpyObj('MqttErrorDialogService', ['open']),
        },
        provideMockStore({
          selectors: [{ selector: selectDevices, value: [device] }],
        }),
      ],
    });
    service = TestBed.inject(TestrunDialogService);
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  /**
   * Opens the dialog as the Testing page does and returns its `role="dialog"`
   * element. No fixture renders the form first, so that its styles apply after
   * the Material dialog styles, as in the app.
   */
  async function openStartNewTestrunDialog(): Promise<HTMLElement> {
    // Opened in the Angular zone, as from a click, so that the dialog renders.
    TestBed.inject(NgZone).run(() =>
      service.openInitiateDialog({ testModules: MOCK_TEST_MODULES }).subscribe()
    );
    // `mat-dialog-title` registers its id with the dialog in a microtask.
    await TestBed.inject(ApplicationRef).whenStable();
    return document.querySelector(
      '.initiate-test-run-dialog mat-dialog-container'
    ) as HTMLElement;
  }

  it('should mark the dialog as modal', async () => {
    const dialog = await openStartNewTestrunDialog();

    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('should name the dialog by its visible "Start new Testrun" heading', async () => {
    const dialog = await openStartNewTestrunDialog();
    const heading = dialog.querySelector('h2') as HTMLElement;

    expect(textOfIdRefs(dialog.getAttribute('aria-labelledby'))).toBe(
      'Start new Testrun'
    );
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading?.id);
    // A static name would override the visible heading.
    expect(dialog.hasAttribute('aria-label')).toBeFalse();
  });

  it('should keep the title look', async () => {
    const dialog = await openStartNewTestrunDialog();
    const title = dialog.querySelector(
      '.progress-initiate-form-title'
    ) as HTMLElement;
    const style = getComputedStyle(title);

    // No margin or 40px line strut from `<h2>` or the Material dialog title.
    expect(boxSides(style, 'margin')).toEqual(['0px', '0px', '0px', '0px']);
    expect(boxSides(style, 'padding')).toEqual([
      '24px',
      '24px',
      '20px',
      '24px',
    ]);
    expect(title.offsetHeight).toBe(84);
    // The headline-large typography, not the `<h2>` or Material title one.
    expect(style.fontSize).toBe('32px');
    expect(style.lineHeight).toBe('40px');
    expect(style.fontWeight).toBe('400');
    expect(style.fontFamily).toBe('"Google Sans", sans-serif');
    expect(style.letterSpacing).toBe('normal');
    expect(style.textAlign).toBe('center');
  });
});

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
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
