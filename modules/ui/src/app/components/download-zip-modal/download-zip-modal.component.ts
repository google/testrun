import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { EscapableDialogComponent } from '../escapable-dialog/escapable-dialog.component';
import {
  Profile,
  ProfileStatus,
  RiskResultClassName,
} from '../../model/profile';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TestRunService } from '../../services/test-run.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import {
  TestrunStatus,
  StatusOfTestrun,
  ResultOfTestrun,
} from '../../model/testrun-status';
import { DownloadReportComponent } from '../download-report/download-report.component';
import { Subject, takeUntil, timer } from 'rxjs';
import { FocusManagerService } from '../../services/focus-manager.service';

interface DialogData {
  profiles: Profile[];
  testrunStatus?: TestrunStatus;
  isTestingComplete?: boolean;
  report: string | null;
  export: string | null;
  isPilot?: boolean;
}

export enum DialogCloseAction {
  Close,
  Redirect,
  Download,
}

export interface DialogCloseResult {
  action: DialogCloseAction;
  profile: string | null | undefined;
}

@Component({
  selector: 'app-download-zip-modal',

  imports: [
    CommonModule,
    MatDialogActions,
    MatDialogModule,
    MatButtonModule,
    NgIf,
    NgForOf,
    MatFormField,
    MatSelectModule,
    MatOptionModule,
    DownloadReportComponent,
  ],
  templateUrl: './download-zip-modal.component.html',
  styleUrl: './download-zip-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadZipModalComponent
  extends EscapableDialogComponent
  implements OnDestroy, OnInit
{
  private readonly testRunService = inject(TestRunService);
  override dialogRef: MatDialogRef<DownloadZipModalComponent>;
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private route = inject(Router);
  private focusManagerService = inject(FocusManagerService);

  private destroy$: Subject<boolean> = new Subject<boolean>();
  readonly NO_PROFILE = {
    name: 'No Risk Profile selected',
    questions: [],
  } as Profile;
  public readonly Routes = Routes;
  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly ResultOfTestrun = ResultOfTestrun;
  profiles: Profile[] = [];
  selectedProfile: Profile;
  constructor() {
    const dialogRef =
      inject<MatDialogRef<DownloadZipModalComponent>>(MatDialogRef);

    super();
    this.dialogRef = dialogRef;
    const data = this.data;

    this.profiles = data.profiles.filter(
      profile => profile.status === ProfileStatus.VALID
    );
    if (this.profiles.length > 0) {
      this.profiles.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    }
    this.profiles.unshift(this.NO_PROFILE);
    this.selectedProfile = this.profiles[0];
  }

  ngOnInit() {
    this.dialogRef
      ?.beforeClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: DialogCloseResult) => {
        if (result.action === DialogCloseAction.Close) {
          return;
        }
        if (result.action === DialogCloseAction.Redirect) {
          this.route.navigate([Routes.RiskAssessment]).then(() =>
            timer(1000).subscribe(() => {
              this.focusManagerService.focusFirstElementInContainer();
            })
          );
          return;
        }
        if (
          (this.data.report != null || this.data.export != null) &&
          typeof result.profile === 'string'
        ) {
          this.testRunService.downloadZip(
            this.getZipLink(this.data),
            result.profile
          );
          if (this.data.isPilot) {
            // @ts-expect-error data layer is not null
            window.dataLayer.push({
              event: 'pilot_download_zip',
            });
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  cancel(profile?: Profile | null) {
    if (profile === null) {
      this.dialogRef.close({
        action: DialogCloseAction.Redirect,
      } as DialogCloseResult);
      return;
    }
    if (!profile) {
      this.dialogRef.close({
        action: DialogCloseAction.Close,
      } as DialogCloseResult);
      return;
    }
    let value = profile.name;
    if (value === this.NO_PROFILE.name) {
      value = '';
    }
    this.dialogRef.close({
      action: DialogCloseAction.Download,
      profile: value,
    } as DialogCloseResult);
  }

  public getRiskClass(riskResult: string): RiskResultClassName {
    return this.testRunService.getRiskClass(riskResult);
  }

  public getTestingResult(data: TestrunStatus): string {
    if (data.status === StatusOfTestrun.Complete && data.result) {
      return data.result;
    }
    return data.status;
  }

  private getZipLink(data: DialogData): string {
    return data.export || data.report!.replace('report', 'export');
  }
}
