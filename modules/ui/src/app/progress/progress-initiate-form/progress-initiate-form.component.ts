import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TestRunService} from '../../test-run.service';
import {Observable} from 'rxjs/internal/Observable';
import {Device} from '../../model/device';

@Component({
  selector: 'app-progress-initiate-form',
  templateUrl: './progress-initiate-form.component.html',
  styleUrls: ['./progress-initiate-form.component.scss']
})
export class ProgressInitiateFormComponent implements OnInit {
  devices$!: Observable<Device[] | null>;

  constructor(public dialogRef: MatDialogRef<ProgressInitiateFormComponent>, private readonly testRunService: TestRunService) {
    if (this.testRunService.getDevices().value === null) {
      this.testRunService.fetchDevices();
    }
  }

  ngOnInit() {
    this.devices$ = this.testRunService.getDevices();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  deviceSelected(device: Device) {
    console.log(device);
  }
}
