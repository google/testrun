export enum Topic {
  NetworkAdapters = 'events/adapter',
  InternetConnection = 'events/internet',
}

export interface InternetConnection {
  connection: boolean | null;
}
