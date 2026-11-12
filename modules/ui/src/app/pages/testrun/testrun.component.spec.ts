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

import { TestrunComponent } from './testrun.component';
import { TestRunService } from '../../services/test-run.service';
import { of } from 'rxjs';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_MONITORING,
  MOCK_PROGRESS_DATA_NOT_STARTED,
  MOCK_PROGRESS_DATA_PROCEED,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
  TEST_DATA,
} from '../../mocks/testrun.mock';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Component, Input } from '@angular/core';
import { IResult, TestrunStatus } from '../../model/testrun-status';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { LoaderService } from '../../services/loader.service';
import { FocusManagerService } from '../../services/focus-manager.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import {
  selectDevices,
  selectHasDevices,
  selectHasRiskProfiles,
  selectIsAllDevicesOutdated,
  selectIsOpenWaitSnackBar,
  selectRiskProfiles,
  selectSystemConfig,
  selectSystemStatus,
  selectTestModules,
} from '../../store/selectors';
import { TestrunStore } from './testrun.store';
import { setTestrunStatus } from '../../store/actions';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NotificationService } from '../../services/notification.service';
import { Profile } from '../../model/profile';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DownloadOptionsComponent } from './components/download-options/download-options.component';
import { TestrunTableComponent } from './components/testrun-table/testrun-table.component';
import { TestrunStatusCardComponent } from './components/testrun-status-card/testrun-status-card.component';
import { TestrunDialogService } from '../../services/testrun-dialog.service';

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

describe('TestrunComponent', () => {
  let component: TestrunComponent;
  let fixture: ComponentFixture<TestrunComponent>;
  let compiled: HTMLElement;
  let store: MockStore<AppState>;

  const testRunServiceMock: jasmine.SpyObj<TestRunService> =
    jasmine.createSpyObj([
      'stopTestrun',
      'getDevices',
      'isOpenStartTestrun$',
      'isTestrunStarted$',
      'fetchSystemStatus',
      'getTestModules',
      'testrunInProgress',
      'getResultClass',
    ]);

  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    ['setLoading', 'getLoading']
  );

  const notificationServiceMock: jasmine.SpyObj<NotificationService> =
    jasmine.createSpyObj('NotificationService', [
      'dismissWithTimout',
      'dismissSnackBar',
      'openSnackBar',
    ]);

  const testRunDialogServiceMock: jasmine.SpyObj<TestrunDialogService> =
    jasmine.createSpyObj('testRunDialogServiceMock', [
      'openInitiateDialog',
      'handleFocus',
    ]);

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);

  describe('Class tests', () => {
    beforeEach(() => {
      // @ts-expect-error data layer should be defined
      window.dataLayer = window.dataLayer || [];
      testRunServiceMock.stopTestrun.and.returnValue(of(true));
      TestBed.configureTestingModule({
        providers: [
          TestrunStore,
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          { provide: LoaderService, useValue: loaderServiceMock },
          { provide: NotificationService, useValue: notificationServiceMock },
          { provide: TestrunDialogService, useValue: testRunDialogServiceMock },
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectHasDevices, value: false },
              { selector: selectIsAllDevicesOutdated, value: false },
              { selector: selectIsOpenWaitSnackBar, value: false },
              { selector: selectHasRiskProfiles, value: false },
              { selector: selectRiskProfiles, value: [] },
              { selector: selectTestModules, value: [] },
              {
                selector: selectSystemStatus,
                value: MOCK_PROGRESS_DATA_IN_PROGRESS,
              },
            ],
          }),
        ],
        imports: [
          TestrunComponent,
          FakeProgressStatusCardComponent,
          FakeProgressTableComponent,
          FakeDownloadOptionsComponent,
          MatButtonModule,
          MatIconModule,
          MatToolbarModule,
          MatDialogModule,
          SpinnerComponent,
          BrowserAnimationsModule,
          MatTooltipModule,
        ],
      })
        .overrideComponent(TestrunComponent, {
          set: {
            providers: [
              { provide: LoaderService, useValue: loaderServiceMock },
            ],
          },
        })
        .overrideComponent(TestrunComponent, {
          remove: {
            imports: [
              TestrunStatusCardComponent,
              TestrunTableComponent,
              DownloadOptionsComponent,
            ],
          },
          add: {
            imports: [
              FakeProgressStatusCardComponent,
              FakeProgressTableComponent,
              FakeDownloadOptionsComponent,
            ],
          },
        })
        .compileComponents();

      testRunServiceMock.fetchSystemStatus.and.returnValue(
        of(MOCK_PROGRESS_DATA_IN_PROGRESS)
      );
      store = TestBed.inject(MockStore);
      fixture = TestBed.createComponent(TestrunComponent);
      spyOn(store, 'dispatch').and.callThrough();
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#stopTestrun', () => {
      it('should update system status to Cancelling', () => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );
        component.stopTestrun();

        expect(store.dispatch).toHaveBeenCalledWith(
          setTestrunStatus({ systemStatus: MOCK_PROGRESS_DATA_CANCELLING })
        );
      });
    });

    it('#openStopTestrunDialog should open delete dialog', () => {
      const stopTestrunSpy = spyOn(component, 'stopTestrun');
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof SimpleDialogComponent>);

      component.openStopTestrunDialog();

      expect(stopTestrunSpy).toHaveBeenCalled();
    });
  });

  describe('DOM tests', () => {
    beforeEach(async () => {
      testRunServiceMock.stopTestrun.and.returnValue(of(true));
      testRunServiceMock.testrunInProgress.and.returnValue(false);
      // @ts-expect-error data layer should be defined
      window.dataLayer = window.dataLayer || [];

      await TestBed.configureTestingModule({
        providers: [
          TestrunStore,
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          { provide: LoaderService, useValue: loaderServiceMock },
          { provide: NotificationService, useValue: notificationServiceMock },
          { provide: TestrunDialogService, useValue: testRunDialogServiceMock },
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectDevices, value: [] },
              { selector: selectHasDevices, value: false },
              { selector: selectIsAllDevicesOutdated, value: false },
              { selector: selectIsOpenWaitSnackBar, value: false },
              { selector: selectHasRiskProfiles, value: false },
              { selector: selectRiskProfiles, value: [] },
              { selector: selectTestModules, value: [] },
              {
                selector: selectSystemStatus,
                value: MOCK_PROGRESS_DATA_IN_PROGRESS,
              },
            ],
          }),
        ],
        imports: [
          TestrunComponent,
          FakeProgressStatusCardComponent,
          FakeProgressTableComponent,
          FakeDownloadOptionsComponent,
          MatButtonModule,
          MatIconModule,
          MatToolbarModule,
          MatDialogModule,
          SpinnerComponent,
          BrowserAnimationsModule,
          MatTooltipModule,
        ],
      })
        .overrideComponent(TestrunComponent, {
          set: {
            providers: [
              { provide: LoaderService, useValue: loaderServiceMock },
            ],
          },
        })
        .overrideComponent(TestrunComponent, {
          remove: {
            imports: [
              TestrunStatusCardComponent,
              TestrunTableComponent,
              DownloadOptionsComponent,
            ],
          },
          add: {
            imports: [
              FakeProgressStatusCardComponent,
              FakeProgressTableComponent,
              FakeDownloadOptionsComponent,
            ],
          },
        })
        .compileComponents();

      store = TestBed.inject(MockStore);
      fixture = TestBed.createComponent(TestrunComponent);
      compiled = fixture.nativeElement as HTMLElement;
      testRunServiceMock.fetchSystemStatus.and.returnValue(
        of(MOCK_PROGRESS_DATA_IN_PROGRESS)
      );
      spyOn(store, 'dispatch').and.callThrough();
      component = fixture.componentInstance;
    });

    describe('with not devices$ data', () => {
      beforeEach(() => {
        store.overrideSelector(selectSystemStatus, null);
        store.overrideSelector(selectHasDevices, false);
        fixture.detectChanges();
      });

      it('should have disabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeTrue();
      });
    });

    describe('with all devices outdated', () => {
      beforeEach(() => {
        store.overrideSelector(selectSystemStatus, null);
        store.overrideSelector(selectHasDevices, true);
        store.overrideSelector(selectIsAllDevicesOutdated, true);
        fixture.detectChanges();
      });

      it('should have disabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeTrue();
      });
    });

    describe('with not systemStatus$ data', () => {
      beforeEach(() => {
        store.overrideSelector(selectSystemStatus, null);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should have empty state content', () => {
        const emptyContentEl = compiled.querySelector(
          '.progress-content-empty'
        );
        const toolbarEl = compiled.querySelector('.progress-toolbar');

        expect(emptyContentEl).not.toBeNull();
        expect(toolbarEl).toBeNull();
      });

      it('should have enabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeFalse();
      });

      it('should open initiate test run modal when start button clicked', fakeAsync(() => {
        testRunDialogServiceMock.openInitiateDialog.and.returnValue(
          of(MOCK_PROGRESS_DATA_IN_PROGRESS)
        );

        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;
        startBtn.click();

        expect(testRunDialogServiceMock.openInitiateDialog).toHaveBeenCalled();

        tick(1000);

        expect(testRunDialogServiceMock.handleFocus).toHaveBeenCalled();

        testRunDialogServiceMock.openInitiateDialog.calls.reset();
      }));

      describe('"Start Testing" button (WCAG 2.5.3 Label in Name)', () => {
        let startBtn: HTMLButtonElement;

        beforeEach(() => {
          startBtn = compiled.querySelector(
            '.start-button'
          ) as HTMLButtonElement;
        });

        it('should be named by its visible text', () => {
          expect(visibleLabel(startBtn)).toBe('Start Testing');
          expect(accessibleName(startBtn)).toBe('Start Testing');
          expect(startBtn.hasAttribute('aria-label'))
            .withContext('an aria-label overrides the visible text')
            .toBeFalse();
          expect(
            startBtn.querySelector('mat-icon')?.getAttribute('aria-hidden')
          ).toBe('true');
        });

        it('should announce that it opens a dialog', () => {
          expect(startBtn.getAttribute('aria-haspopup')).toBe('dialog');
        });

        it('should be described by the visible instructions', () => {
          const instructions = compiled.querySelector(
            '.empty-content-info'
          ) as HTMLElement;
          const describedBy = startBtn.getAttribute('aria-describedby');

          expect(textOfIdRefs(describedBy)).toBe(
            'Click the button below to configure your testing task'
          );
          expect(document.getElementById(describedBy ?? ''))
            .withContext('the description is the visible instructions text')
            .toBe(instructions);
        });
      });
    });

    describe('with available systemStatus$ data, status "In Progress"', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );
        testRunServiceMock.testrunInProgress.and.returnValue(true);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should have spinner', () => {
        const spinner = compiled.querySelector('app-spinner');

        expect(spinner).toBeTruthy();
      });

      it('should have toolbar content', () => {
        const emptyContentEl = compiled.querySelector(
          '.progress-content-empty'
        );
        const toolbarEl = compiled.querySelector('.progress-toolbar');

        expect(toolbarEl).not.toBeNull();
        expect(emptyContentEl).toBeNull();
      });

      it('should have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).not.toBeNull();
      });

      it('should call stopTestrun on click "Stop" button', () => {
        const openDialogSpy = spyOn(component, 'openStopTestrunDialog');
        const stopBtn = compiled.querySelector(
          '.stop-button'
        ) as HTMLButtonElement;

        stopBtn.click();

        expect(openDialogSpy).toHaveBeenCalled();
      });

      it('should not have "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn).toBeNull();
      });

      it('should not have "Download" options', () => {
        const downloadComp = compiled.querySelector('app-download-options');

        expect(downloadComp).toBeNull();
      });

      it('should have tags', () => {
        const tags = fixture.nativeElement.querySelector(
          '.toolbar-tag-container'
        ) as HTMLElement;

        expect(tags).toBeTruthy();
        expect(window.getComputedStyle(tags).position).not.toBe('absolute');
      });

      it('should enable horizontal scrolling on progress-table at narrow viewports', () => {
        const progressTable = compiled.querySelector(
          'section.progress-table'
        ) as HTMLElement;

        expect(progressTable).not.toBeNull();
        expect(window.getComputedStyle(progressTable).overflowX).toBe('auto');
      });

      describe('"Stop" button (WCAG 2.5.3 Label in Name)', () => {
        let stopBtn: HTMLButtonElement;

        beforeEach(() => {
          stopBtn = compiled.querySelector('.stop-button') as HTMLButtonElement;
        });

        it('should be named by its visible text', () => {
          expect(visibleLabel(stopBtn)).toBe('Stop');
          expect(accessibleName(stopBtn)).toBe('Stop');
          expect(stopBtn.hasAttribute('aria-label'))
            .withContext('an aria-label overrides the visible text')
            .toBeFalse();
          expect(
            stopBtn.querySelector('mat-icon')?.getAttribute('aria-hidden')
          ).toBe('true');
        });

        it('should announce that it opens a confirmation dialog', () => {
          expect(stopBtn.getAttribute('aria-haspopup')).toBe('dialog');
        });
      });
    });

    describe('with available systemStatus$ data, as Completed', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_COMPLIANT
        );
        store.overrideSelector(selectHasDevices, true);
        store.refreshState();
        fixture.detectChanges();
      });

      it('should not have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).toBeNull();
      });

      it('should not have "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn).toBeNull();
      });

      it('should have "Download" options', () => {
        const downloadOptionsComp = compiled.querySelector(
          'app-download-options'
        );

        expect(downloadOptionsComp).not.toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Cancelled', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_CANCELLED
        );
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should not have "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn).toBeNull();
      });

      it('should not have "Download" options', () => {
        const downloadComp = compiled.querySelector('app-download-options');

        expect(downloadComp).toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Waiting for Device', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE
        );
        testRunServiceMock.testrunInProgress.and.returnValue(true);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should not have "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn).toBeNull();
      });

      it('should have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).not.toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Cancelling', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_CANCELLING
        );
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should not have "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn).toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Monitoring', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_MONITORING
        );
        testRunServiceMock.testrunInProgress.and.returnValue(true);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should not have "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn).toBeNull();
      });

      it('should have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).not.toBeNull();
      });
    });

    describe('with available systemStatus$ data, when Testrun not started on Idle status', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_NOT_STARTED
        );
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should have empty state content', () => {
        const emptyContentEl = compiled.querySelector(
          '.progress-content-empty'
        );
        const toolbarEl = compiled.querySelector('.progress-toolbar');

        expect(emptyContentEl).not.toBeNull();
        expect(toolbarEl).toBeNull();
      });
    });
  });

  describe('Zoom & reflow at 200% zoom (640x480)', () => {
    const proceedStatusWithTableData: TestrunStatus = {
      ...MOCK_PROGRESS_DATA_PROCEED,
      tests: TEST_DATA,
    };

    beforeEach(async () => {
      testRunServiceMock.stopTestrun.and.returnValue(of(true));
      testRunServiceMock.testrunInProgress.and.returnValue(false);
      testRunServiceMock.getResultClass.and.returnValue({
        green: true,
        red: false,
        blue: false,
        cyan: false,
        grey: false,
      });
      // @ts-expect-error data layer should be defined
      window.dataLayer = window.dataLayer || [];

      await TestBed.configureTestingModule({
        providers: [
          TestrunStore,
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          { provide: LoaderService, useValue: loaderServiceMock },
          { provide: NotificationService, useValue: notificationServiceMock },
          { provide: TestrunDialogService, useValue: testRunDialogServiceMock },
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectDevices, value: [] },
              { selector: selectHasDevices, value: true },
              { selector: selectIsAllDevicesOutdated, value: false },
              { selector: selectIsOpenWaitSnackBar, value: false },
              { selector: selectHasRiskProfiles, value: false },
              { selector: selectRiskProfiles, value: [] },
              { selector: selectTestModules, value: [] },
              { selector: selectSystemConfig, value: { network: {} } },
              {
                selector: selectSystemStatus,
                value: proceedStatusWithTableData,
              },
            ],
          }),
        ],
        imports: [
          TestrunComponent,
          TestrunStatusCardComponent,
          TestrunTableComponent,
          FakeDownloadOptionsComponent,
          MatButtonModule,
          MatIconModule,
          MatToolbarModule,
          MatDialogModule,
          SpinnerComponent,
          BrowserAnimationsModule,
          MatTooltipModule,
        ],
      })
        .overrideComponent(TestrunComponent, {
          set: {
            providers: [
              { provide: LoaderService, useValue: loaderServiceMock },
            ],
          },
        })
        .overrideComponent(TestrunComponent, {
          remove: {
            imports: [DownloadOptionsComponent],
          },
          add: {
            imports: [FakeDownloadOptionsComponent],
          },
        })
        .compileComponents();

      store = TestBed.inject(MockStore);
      fixture = TestBed.createComponent(TestrunComponent);
      compiled = fixture.nativeElement as HTMLElement;
      compiled.style.width = '543px';
      compiled.style.boxSizing = 'border-box';
      testRunServiceMock.fetchSystemStatus.and.returnValue(
        of(proceedStatusWithTableData)
      );
      fixture.detectChanges();
    });

    it('should not clip status card or VSA tag and should keep Name and Description columns readable inside 543px #main', () => {
      const hostRect = compiled.getBoundingClientRect();
      const toolbarEl = compiled.querySelector(
        '.progress-toolbar'
      ) as HTMLElement;
      const toolbarRect = toolbarEl.getBoundingClientRect();
      const firstTagEl = compiled.querySelector('.toolbar-tag') as HTMLElement;
      const tagRect = firstTagEl.getBoundingClientRect();
      const progressCardEl = compiled.querySelector(
        'app-testrun-status-card .progress-card'
      ) as HTMLElement;
      const cardRect = progressCardEl.getBoundingClientRect();
      const progressTableSection = compiled.querySelector(
        'section.progress-table'
      ) as HTMLElement;
      const matTableEl = compiled.querySelector(
        'app-testrun-table mat-table'
      ) as HTMLElement;
      const nameCell = compiled.querySelector(
        'app-testrun-table mat-cell.mat-column-name'
      ) as HTMLElement;
      const descriptionCell = compiled.querySelector(
        'app-testrun-table mat-cell.mat-column-description'
      ) as HTMLElement;
      const firstRow = compiled.querySelector(
        'app-testrun-table mat-row'
      ) as HTMLElement;

      // 1. Status card and VSA tag fit within #main (543px) on both left and right edges
      expect(cardRect.left).toBeGreaterThanOrEqual(hostRect.left);
      expect(cardRect.right).toBeLessThanOrEqual(hostRect.right);
      expect(tagRect.left).toBeGreaterThanOrEqual(toolbarRect.left);
      expect(tagRect.right).toBeLessThanOrEqual(toolbarRect.right);

      // 2. Table scrolls horizontally inside section.progress-table and preserves readable Name & Description widths
      expect(window.getComputedStyle(progressTableSection).overflowX).toBe(
        'auto'
      );
      expect(matTableEl.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        640
      );
      expect(nameCell.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        150
      );
      expect(
        descriptionCell.getBoundingClientRect().width
      ).toBeGreaterThanOrEqual(180);
      expect(firstRow.getBoundingClientRect().height).toBeLessThan(150);
    });
  });
});

@Component({
  selector: 'app-testrun-status-card',
  template: '<div></div>',
})
class FakeProgressStatusCardComponent {
  @Input() systemStatus!: TestrunStatus;
}

@Component({
  selector: 'app-testrun-table',
  template: '<div></div>',
})
class FakeProgressTableComponent {
  @Input() dataSource!: IResult[] | undefined;
  @Input() stepsToResolveCount!: number;
}

@Component({
  selector: 'app-download-options',
  template: '<div></div>',
})
class FakeDownloadOptionsComponent {
  @Input() data!: TestrunStatus;
  @Input() profiles!: Profile[];
}
