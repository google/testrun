import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import {
  DialogCloseAction,
  DialogCloseResult,
  DownloadZipModalComponent,
} from '../download-zip-modal/download-zip-modal.component';
import { Profile } from '../../model/profile';
import { TestrunStatus } from '../../model/testrun-status';
import { FocusManagerService } from '../../services/focus-manager.service';
import { TestingType } from '../../model/device';

@Component({
  selector: 'app-testing-complete',
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestingCompleteComponent implements OnDestroy, OnInit {
  dialog = inject(MatDialog);
  private focusManagerService = inject(FocusManagerService);

  @Input() profiles: Profile[] = [];
  @Input() data!: TestrunStatus | null;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  ngOnInit() {
    timer(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openTestingCompleteModal();
      });
  }
  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  private openTestingCompleteModal(): void {
    const dialogRef = this.dialog.open(DownloadZipModalComponent, {
      ariaLabel: 'Testing complete',
      data: {
        profiles: this.profiles,
        testrunStatus: this.data,
        isTestingComplete: true,
        report: this.data?.report,
        export: this.data?.export,
        isPilot: this.data?.device.test_pack === TestingType.Pilot,
      },
      autoFocus: 'first-tabbable',
      ariaDescribedBy: 'testing-result-main-info',
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: DialogCloseResult) => {
        if (result.action === DialogCloseAction.Close) {
          this.focusFirstElement();
          return;
        }
      });
  }

  private focusFirstElement() {
    timer(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.focusManagerService.focusFirstElementInContainer();
      });
  }
}
