export enum Topic {
  NetworkAdapters = 'events/adapter',
  InternetConnection = 'events/internet',
  Status = 'status',
}

export interface InternetConnection {
  connection: boolean | null;
}
