// Service Status Types
export interface ServiceStatus {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'unknown';
  icon: string;
}

// Domain & PTR Types
export interface DomainMapping {
  ip: string;
  domain: string;
  ptrStatus: 'verified' | 'fix' | 'pending';
}

// Inbound Email Types
export interface InboundEmail {
  id: string;
  subject: string;
  sender: string;
  domain: string;
  messageType: 'bounce' | 'reply' | 'auto';
  timestamp: string;
}

// DNS Record Types
export interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  content: string;
}

export interface DNSZone {
  domain: string;
  nameservers: string[];
  records: DNSRecord[];
}

// Deployment Types
export interface DeploymentMapping {
  ip: string;
  domain: string;
}

export interface DeploymentConfig {
  server_ip: string;
  ssh_user: string;
  ssh_pass: string;
  mappings: DeploymentMapping[];
  fresh_install?: boolean;
  mode?: string;
  pool?: string;
  smtp_user?: {
    username: string;
    password: string;
  };
  routing?: RoutingRule[];
}

export interface RoutingRule {
  pattern: string;
  vmta: string;
}

// Log Types
export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error' | 'started';
  data?: T;
  message?: string;
  logs?: string;
}

export interface InstallResponse {
  status: string;
  message: string;
}

export interface LogsResponse {
  logs: string;
}

export interface EmailsResponse {
  emails: InboundEmail[];
}

// ============================================
// PMTA CONFIGURATION TYPES
// ============================================

// Virtual MTA (VMTA) Configuration
export interface VMTAConfig {
  id: string;
  name: string;
  smtpSourceHost: string;
  domainKey?: {
    selector: string;
    domain: string;
    keyPath: string;
  };
  dkimEnabled: boolean;
  maxConnections?: number;
  maxMessagesPerConnection?: number;
  maxMessagesPerHour?: number;
  retryAfter?: string;
  retryCount?: number;
  enabled: boolean;
}

// Virtual MTA Pool Configuration
export interface VMTAPool {
  id: string;
  name: string;
  vmtas: string[]; // VMTA names in this pool
  enabled: boolean;
  description?: string;
}

// Bounce Rule Configuration
export interface BounceRule {
  id: string;
  name: string;
  pattern: string;
  type: 'hard' | 'soft' | 'defer';
  action: 'bounce' | 'retry' | 'discard' | 'quarantine';
  message?: string;
  retryAfter?: string;
  enabled: boolean;
}

// SMTP Source Configuration
export interface SMTPSource {
  id: string;
  name: string;
  alwaysAllowRelaying: boolean;
  smtpService: boolean;
  addDateHeader: boolean;
  defaultVMTA?: string;
  requireAuth: boolean;
  allowedIps?: string[];
  maxConnections?: number;
  enabled: boolean;
}

// SMTP User Configuration
export interface SMTPUser {
  id: string;
  username: string;
  password: string;
  source?: string;
  maxMessagesPerHour?: number;
  enabled: boolean;
}

// Domain Configuration
export interface DomainConfig {
  id: string;
  name: string;
  useVirtualMTA?: string;
  useVirtualMTAPool?: string;
  maxMessagesPerHour?: number;
  retryAfter?: string;
  bounceAddress?: string;
  dkimEnabled: boolean;
  dkimSelector?: string;
  enabled: boolean;
}

// Pattern List for Routing
export interface PatternList {
  id: string;
  name: string;
  patterns: PatternRule[];
  enabled: boolean;
}

export interface PatternRule {
  id: string;
  pattern: string;
  virtualMTA?: string;
  virtualMTAPool?: string;
  priority: number;
}

// Global PMTA Settings
export interface PMTAGlobalSettings {
  runAsUser: string;
  runAsGroup: string;
  logFile: string;
  logMode: string;
  pidFile: string;
  spoolPath: string;
  maxConnections: number;
  maxMessagesPerConnection: number;
  maxMessagesPerHour: number;
  retryAfter: string;
  retryCount: number;
  bounceAfter: string;
  timeoutAfter: string;
  addDateHeader: boolean;
  addMessageIdHeader: boolean;
  hostname: string;
  smtpPort: number;
  httpPort: number;
  httpAdminPort: number;
}

// Complete PMTA Configuration
export interface PMTAConfig {
  global: PMTAGlobalSettings;
  vmtas: VMTAConfig[];
  pools: VMTAPool[];
  sources: SMTPSource[];
  users: SMTPUser[];
  domains: DomainConfig[];
  bounceRules: BounceRule[];
  patternLists: PatternList[];
}

// Config Import/Export
export interface ConfigExport {
  format: 'json' | 'xml' | 'conf';
  content: string;
  timestamp: string;
  version: string;
}

// Config Validation Result
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
}

export interface ConfigError {
  line?: number;
  section: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigWarning {
  line?: number;
  section: string;
  message: string;
  suggestion?: string;
}
