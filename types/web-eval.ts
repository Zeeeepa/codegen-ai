/**
 * Type definitions for the enhanced web-eval system
 */

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'ui' | 'functionality' | 'performance' | 'accessibility' | 'navigation';
  priority: 'high' | 'medium' | 'low';
  selector?: string;
  action: 'click' | 'type' | 'scroll' | 'hover' | 'check' | 'navigate';
  expectedResult: string;
  timeout?: number;
}

export interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  executionTime: number;
  error?: string;
  screenshot?: string;
  details: string;
  actualResult?: string;
  expectedResult: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  config: TestSuiteConfig;
}

export interface TestSuiteConfig {
  timeout: number;
  retries: number;
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  waitForNetworkIdle: boolean;
  captureScreenshots: boolean;
}

export interface WebEvalResult {
  success: boolean;
  report: string;
  testId: string;
  summary: TestSummary;
  results: TestResult[];
  duration: number;
  timestamp: number;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  overallStatus: 'passed' | 'failed' | 'warning';
  statusEmoji: string;
  statusDescription: string;
  severityBreakdown: SeverityBreakdown;
}

export interface SeverityBreakdown {
  high_severity: Issue[];
  medium_severity: Issue[];
  low_severity: Issue[];
}

export interface Issue {
  category: string;
  description: string;
  testCase?: string;
  element?: string;
  action?: string;
  expectedResult?: string;
  actualResult?: string;
}

export interface BrowserConfig {
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  timeout: number;
  waitForNetworkIdle: boolean;
  userAgent?: string;
  args: string[];
}

export interface AIAnalysisResult {
  overallAssessment: string;
  identifiedIssues: Issue[];
  recommendations: string[];
  confidence: number;
  model: string;
}
