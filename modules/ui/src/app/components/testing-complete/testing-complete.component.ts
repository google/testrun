import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TestRunService } from '../../services/test-run.service';
import { Router } from '@angular/router';
import { DownloadZipModalComponent } from '../download-zip-modal/download-zip-modal.component';
import { Routes } from '../../model/routes';
import { Profile } from '../../model/profile';
import { TestrunStatus } from '../../model/testrun-status';
import { FocusManagerService } from '../../services/focus-manager.service';

@Component({
  selector: 'app-testing-complete',
  standalone: true,
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestingCompleteComponent implements OnDestroy, OnInit {
  @Input() profiles: Profile[] = [];
  @Input() data!: TestrunStatus | null;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    public dialog: MatDialog,
    private testrunService: TestRunService,
    private route: Router,
    private focusManagerService: FocusManagerService
  ) {}

  ngOnInit() {
    this.openTestingCompleteModal();
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
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        if (profile === undefined) {
          timer(1000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.focusManagerService.focusFirstElementInContainer();
            });
          return;
        }
        if (profile === null) {
          this.route.navigate([Routes.RiskAssessment]).then(() =>
            timer(1000)
              .pipe(takeUntil(this.destroy$))
              .subscribe(() => {
                this.focusManagerService.focusFirstElementInContainer();
              })
          );
        } else if (this.data?.report != null) {
          this.testrunService.downloadZip(
            this.getZipLink(this.data?.report),
            profile
          );
        }
      });
  }

  private getZipLink(reportURL: string): string {
    return reportURL.replace('report', 'export');
  }
}
