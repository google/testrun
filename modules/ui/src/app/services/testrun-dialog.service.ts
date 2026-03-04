import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FocusManagerService } from './focus-manager.service';
import { TestrunInitiateFormComponent } from '../pages/testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { TestrunStatus } from '../model/testrun-status';
import { Observable } from 'rxjs/internal/Observable';
import { tap } from 'rxjs/operators';
import { timer } from 'rxjs';
import { Device, TestModule } from '../model/device';

export interface TestrunData {
  testModules: TestModule[];
  device?: Device;
  devices?: Device[];
}

@Injectable({ providedIn: 'root' })
export class TestrunDialogService {
  dialog = inject(MatDialog);
  focusManagerService = inject(FocusManagerService);

  openInitiateDialog(
    data: Partial<TestrunData>
  ): Observable<TestrunStatus | undefined> {
    const dialogRef = this.dialog.open(TestrunInitiateFormComponent, {
      ariaLabel: 'Start new testrun',
      data,
      autoFocus: 'dialog',
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    return dialogRef.afterClosed().pipe(
      tap(status => {
        if (status) {
          this.sendAnalytics();
        }
      })
    );
  }

  handleFocus(delay = 100): void {
    timer(delay).subscribe(() => {
      this.focusManagerService.focusFirstElementInContainer();
    });
  }

  private sendAnalytics(): void {
    // @ts-expect-error data layer is not null
    window.dataLayer?.push({ event: 'successful_testrun_initiation' });
  }
}
