import {Device} from './device';

export interface TestrunStatus {
  status: string;
  device: IDevice;
  started: string | null;
  finished: string | null;
  tests?: TestsResponse;
  report?: string;
}

export interface TestsData {
  total?: number;
  results?: IResult[];
}

type TestsResponse = TestsData | IResult[];

export interface IDevice extends Device {
  firmware: string;
}

export interface IResult {
  name: string;
  description: string;
  result: string;
}

export enum StatusOfTestrun {
  InProgress = 'In Progress',
  WaitingForDevice = 'Waiting for Device',
  Cancelled = 'Cancelled',
  Failed = 'Failed',
  Compliant = 'Compliant', // used for Completed
  NonCompliant = 'Non-Compliant', // used for Completed
  SmartReady = 'Smart Ready', // used for Completed
  Idle = 'Idle'
}

export enum StatusOfTestResult {
  Compliant = 'Compliant',
  SmartReady = 'Smart Ready',
  NonCompliant = 'Non-Compliant',
  Skipped = 'Skipped',
  NotStarted = 'Not Started'
}

export type TestrunStatusKey = keyof typeof StatusOfTestrun;
export type TestrunStatusValue = typeof StatusOfTestrun[TestrunStatusKey];
export type TestResultKey = keyof typeof StatusOfTestResult;
export type TestResultValue = typeof StatusOfTestResult[TestResultKey];
