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
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ProgressComponent } from './progress.component';
import { TestRunService } from '../../services/test-run.service';
import { of } from 'rxjs';
import {
  EMPTY_RESULT,
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_CANCELLED_EMPTY,
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_IN_PROGRESS_EMPTY,
  MOCK_PROGRESS_DATA_MONITORING,
  MOCK_PROGRESS_DATA_NOT_STARTED,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
  TEST_DATA_TABLE_RESULT,
} from '../../mocks/progress.mock';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Component, Input } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { IResult, TestrunStatus } from '../../model/testrun-status';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { ProgressInitiateFormComponent } from './components/progress-initiate-form/progress-initiate-form.component';
import { DownloadReportComponent } from '../../components/download-report/download-report.component';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { LoaderService } from '../../services/loader.service';
import { FocusManagerService } from '../../services/focus-manager.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import { selectDevices, selectHasDevices } from '../../store/selectors';
import { DownloadReportPdfComponent } from '../../components/download-report-pdf/download-report-pdf.component';

describe('ProgressComponent', () => {
  let component: ProgressComponent;
  let fixture: ComponentFixture<ProgressComponent>;
  let compiled: HTMLElement;
  let store: MockStore<AppState>;

  const testRunServiceMock: jasmine.SpyObj<TestRunService> =
    jasmine.createSpyObj([
      'getSystemStatus',
      'setSystemStatus',
      'systemStatus$',
      'stopTestrun',
      'getDevices',
      'isOpenStartTestrun$',
      'isTestrunStarted$',
    ]);

  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    ['setLoading', 'getLoading']
  );

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);

  testRunServiceMock.isOpenStartTestrun$ = new BehaviorSubject(false);
  testRunServiceMock.isTestrunStarted$ = new BehaviorSubject(false);

  describe('Class tests', () => {
    beforeEach(() => {
      testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
      testRunServiceMock.stopTestrun.and.returnValue(of(true));

      TestBed.configureTestingModule({
        declarations: [
          ProgressComponent,
          FakeProgressStatusCardComponent,
          FakeProgressTableComponent,
        ],
        providers: [
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectDevices, value: [] },
              { selector: selectHasDevices, value: false },
            ],
          }),
        ],
        imports: [
          MatButtonModule,
          MatIconModule,
          MatToolbarModule,
          MatDialogModule,
          SpinnerComponent,
          DownloadReportPdfComponent,
        ],
      })
        .overrideComponent(ProgressComponent, {
          set: {
            providers: [
              { provide: LoaderService, useValue: loaderServiceMock },
            ],
          },
        })
        .compileComponents();

      store = TestBed.inject(MockStore);
      fixture = TestBed.createComponent(ProgressComponent);
      component = fixture.componentInstance;
    });

    afterEach(() => {
      testRunServiceMock.getSystemStatus.calls.reset();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('openTestRunModal on first flow', () => {
      beforeEach(() => {
        testRunServiceMock.isOpenStartTestrun$ = new BehaviorSubject(true);
        component.ngOnInit();
      });

      it('should open the modal if isOpenStartTestrun$ as true', () => {
        const openDialogSpy = spyOn(component, 'openTestRunModal');

        component.ngOnInit();

        expect(openDialogSpy).toHaveBeenCalled();
      });
    });

    describe('#stopTestrun', () => {
      it('should call service method stopTestrun', () => {
        component.stopTestrun();

        expect(testRunServiceMock.stopTestrun).toHaveBeenCalled();
      });

      it('should show loader', () => {
        component.stopTestrun();

        expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
      });

      it('should update system status to Cancelling', () => {
        component.currentStatus = { ...MOCK_PROGRESS_DATA_IN_PROGRESS };

        component.stopTestrun();

        expect(testRunServiceMock.setSystemStatus).toHaveBeenCalledWith(
          MOCK_PROGRESS_DATA_CANCELLING
        );
      });
    });

    it('#openStopTestrunDialog should open delete dialog', () => {
      const stopTestrunSpy = spyOn(component, 'stopTestrun');
      spyOn(component.dialog, 'open').and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<typeof DeleteFormComponent>);

      component.openStopTestrunDialog();

      expect(stopTestrunSpy).toHaveBeenCalled();
    });

    describe('#ngOnInit', () => {
      it('should set systemStatus$ value', () => {
        component.ngOnInit();

        component.systemStatus$.subscribe(res => {
          expect(res).toEqual(MOCK_PROGRESS_DATA_IN_PROGRESS);
        });
      });

      it('should set hasDevices$ value', () => {
        component.ngOnInit();

        component.hasDevices$.subscribe(res => {
          expect(res).toEqual(false);
        });
      });

      describe('dataSource$', () => {
        it('should set value with empty values if result length < total for status "In Progress"', () => {
          const expectedResult = TEST_DATA_TABLE_RESULT;

          testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
          component.ngOnInit();

          component.dataSource$.subscribe(res => {
            expect(res).toEqual(expectedResult);
          });
        });

        it('should set value with empty values for status "Monitoring"', () => {
          const expectedResult = EMPTY_RESULT;

          testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_MONITORING);
          component.ngOnInit();

          component.dataSource$.subscribe(res => {
            expect(res).toEqual(expectedResult);
          });
        });

        it('should set value with empty values for status "Waiting for Device"', () => {
          const expectedResult = EMPTY_RESULT;

          testRunServiceMock.systemStatus$ = of(
            MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE
          );
          component.ngOnInit();

          component.dataSource$.subscribe(res => {
            expect(res).toEqual(expectedResult);
          });
        });

        it('should set value with empty values for status "Cancelled" and empty result', () => {
          const expectedResult = EMPTY_RESULT;

          testRunServiceMock.systemStatus$ = of(
            MOCK_PROGRESS_DATA_CANCELLED_EMPTY
          );
          component.ngOnInit();

          component.dataSource$.subscribe(res => {
            expect(res).toEqual(expectedResult);
          });
        });
      });

      it('should call focusFirstElementInContainer when testrun stops after cancelling', () => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_COMPLIANT);
        component.isCancelling = true;

        component.ngOnInit();
        fixture.detectChanges();

        expect(
          stateServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();
      });

      describe('hideLoading', () => {
        it('should called if testrun is finished', () => {
          testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_COMPLIANT);

          component.ngOnInit();

          component.systemStatus$.subscribe(() => {
            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
          });
        });

        it('should called if testrun is in progress and have some test finished', () => {
          testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);

          component.ngOnInit();

          component.systemStatus$.subscribe(() => {
            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(false);
          });
        });
      });

      describe('showLoading', () => {
        it('should be called if testrun is monitoring', () => {
          testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_MONITORING);

          component.ngOnInit();

          component.systemStatus$.subscribe(() => {
            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
          });
        });

        it('should be called if testrun is in progress and have some test finished', () => {
          testRunServiceMock.systemStatus$ = of(
            MOCK_PROGRESS_DATA_IN_PROGRESS_EMPTY
          );

          component.ngOnInit();

          component.systemStatus$.subscribe(() => {
            expect(loaderServiceMock.setLoading).toHaveBeenCalledWith(true);
          });
        });
      });
    });
  });

  describe('DOM tests', () => {
    beforeEach(async () => {
      testRunServiceMock.stopTestrun.and.returnValue(of(true));

      await TestBed.configureTestingModule({
        declarations: [
          ProgressComponent,
          FakeProgressStatusCardComponent,
          FakeProgressTableComponent,
        ],
        providers: [
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectHasDevices, value: false },
              { selector: selectDevices, value: [] },
            ],
          }),
        ],
        imports: [
          MatButtonModule,
          MatIconModule,
          MatToolbarModule,
          MatDialogModule,
          DownloadReportComponent,
          SpinnerComponent,
          DownloadReportPdfComponent,
        ],
      })
        .overrideComponent(ProgressComponent, {
          set: {
            providers: [
              { provide: LoaderService, useValue: loaderServiceMock },
            ],
          },
        })
        .compileComponents();

      store = TestBed.inject(MockStore);
      fixture = TestBed.createComponent(ProgressComponent);
      compiled = fixture.nativeElement as HTMLElement;
      component = fixture.componentInstance;
    });

    afterEach(() => {
      testRunServiceMock.getSystemStatus.calls.reset();
    });

    describe('with not devices$ data', () => {
      beforeEach(() => {
        (testRunServiceMock.systemStatus$ as unknown) = of(null);
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

    describe('with not systemStatus$ data', () => {
      beforeEach(() => {
        (testRunServiceMock.systemStatus$ as unknown) = of(null);
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
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(true),
        } as MatDialogRef<typeof ProgressInitiateFormComponent>);
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;
        startBtn.click();

        expect(openSpy).toHaveBeenCalled();
        expect(openSpy).toHaveBeenCalledWith(ProgressInitiateFormComponent, {
          ariaLabel: 'Initiate testrun',
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'initiate-test-run-dialog',
        });
        tick(10);
        expect(
          stateServiceMock.focusFirstElementInContainer
        ).toHaveBeenCalled();

        openSpy.calls.reset();
      }));
    });

    describe('with available systemStatus$ data, status "In Progress"', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
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

      it('should have disabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeTrue();
      });

      it('should not have "Download Report" button', () => {
        const reportBtn = compiled.querySelector('.report-button');

        expect(reportBtn).toBeNull();
      });
    });

    describe('pullingSystemStatusData with available status "In Progress"', () => {
      it('should call again getSystemStatus)', fakeAsync(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_IN_PROGRESS);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
        tick(5000);

        expect(testRunServiceMock.getSystemStatus).toHaveBeenCalledTimes(1);
        discardPeriodicTasks();
      }));
    });

    describe('with available systemStatus$ data, as Completed', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_COMPLIANT);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should not have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).toBeNull();
      });

      it('should have enabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeFalse();
      });

      it('should have "Download Report" button', () => {
        const reportBtn = compiled.querySelector('.report-button');

        expect(reportBtn).not.toBeNull();
      });

      it('should have report link', () => {
        const link = compiled.querySelector(
          '.download-report-link'
        ) as HTMLAnchorElement;

        expect(link.href).toEqual('https://api.testrun.io/report.pdf');
        expect(link.download).toEqual(
          'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20'
        );
        expect(link.title).toEqual(
          'Download pdf for Test Run # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20'
        );
      });
    });

    describe('with available systemStatus$ data, as Cancelled', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_CANCELLED);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should have enabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeFalse();
      });

      it('should not have "Download Report" button', () => {
        const reportBtn = compiled.querySelector('.report-button');

        expect(reportBtn).toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Waiting for Device', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(
          MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE
        );
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should have disabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeTrue();
      });

      it('should have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).not.toBeNull();
      });
    });

    describe('with available systemStatus$ data, as Monitoring', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_MONITORING);
        store.overrideSelector(selectHasDevices, true);
        fixture.detectChanges();
      });

      it('should have disabled "Start" button', () => {
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;

        expect(startBtn.disabled).toBeTrue();
      });

      it('should have "Stop" button', () => {
        const stopBtn = compiled.querySelector('.stop-button');

        expect(stopBtn).not.toBeNull();
      });
    });

    describe('with available systemStatus$ data, when Testrun not started on Idle status', () => {
      beforeEach(() => {
        testRunServiceMock.systemStatus$ = of(MOCK_PROGRESS_DATA_NOT_STARTED);
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
});

@Component({
  selector: 'app-progress-status-card',
  template: '<div></div>',
})
class FakeProgressStatusCardComponent {
  @Input() systemStatus$!: Observable<TestrunStatus>;
}

@Component({
  selector: 'app-progress-table',
  template: '<div></div>',
})
class FakeProgressTableComponent {
  @Input() dataSource$!: Observable<IResult[] | undefined>;
}
