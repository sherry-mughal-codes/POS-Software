export interface EnvironmentInfo {
  django_version: string;
  python_version: string;
  debug: boolean;
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'unknown';
  engine: string;
  name: string;
  host: string;
  latency_ms: number | null;
  error?: string | null;
}

export interface BackendHealth {
  status: 'online' | 'offline';
  framework: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: EnvironmentInfo;
  services: {
    backend: BackendHealth;
    database: DatabaseHealth;
  };
  total_latency_ms: number;
}

export interface ApiRootResponse {
  name: string;
  version: string;
  phase: string;
  endpoints: Record<string, string>;
  timestamp: string;
}
