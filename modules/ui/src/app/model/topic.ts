export enum Topic {
  NetworkAdapters = 'network_adapters',
  InternetConnection = 'events/internet',
}

export interface InternetConnection {
  connection: boolean | null;
}
