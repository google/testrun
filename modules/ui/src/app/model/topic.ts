export enum Topic {
  NetworkAdapters = 'events/adapter',
  InternetConnection = 'events/internet',
  Status = 'status',
  Info = 'info',
}

export interface InternetConnection {
  connection: boolean | null;
}

export interface Info {
  message: string;
}
