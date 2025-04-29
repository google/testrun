import { HistoryTestrun, TestrunStatus } from '../model/testrun-status';
import { MatTableDataSource } from '@angular/material/table';
import { DeviceStatus, TestingType } from '../model/device';

export const HISTORY = [
  {
    mac_addr: '01:02:03:04:05:06',
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
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
  {
    status: 'Complete',
    result: 'Compliant',
    mac_addr: '01:02:03:04:05:07',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:07',
      firmware: '1.2.3',
      test_pack: TestingType.Qualification,
    },
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
    started: '2023-07-23T10:11:00.123Z',
    finished: '2023-07-23T10:17:10.123Z',
  },
  {
    mac_addr: null,
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
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
] as TestrunStatus[];

export const HISTORY_AFTER_REMOVE = [
  {
    mac_addr: '01:02:03:04:05:06',
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
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
  {
    mac_addr: null,
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
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
] as TestrunStatus[];

export const FORMATTED_HISTORY = [
  {
    status: 'Complete',
    result: 'Compliant',
    mac_addr: '01:02:03:04:05:06',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
      test_pack: TestingType.Qualification,
    },
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
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
    mac_addr: '01:02:03:04:05:07',
    device: {
      status: DeviceStatus.VALID,
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:07',
      firmware: '1.2.3',
      test_pack: TestingType.Qualification,
    },
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
    started: '2023-07-23T10:11:00.123Z',
    finished: '2023-07-23T10:17:10.123Z',
    deviceFirmware: '1.2.3',
    deviceInfo: 'Delta 03-DIN-SRC',
    testResult: 'Compliant',
    duration: '06m 10s',
    program: 'Device Qualification',
  },
  {
    mac_addr: null,
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
    tags: [],
    report: 'https://api.testrun.io/report.pdf',
    export: 'https://api.testrun.io/export.pdf',
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
