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
  MOCK_PROGRESS_DATA_WAITING_FOR_DEVICE,
} from '../../mocks/testrun.mock';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Component, Input } from '@angular/core';
import { IResult, TestrunStatus } from '../../model/testrun-status';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TestrunInitiateFormComponent } from './components/testrun-initiate-form/testrun-initiate-form.component';
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
  selectIsOpenStartTestrun,
  selectIsOpenWaitSnackBar,
  selectRiskProfiles,
  selectSystemStatus,
  selectTestModules,
} from '../../store/selectors';
import { TestrunStore } from './testrun.store';
import {
  fetchSystemStatusSuccess,
  setTestrunStatus,
} from '../../store/actions';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NotificationService } from '../../services/notification.service';
import { Profile } from '../../model/profile';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DownloadOptionsComponent } from './components/download-options/download-options.component';
import { TestrunTableComponent } from './components/testrun-table/testrun-table.component';
import { TestrunStatusCardComponent } from './components/testrun-status-card/testrun-status-card.component';

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
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectHasDevices, value: false },
              { selector: selectIsAllDevicesOutdated, value: false },
              { selector: selectIsOpenStartTestrun, value: false },
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
          {
            provide: MatDialogRef,
            useValue: {},
          },
          provideMockStore({
            selectors: [
              { selector: selectDevices, value: [] },
              { selector: selectHasDevices, value: false },
              { selector: selectIsAllDevicesOutdated, value: false },
              { selector: selectIsOpenStartTestrun, value: false },
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
      spyOn(store, 'dispatch').and.callFake(() => {});
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
        const openSpy = spyOn(component.dialog, 'open').and.returnValue({
          afterClosed: () => of(MOCK_PROGRESS_DATA_IN_PROGRESS),
        } as MatDialogRef<typeof TestrunInitiateFormComponent>);
        const startBtn = compiled.querySelector(
          '.start-button'
        ) as HTMLButtonElement;
        startBtn.click();

        expect(openSpy).toHaveBeenCalledWith(TestrunInitiateFormComponent, {
          ariaLabel: 'Initiate testrun',
          autoFocus: true,
          hasBackdrop: true,
          disableClose: true,
          panelClass: 'initiate-test-run-dialog',
          data: {
            testModules: [],
          },
        });
        expect(store.dispatch).toHaveBeenCalledWith(
          fetchSystemStatusSuccess({
            systemStatus: MOCK_PROGRESS_DATA_IN_PROGRESS,
          })
        );
        tick(1000);
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
        );

        expect(tags).toBeTruthy();
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
