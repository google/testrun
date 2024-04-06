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
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Device, DeviceView } from '../../model/device';
import {
  DeviceFormComponent,
  FormAction,
  FormResponse,
} from './components/device-form/device-form.component';
import { Subject, takeUntil } from 'rxjs';
import { DeleteFormComponent } from '../../components/delete-form/delete-form.component';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import { FocusManagerService } from '../../services/focus-manager.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { timer } from 'rxjs/internal/observable/timer';
import { ProgressInitiateFormComponent } from '../testrun/components/progress-initiate-form/progress-initiate-form.component';
import { DevicesStore } from './devices.store';

@Component({
  selector: 'app-device-repository',
  templateUrl: './device-repository.component.html',
  styleUrls: ['./device-repository.component.scss'],
  providers: [DevicesStore],
})
export class DeviceRepositoryComponent implements OnInit, OnDestroy {
  readonly DeviceView = DeviceView;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  viewModel$ = this.devicesStore.viewModel$;

  constructor(
    private readonly focusManagerService: FocusManagerService,
    public dialog: MatDialog,
    private element: ElementRef,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private route: Router,
    private devicesStore: DevicesStore
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.devicesStore.devices$,
      this.devicesStore.isOpenAddDevice$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([devices, isOpenAddDevice]) => {
        if (!devices?.length && isOpenAddDevice) {
          this.openDialog(devices);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openStartTestrun(selectedDevice: Device, devices: Device[]): void {
    const dialogRef = this.dialog.open(ProgressInitiateFormComponent, {
      ariaLabel: 'Initiate testrun',
      data: {
        devices,
        device: selectedDevice,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data === 'testrunStarted') {
          this.route.navigate([Routes.Testing]);
        }
      });
  }

  openDialog(
    devices: Device[] = [],
    selectedDevice?: Device,
    focusDeleteButton = false
  ): void {
    const dialogRef = this.dialog.open(DeviceFormComponent, {
      ariaLabel: selectedDevice ? 'Edit device' : 'Create device',
      data: {
        device: selectedDevice || null,
        title: selectedDevice ? 'Edit device' : 'Create device',
        testModules: this.devicesStore.testModules,
        devices,
      },
      autoFocus: focusDeleteButton ? '.delete-button' : true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'device-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: FormResponse) => {
        this.devicesStore.selectDevice(null);
        if (!response) {
          this.devicesStore.setIsOpenAddDevice(false);
          return;
        }
        if (
          response.action === FormAction.Save &&
          response.device &&
          !selectedDevice
        ) {
          timer(10)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.focusManagerService.focusFirstElementInContainer();
            });
        }
        if (response.action === FormAction.Delete && selectedDevice) {
          this.devicesStore.selectDevice(selectedDevice);
          this.openDeleteDialog(devices, selectedDevice);
        }
      });
  }

  openDeleteDialog(devices: Device[], device: Device) {
    const dialogRef = this.dialog.open(DeleteFormComponent, {
      ariaLabel: 'Delete device',
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
          this.devicesStore.deleteDevice({
            device,
            onDelete: () => {
              this.focusNextButton();
              this.devicesStore.selectDevice(null);
            },
          });
        } else {
          this.openDialog(devices, device, true);
          this.devicesStore.selectDevice(null);
        }
      });
  }

  private focusNextButton() {
    // Try to focus next device item, if exitst
    const next = this.element.nativeElement.querySelector(
      '.device-item-selected + app-device-item button'
    );
    if (next) {
      next.focus();
    } else {
      this.changeDetectorRef.detectChanges();
      // If next device item doest not exist, add device button should be focused
      const addButton =
        this.element.nativeElement.querySelector('.device-add-button');
      addButton?.focus();
    }
  }
}
