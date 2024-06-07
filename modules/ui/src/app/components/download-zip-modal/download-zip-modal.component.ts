import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { EscapableDialogComponent } from '../escapable-dialog/escapable-dialog.component';
import { Profile } from '../../model/profile';
import { MatButtonModule } from '@angular/material/button';
import { NgForOf, NgIf } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

interface DialogData {
  hasProfiles: boolean;
  profiles: Profile[];
}

@Component({
  selector: 'app-download-zip-modal',
  standalone: true,
  imports: [
    MatDialogActions,
    MatDialogModule,
    MatButtonModule,
    NgIf,
    NgForOf,
    MatFormField,
    MatSelectModule,
    MatOptionModule,
  ],
  templateUrl: './download-zip-modal.component.html',
  styleUrl: './download-zip-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadZipModalComponent extends EscapableDialogComponent {
  profiles: Profile[] = [];
  selectedProfile: string = '';
  constructor(
    public override dialogRef: MatDialogRef<DownloadZipModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    super(dialogRef);
    if (data.hasProfiles) {
      this.profiles = [...data.profiles] as Profile[];
      this.profiles.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      this.selectedProfile = this.profiles[0].name;
    }
  }

  cancel(profile?: string | null) {
    this.dialogRef.close(profile);
  }
}
