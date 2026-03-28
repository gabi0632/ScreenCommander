declare module 'node-windows' {
  interface ServiceEnvVar {
    name: string;
    value: string;
  }

  interface ServiceLogOnAs {
    account?: string;
    password?: string;
    domain?: string;
  }

  interface ServiceConfig {
    name: string;
    description: string;
    script: string;
    nodeOptions?: string[];
    env?: ServiceEnvVar[];
    maxRestarts?: number;
    wait?: number;
    grow?: number;
    logOnAs?: ServiceLogOnAs;
  }

  interface ServiceEventMap {
    install: () => void;
    alreadyinstalled: () => void;
    uninstall: () => void;
    alreadyuninstalled: () => void;
    start: () => void;
    stop: () => void;
    error: (err: Error) => void;
  }

  type ServiceEventName = keyof ServiceEventMap;

  class Service {
    constructor(config: ServiceConfig);

    install(): void;
    uninstall(): void;
    start(): void;
    stop(): void;

    on<K extends ServiceEventName>(event: K, listener: ServiceEventMap[K]): this;
  }

  export { Service, ServiceConfig, ServiceEnvVar, ServiceEventMap, ServiceEventName };
}
