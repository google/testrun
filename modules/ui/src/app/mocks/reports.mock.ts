import { HistoryTestrun, TestReportsList } from '../model/testrun-status';
import { MatTableDataSource } from '@angular/material/table';
import { DeviceStatus, TestingType } from '../model/device';

export const HISTORY = [
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    report: 'report/123',
    export: 'export/123',
    delete: 'report/123',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:07',
      firmware: '1.2.3',
      test_pack: TestingType.Qualification,
    },
    report: 'report/1234',
    export: 'export/1234',
    delete: 'report/1234',
    started: '2023-07-23T10:11:00.123Z',
    finished: '2023-07-23T10:17:10.123Z',
  },
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:08',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    report: 'report/12345',
    export: 'export/12345',
    delete: 'report/12345',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
] as TestReportsList;

export const HISTORY_AFTER_REMOVE = [
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    report: 'report/123',
    export: 'export/123',
    delete: 'report/123',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:08',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    report: 'report/12345',
    export: 'export/12345',
    delete: 'report/12345',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
] as TestReportsList;

export const FORMATTED_HISTORY = [
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    report: 'report/123',
    export: 'export/123',
    delete: 'report/123',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
    deviceFirmware: '1.2.2',
    deviceInfo: 'Delta 03-DIN-SRC',
    testResult: 'Compliant',
    duration: '06m 10s',
    program: 'Device Qualification',
  },
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:07',
      firmware: '1.2.3',
      test_pack: TestingType.Qualification,
    },
    report: 'report/1234',
    export: 'export/1234',
    delete: 'report/1234',
    started: '2023-07-23T10:11:00.123Z',
    finished: '2023-07-23T10:17:10.123Z',
    deviceFirmware: '1.2.3',
    deviceInfo: 'Delta 03-DIN-SRC',
    testResult: 'Compliant',
    duration: '06m 10s',
    program: 'Device Qualification',
  },
  {
    status: 'Complete',
    result: 'Compliant',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:08',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    report: 'report/12345',
    export: 'export/12345',
    delete: 'report/12345',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
    deviceFirmware: '1.2.2',
    deviceInfo: 'Delta 03-DIN-SRC',
    testResult: 'Compliant',
    duration: '06m 10s',
    program: 'Device Qualification',
  },
] as HistoryTestrun[];

export const FILTERS = {
  deviceInfo: 'test',
  deviceFirmware: 'test',
  results: ['test'],
  dateRange: 'test',
};
export const EMPTY_FILTERS = {
  deviceInfo: '',
  deviceFirmware: '',
  results: [''],
  dateRange: '',
};

export const DATA_SOURCE_INITIAL_VALUE_NOT_EMPTY =
  new MatTableDataSource<HistoryTestrun>([...FORMATTED_HISTORY]);

export const DATA_SOURCE_FOR_EMPTY_FILTERS =
  new MatTableDataSource<HistoryTestrun>([...FORMATTED_HISTORY]);
