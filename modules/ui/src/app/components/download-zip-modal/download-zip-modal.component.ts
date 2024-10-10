import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { TestrunStatus, StatusOfTestrun } from '../../model/testrun-status';
import { DownloadReportComponent } from '../download-report/download-report.component';

interface DialogData {
  profiles: Profile[];
  testrunStatus?: TestrunStatus;
  isTestingComplete?: boolean;
}

@Component({
  selector: 'app-download-zip-modal',
  standalone: true,
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
    RouterLink,
    DownloadReportComponent,
  ],
  templateUrl: './download-zip-modal.component.html',
  styleUrl: './download-zip-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadZipModalComponent extends EscapableDialogComponent {
  readonly NO_PROFILE = {
    name: 'No Risk Profile selected',
    questions: [],
  } as Profile;
  public readonly Routes = Routes;
  public readonly StatusOfTestrun = StatusOfTestrun;
  profiles: Profile[] = [];
  selectedProfile: Profile;
  constructor(
    private readonly testRunService: TestRunService,
    public override dialogRef: MatDialogRef<DownloadZipModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    super(dialogRef);
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

  cancel(profile?: Profile | null) {
    if (profile === null) {
      this.dialogRef.close(null);
      return;
    }
    let value = profile?.name;
    if (profile && profile?.name === this.NO_PROFILE.name) {
      value = '';
    }
    this.dialogRef.close(value);
  }

  public getRiskClass(riskResult: string): RiskResultClassName {
    return this.testRunService.getRiskClass(riskResult);
  }
}
