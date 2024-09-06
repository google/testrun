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
import { Device, DeviceView, TestModule } from '../../model/device';
import { Subject, takeUntil, timer } from 'rxjs';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import { FocusManagerService } from '../../services/focus-manager.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { TestrunInitiateFormComponent } from '../testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { DevicesStore } from './devices.store';
import { DeviceQualificationFromComponent } from './components/device-qualification-from/device-qualification-from.component';

export enum FormAction {
  Delete = 'Delete',
  Close = 'Close',
  Save = 'Save',
}

export interface FormResponse {
  device?: Device;
  action: FormAction;
  index: number;
}

@Component({
  selector: 'app-device-repository',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss'],
  providers: [DevicesStore],
})
export class DevicesComponent implements OnInit, OnDestroy {
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
      this.devicesStore.testModules$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([devices, isOpenAddDevice, testModules]) => {
        if (!devices?.length && isOpenAddDevice) {
          this.openDialog(devices, testModules);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  openStartTestrun(
    selectedDevice: Device,
    devices: Device[],
    testModules: TestModule[]
  ): void {
    const dialogRef = this.dialog.open(TestrunInitiateFormComponent, {
      ariaLabel: 'Initiate testrun',
      data: {
        devices,
        device: selectedDevice,
        testModules,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (status) {
          this.devicesStore.setStatus(status);
          // @ts-expect-error data layer is not null
          window.dataLayer.push({
            event: 'successful_testrun_initiation',
          });
          this.route.navigate([Routes.Testing]);
        }
      });
  }

  openDialog(
    devices: Device[] = [],
    testModules: TestModule[],
    initialDevice?: Device,
    selectedDevice?: Device,
    isEditDevice = false,
    index = 0
  ): void {
    const dialogRef = this.dialog.open(DeviceQualificationFromComponent, {
      ariaLabel: isEditDevice ? 'Edit device' : 'Create Device',
      data: {
        device: selectedDevice || null,
        initialDevice,
        title: isEditDevice ? 'Edit device' : 'Create Device',
        testModules: testModules,
        devices,
        index,
        isCreate: !isEditDevice,
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
        this.devicesStore.selectDevice(null);
        if (!response) {
          this.devicesStore.setIsOpenAddDevice(false);
          return;
        }
        if (response.action === FormAction.Close) {
          this.openCloseDialog(
            devices,
            testModules,
            initialDevice,
            response.device,
            isEditDevice,
            response.index
          );
        } else if (
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
        if (response.action === FormAction.Delete && initialDevice) {
          this.devicesStore.selectDevice(initialDevice);
          if (response.device) {
            this.openDeleteDialog(
              devices,
              testModules,
              initialDevice,
              response.device,
              isEditDevice,
              response.index
            );
          }
        }
      });
  }

  openCloseDialog(
    devices: Device[],
    testModules: TestModule[],
    initialDevice?: Device,
    device?: Device,
    isEditDevice = false,
    index = 0
  ) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Close the Device menu',
      data: {
        title: 'Are you sure?',
        content: `By closing the device profile you will loose any new changes you have made to the device.`,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'simple-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(close => {
        if (!close) {
          this.openDialog(
            devices,
            testModules,
            initialDevice,
            device,
            isEditDevice,
            index
          );
          this.devicesStore.selectDevice(null);
        }
      });
  }

  openDeleteDialog(
    devices: Device[],
    testModules: TestModule[],
    initialDevice: Device,
    device: Device,
    isEditDevice = false,
    index = 0
  ) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Delete device',
      data: {
        title: 'Delete device?',
        content: `You are about to delete ${
          initialDevice.manufacturer + ' ' + initialDevice.model
        }. Are you sure?`,
        device: device,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'simple-dialog',
    });
    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(deleteDevice => {
        if (deleteDevice) {
          this.devicesStore.deleteDevice({
            device: initialDevice,
            onDelete: () => {
              this.focusNextButton();
              this.devicesStore.selectDevice(null);
            },
          });
        } else {
          this.openDialog(
            devices,
            testModules,
            initialDevice,
            device,
            isEditDevice,
            index
          );
          this.devicesStore.selectDevice(null);
        }
      });
  }

  private focusNextButton() {
    // Try to focus next device item, if exist
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
