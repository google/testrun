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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs/internal/Observable';
import { Device } from '../model/device';
import { TestRunService } from '../services/test-run.service';
import {
  DeviceFormComponent,
  FormAction,
  FormResponse,
} from './device-form/device-form.component';
import { Subject, takeUntil } from 'rxjs';
import { DeleteFormComponent } from '../components/delete-form/delete-form.component';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';

@Component({
  selector: 'app-device-repository',
  templateUrl: './device-repository.component.html',
  styleUrls: ['./device-repository.component.scss'],
})
export class DeviceRepositoryComponent implements OnInit, OnDestroy {
  devices$!: Observable<Device[] | null>;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private testRunService: TestRunService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.devices$ = this.testRunService.getDevices();

    combineLatest([this.devices$, this.testRunService.isOpenAddDevice$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([devices, isOpenAddDevice]) => {
        if (!devices?.length && isOpenAddDevice) {
          this.openDialog();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openDialog(selectedDevice?: Device): void {
    const dialogRef = this.dialog.open(DeviceFormComponent, {
      ariaLabel: selectedDevice ? 'Edit device dialog' : 'Create device dialog',
      data: {
        device: selectedDevice || null,
        title: selectedDevice ? 'Edit device' : 'Create device',
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'device-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: FormResponse) => {
        if (!response) return;

        if (
          response.action === FormAction.Save &&
          response.device &&
          !selectedDevice
        ) {
          this.testRunService.addDevice(response.device);
        }
        if (
          response.action === FormAction.Save &&
          response.device &&
          selectedDevice
        ) {
          this.testRunService.updateDevice(selectedDevice, response.device);
        }
        if (response.action === FormAction.Delete && selectedDevice) {
          this.openDeleteDialog(selectedDevice);
        }
      });
  }

  openDeleteDialog(device: Device) {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: 'Delete device dialog',
      data: {
        title: 'Delete device',
        content: `You are about to delete ${
          device.manufacturer + ' ' + device.model
        }. Are you sure?`,
        device: device,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'delete-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteDevice => {
        if (deleteDevice) {
          this.testRunService.deleteDevice(device).subscribe(() => {
            this.testRunService.removeDevice(device);
          });
        } else {
          this.openDialog(device);
        }
      });
  }
}
