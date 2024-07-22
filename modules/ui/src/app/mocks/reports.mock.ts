import { HistoryTestrun, TestrunStatus } from '../model/testrun-status';
import { MatTableDataSource } from '@angular/material/table';

export const HISTORY = [
  {
    mac_addr: '01:02:03:04:05:06',
    status: 'compliant',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
  {
    status: 'compliant',
    mac_addr: '01:02:03:04:05:07',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:07',
      firmware: '1.2.3',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-07-23T10:11:00.123Z',
    finished: '2023-07-23T10:17:10.123Z',
  },
  {
    mac_addr: null,
    status: 'compliant',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:08',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
] as TestrunStatus[];

export const HISTORY_AFTER_REMOVE = [
  {
    mac_addr: '01:02:03:04:05:06',
    status: 'compliant',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
  {
    mac_addr: null,
    status: 'compliant',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:08',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
  },
];

export const FORMATTED_HISTORY = [
  {
    status: 'compliant',
    mac_addr: '01:02:03:04:05:06',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:06',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
    deviceFirmware: '1.2.2',
    deviceInfo: 'Delta 03-DIN-SRC',
    duration: '06m 10s',
  },
  {
    status: 'compliant',
    mac_addr: '01:02:03:04:05:07',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:07',
      firmware: '1.2.3',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-07-23T10:11:00.123Z',
    finished: '2023-07-23T10:17:10.123Z',
    deviceFirmware: '1.2.3',
    deviceInfo: 'Delta 03-DIN-SRC',
    duration: '06m 10s',
  },
  {
    mac_addr: null,
    status: 'compliant',
    device: {
      manufacturer: 'Delta',
      model: '03-DIN-SRC',
      mac_addr: '01:02:03:04:05:08',
      firmware: '1.2.2',
    },
    report: 'https://api.testrun.io/report.pdf',
    started: '2023-06-23T10:11:00.123Z',
    finished: '2023-06-23T10:17:10.123Z',
    deviceFirmware: '1.2.2',
    deviceInfo: 'Delta 03-DIN-SRC',
    duration: '06m 10s',
  },
];

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
