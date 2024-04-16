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

import { ProgressComponent } from './progress.component';
import { TestRunService } from '../../services/test-run.service';
import { of } from 'rxjs';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_IN_PROGRESS,
  MOCK_PROGRESS_DATA_MONITORING,
  MOCK_PROGRESS_DATA_NOT_STARTED,
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
} from '../../mocks/progress.mock';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Component, Input } from '@angular/core';
import { IResult, TestrunStatus } from '../../model/testrun-status';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ProgressInitiateFormComponent } from './components/progress-initiate-form/progress-initiate-form.component';
import { DownloadReportComponent } from '../../components/download-report/download-report.component';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { LoaderService } from '../../services/loader.service';
import { FocusManagerService } from '../../services/focus-manager.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import {
  selectDevices,
  selectHasDevices,
  selectIsOpenStartTestrun,
  selectIsTestrunStarted,
  selectSystemStatus,
} from '../../store/selectors';
import { DownloadReportPdfComponent } from '../../components/download-report-pdf/download-report-pdf.component';
import { TestrunStore } from './testrun.store';
import { setTestrunStatus } from '../../store/actions';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ProgressComponent', () => {
  let component: ProgressComponent;
  let fixture: ComponentFixture<ProgressComponent>;
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
    ]);

  const loaderServiceMock: jasmine.SpyObj<LoaderService> = jasmine.createSpyObj(
    ['setLoading', 'getLoading']
  );

  const stateServiceMock: jasmine.SpyObj<FocusManagerService> =
    jasmine.createSpyObj('stateServiceMock', ['focusFirstElementInContainer']);

  describe('Class tests', () => {
    beforeEach(() => {
      testRunServiceMock.stopTestrun.and.returnValue(of(true));

      TestBed.configureTestingModule({
        declarations: [
          ProgressComponent,
          FakeProgressStatusCardComponent,
          FakeProgressTableComponent,
        ],
        providers: [
          TestrunStore,
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          { provide: LoaderService, useValue: loaderServiceMock },
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectHasDevices, value: false },
              { selector: selectIsOpenStartTestrun, value: false },
              { selector: selectIsTestrunStarted, value: false },
              {
                selector: selectSystemStatus,
                value: MOCK_PROGRESS_DATA_IN_PROGRESS,
              },
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
          BrowserAnimationsModule,
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

      testRunServiceMock.fetchSystemStatus.and.returnValue(
        of(MOCK_PROGRESS_DATA_IN_PROGRESS)
      );
      store = TestBed.inject(MockStore);
      fixture = TestBed.createComponent(ProgressComponent);
      spyOn(store, 'dispatch').and.callFake(() => {});
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('openTestRunModal on first flow', () => {
      beforeEach(() => {
        store.overrideSelector(selectIsOpenStartTestrun, true);
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
      } as MatDialogRef<typeof DeleteFormComponent>);

      component.openStopTestrunDialog(MOCK_PROGRESS_DATA_CANCELLING);

      expect(stopTestrunSpy).toHaveBeenCalled();
    });

    describe('#ngOnInit', () => {
      it('should get systemStatus value', () => {
        const spyOpenSetting = spyOn(component.testrunStore, 'getStatus');
        component.ngOnInit();

        expect(spyOpenSetting).toHaveBeenCalled();
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
          TestrunStore,
          { provide: TestRunService, useValue: testRunServiceMock },
          { provide: FocusManagerService, useValue: stateServiceMock },
          { provide: LoaderService, useValue: loaderServiceMock },
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
          BrowserAnimationsModule,
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
      testRunServiceMock.fetchSystemStatus.and.returnValue(
        of(MOCK_PROGRESS_DATA_IN_PROGRESS)
      );
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
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS
        );
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

    describe('with available systemStatus$ data, as Completed', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_COMPLIANT
        );
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
        store.overrideSelector(
          selectSystemStatus,
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
        store.overrideSelector(
          selectSystemStatus,
          MOCK_PROGRESS_DATA_MONITORING
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
});

@Component({
  selector: 'app-progress-status-card',
  template: '<div></div>',
})
class FakeProgressStatusCardComponent {
  @Input() systemStatus!: TestrunStatus;
}

@Component({
  selector: 'app-progress-table',
  template: '<div></div>',
})
class FakeProgressTableComponent {
  @Input() dataSource!: IResult[] | undefined;
  @Input() stepsToResolveCount!: number;
}
