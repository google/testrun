import { TestBed, fakeAsync } from '@angular/core/testing';

import { TestrunDialogService } from './testrun-dialog.service';
import { MatDialogRef } from '@angular/material/dialog';
import { FocusManagerService } from './focus-manager.service';
import { of } from 'rxjs';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from '../mocks/testrun.mock';
import { TestrunInitiateFormComponent } from '../pages/testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { device, MOCK_TEST_MODULES } from '../mocks/device.mock';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../store/state';
import { fetchSystemStatusSuccess } from '../store/actions';

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
        ariaLabel: 'Start new testrun',
        data: {
          devices: [device],
          device: device,
          testModules: MOCK_TEST_MODULES,
        },
        autoFocus: 'dialog',
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
});
