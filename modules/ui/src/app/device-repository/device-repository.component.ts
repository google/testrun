import {Component, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Observable} from 'rxjs/internal/Observable';
import {Device} from '../model/device';
import {TestRunService} from '../test-run.service';
import {DeviceFormComponent} from './device-form/device-form.component';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-device-repository',
  templateUrl: './device-repository.component.html',
  styleUrls: ['./device-repository.component.scss'],
})
export class DeviceRepositoryComponent implements OnInit {
  devices$!: Observable<Device[] | null>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(private testRunService: TestRunService, public dialog: MatDialog) {
    this.testRunService.fetchDevices();
  }

  ngOnInit(): void {
    this.devices$ = this.testRunService.getDevices();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openDialog(selectedDevice?: Device): void {
    const dialogRef = this.dialog.open(DeviceFormComponent, {
      data: {
        device: selectedDevice || null,
        title: selectedDevice ? 'Edit device' : 'Create device'
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'device-form-dialog'
    });

    dialogRef?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(device => {
        if (!selectedDevice && device) {
          this.testRunService.addDevice(device);
        }
        if (selectedDevice && device) {
          this.testRunService.updateDevice(selectedDevice, device);
        }
      });
  }
}
