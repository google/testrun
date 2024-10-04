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
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  Device,
  DeviceStatus,
  DeviceView,
  TestModule,
} from '../../model/device';
import { map, Subject, takeUntil, timer } from 'rxjs';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import { FocusManagerService } from '../../services/focus-manager.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { TestrunInitiateFormComponent } from '../testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { DevicesStore } from './devices.store';
import { DeviceQualificationFromComponent } from './components/device-qualification-from/device-qualification-from.component';
import { Observable } from 'rxjs/internal/Observable';
import { CanComponentDeactivate } from '../../guards/can-deactivate.guard';

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
export class DevicesComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  readonly DeviceView = DeviceView;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  viewModel$ = this.devicesStore.viewModel$;
  deviceDialog: MatDialogRef<DeviceQualificationFromComponent> | undefined;

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
        if (
          !devices?.filter(device => device.status === DeviceStatus.VALID)
            .length &&
          isOpenAddDevice
        ) {
          this.openDialog(devices, testModules);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  canDeactivate(): Observable<boolean> {
    this.deviceDialog?.componentInstance?.closeForm();
    return this.dialog.afterAllClosed.pipe(
      map(() => {
        return true;
      })
    );
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
      autoFocus: 'dialog',
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
    index = 0,
    deviceIndex?: number
  ): void {
    this.deviceDialog = this.dialog.open(DeviceQualificationFromComponent, {
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
    this.deviceDialog?.beforeClosed().subscribe((response: FormResponse) => {
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
          response.index,
          deviceIndex
        );
      } else if (response.action === FormAction.Save && response.device) {
        timer(10)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            if (!initialDevice) {
              this.focusManagerService.focusFirstElementInContainer();
            } else if (deviceIndex !== undefined) {
              this.focusSelectedButton(deviceIndex);
            }
          });
      }
      if (response.action === FormAction.Delete && initialDevice) {
        if (response.device) {
          this.openDeleteDialog(
            devices,
            testModules,
            initialDevice,
            response.device,
            isEditDevice,
            response.index,
            deviceIndex!
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
    index = 0,
    deviceIndex?: number
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

    dialogRef?.beforeClosed().subscribe(close => {
      if (!close) {
        this.openDialog(
          devices,
          testModules,
          initialDevice,
          device,
          isEditDevice,
          index
        );
      } else if (deviceIndex !== undefined) {
        this.focusSelectedButton(deviceIndex);
      } else {
        this.focusManagerService.focusFirstElementInContainer();
      }
    });
  }

  openDeleteDialog(
    devices: Device[],
    testModules: TestModule[],
    initialDevice: Device,
    device: Device,
    isEditDevice = false,
    index = 0,
    deviceIndex: number
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
    dialogRef?.beforeClosed().subscribe(deleteDevice => {
      if (deleteDevice) {
        this.devicesStore.deleteDevice({
          device: initialDevice,
          onDelete: () => {
            this.focusNextButton(deviceIndex);
          },
        });
      } else {
        this.openDialog(
          devices,
          testModules,
          initialDevice,
          device,
          isEditDevice,
          index,
          deviceIndex
        );
      }
    });
  }

  private focusSelectedButton(index: number) {
    const selected = this.element.nativeElement.querySelectorAll(
      'app-device-item .button-edit'
    )[index];
    if (selected) {
      selected.focus();
    }
  }
  private focusNextButton(index: number) {
    this.changeDetectorRef.detectChanges();
    // Try to focus next device item, if exist
    const next = this.element.nativeElement.querySelectorAll(
      'app-device-item .button-edit'
    )[index];
    if (next) {
      next.focus();
    } else {
      // If next device item doest not exist, add device button should be focused
      const addButton =
        this.element.nativeElement.querySelector('.device-add-button');
      addButton?.focus();
    }
  }
}
