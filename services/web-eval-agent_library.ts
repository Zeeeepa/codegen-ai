/**
 * Enhanced Web-Eval-Agent Library
 * Provides comprehensive web application testing using browser automation and AI analysis
 */

import { GoogleGenAI } from "@google/genai";
import { BrowserAutomation } from './test-execution/browser-automation';
import { TestSuiteGenerator } from './test-execution/test-suite-generator';
import { GeminiAnalyzer } from './ai-evaluation/gemini-analyzer';
import type { WebEvalResult, TestResult, BrowserConfig, TestSummary } from '../types/web-eval';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const verifyGeminiApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) {
        console.warn("Gemini API Key is missing for verification.");
        return false;
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({model: 'gemini-2.0-flash', contents: 'test'});
        return true;
    } catch (error) {
        console.error("Gemini API key verification failed:", error);
        return false;
    }
};

export const runE2ETests = async (apiKey: string, deploymentUrl: string): Promise<{success: boolean; report: string}> => {
    console.log(`🚀 WEB-EVAL: Starting comprehensive E2E tests on ${deploymentUrl}`);
    const startTime = Date.now();
    
    if (!apiKey) {
        return { 
            success: false, 
            report: "❌ E2E tests failed: Gemini API key is missing. Please configure your API key in settings." 
        };
    }

    try {
        // Run the enhanced web evaluation
        const result = await runEnhancedWebEvaluation(apiKey, deploymentUrl);
        
        // Convert to legacy format for backward compatibility
        const legacyReport = generateLegacyReport(result);
        
        console.log(`✅ WEB-EVAL: Tests completed in ${result.duration}ms`);
        
        return {
            success: result.success,
            report: legacyReport
        };
        
    } catch (error) {
        console.error("WEB-EVAL: Test execution failed:", error);
        return { 
            success: false, 
            report: `❌ E2E tests failed with error: ${(error as Error).message}. Please check your deployment URL and try again.` 
        };
    }
};

/**
 * Enhanced web evaluation using structured testing and AI analysis
 */
export const runEnhancedWebEvaluation = async (
    apiKey: string, 
    deploymentUrl: string
): Promise<WebEvalResult> => {
    const startTime = Date.now();
    const testId = `test-${Date.now()}`;
    
    console.log(`🔬 Starting enhanced web evaluation for: ${deploymentUrl}`);

    try {
        // Step 1: Generate test suite using AI
        console.log('📋 Generating test suite...');
        const testSuiteGenerator = new TestSuiteGenerator(apiKey);
        const testSuite = await testSuiteGenerator.generateTestSuite(deploymentUrl);
        
        console.log(`✅ Generated ${testSuite.testCases.length} test cases`);

        // Step 2: Configure browser automation
        const browserConfig: BrowserConfig = {
            headless: true,
            viewport: testSuite.config.viewport,
            timeout: testSuite.config.timeout,
            waitForNetworkIdle: testSuite.config.waitForNetworkIdle,
            args: [
                '--disable-gpu',
                '--no-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        };

        // Step 3: Execute tests using browser automation
        console.log('🤖 Executing browser automation tests...');
        const browserAutomation = new BrowserAutomation(browserConfig);
        await browserAutomation.launch();
        await browserAutomation.navigate(deploymentUrl);

        const testResults: TestResult[] = [];
        
        // Execute each test case
        for (const testCase of testSuite.testCases) {
            try {
                const result = await browserAutomation.executeTestCase(testCase);
                testResults.push(result);
                
                // Log progress
                const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
                console.log(`${status} ${testCase.name}: ${result.status} (${result.executionTime}ms)`);
                
            } catch (error) {
                console.error(`Error executing test case ${testCase.id}:`, error);
                testResults.push({
                    testCaseId: testCase.id,
                    status: 'error',
                    executionTime: 0,
                    details: `Test execution failed: ${(error as Error).message}`,
                    expectedResult: testCase.expectedResult,
                    error: (error as Error).message
                });
            }
        }

        await browserAutomation.close();

        // Step 4: Analyze results using AI
        console.log('🧠 Analyzing test results with AI...');
        const geminiAnalyzer = new GeminiAnalyzer(apiKey);
        const aiAnalysis = await geminiAnalyzer.analyzeTestResults(deploymentUrl, testResults);
        const severityBreakdown = await geminiAnalyzer.generateSeverityBreakdown(testResults);

        // Step 5: Generate summary
        const summary = generateTestSummary(testResults, severityBreakdown);
        
        const duration = Date.now() - startTime;
        
        const result: WebEvalResult = {
            success: summary.overallStatus === 'passed',
            report: generateDetailedReport(deploymentUrl, summary, aiAnalysis, testResults),
            testId,
            summary,
            results: testResults,
            duration,
            timestamp: Date.now()
        };

        console.log(`🎯 Web evaluation completed: ${summary.overallStatus} (${summary.passed}/${summary.total} tests passed)`);
        
        return result;

    } catch (error) {
        console.error('Enhanced web evaluation failed:', error);
        
        const duration = Date.now() - startTime;
        
        // Return error result
        return {
            success: false,
            report: `Web evaluation failed: ${(error as Error).message}`,
            testId,
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                errors: 1,
                overallStatus: 'failed',
                statusEmoji: '❌',
                statusDescription: 'Web evaluation failed due to system error',
                severityBreakdown: {
                    high_severity: [{
                        category: 'system',
                        description: `Web evaluation system error: ${(error as Error).message}`
                    }],
                    medium_severity: [],
                    low_severity: []
                }
            },
            results: [],
            duration,
            timestamp: Date.now()
        };
    }
};

function generateTestSummary(testResults: TestResult[], severityBreakdown: any): TestSummary {
    const total = testResults.length;
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const skipped = testResults.filter(r => r.status === 'skipped').length;
    const errors = testResults.filter(r => r.status === 'error').length;

    // Determine overall status based on severity
    let overallStatus: 'passed' | 'failed' | 'warning' = 'passed';
    let statusEmoji = '✅';
    let statusDescription = 'All tests passed successfully';

    const highSeverityCount = severityBreakdown.high_severity?.length || 0;
    const mediumSeverityCount = severityBreakdown.medium_severity?.length || 0;
    const lowSeverityCount = severityBreakdown.low_severity?.length || 0;

    if (highSeverityCount > 0) {
        overallStatus = 'failed';
        statusEmoji = '🔴';
        statusDescription = `${highSeverityCount} critical issue(s) found that need immediate attention`;
    } else if (mediumSeverityCount > 0) {
        overallStatus = 'warning';
        statusEmoji = '🟠';
        statusDescription = `${mediumSeverityCount} moderate issue(s) found that should be addressed`;
    } else if (lowSeverityCount > 0) {
        overallStatus = 'warning';
        statusEmoji = '🟡';
        statusDescription = `${lowSeverityCount} minor issue(s) found that could be improved`;
    } else if (failed > 0 || errors > 0) {
        overallStatus = 'failed';
        statusEmoji = '❌';
        statusDescription = `${failed + errors} test(s) failed - review required`;
    }

    return {
        total,
        passed,
        failed,
        skipped,
        errors,
        overallStatus,
        statusEmoji,
        statusDescription,
        severityBreakdown
    };
}

function generateDetailedReport(
    deploymentUrl: string, 
    summary: TestSummary, 
    aiAnalysis: any, 
    testResults: TestResult[]
): string {
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0';
    
    let report = `🔍 Web Evaluation Report for ${deploymentUrl}\n\n`;
    
    // Overall Status
    report += `${summary.statusEmoji} **Overall Status**: ${summary.overallStatus.toUpperCase()}\n`;
    report += `📊 **Success Rate**: ${successRate}% (${summary.passed}/${summary.total} tests passed)\n`;
    report += `📝 **Summary**: ${summary.statusDescription}\n\n`;

    // Test Results Breakdown
    report += `📈 **Test Results Breakdown**:\n`;
    report += `  ✅ Passed: ${summary.passed}\n`;
    report += `  ❌ Failed: ${summary.failed}\n`;
    report += `  ⚠️  Errors: ${summary.errors}\n`;
    report += `  ⏭️  Skipped: ${summary.skipped}\n\n`;

    // Severity Analysis
    const { high_severity, medium_severity, low_severity } = summary.severityBreakdown;
    
    if (high_severity.length > 0) {
        report += `🔴 **Critical Issues (${high_severity.length})**:\n`;
        high_severity.forEach((issue, index) => {
            report += `  ${index + 1}. ${issue.description}\n`;
        });
        report += '\n';
    }

    if (medium_severity.length > 0) {
        report += `🟠 **Moderate Issues (${medium_severity.length})**:\n`;
        medium_severity.forEach((issue, index) => {
            report += `  ${index + 1}. ${issue.description}\n`;
        });
        report += '\n';
    }

    if (low_severity.length > 0) {
        report += `🟡 **Minor Issues (${low_severity.length})**:\n`;
        low_severity.forEach((issue, index) => {
            report += `  ${index + 1}. ${issue.description}\n`;
        });
        report += '\n';
    }

    // AI Analysis
    if (aiAnalysis && aiAnalysis.overallAssessment) {
        report += `🤖 **AI Analysis**: ${aiAnalysis.overallAssessment}\n\n`;
        
        if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
            report += `💡 **Recommendations**:\n`;
            aiAnalysis.recommendations.forEach((rec: string, index: number) => {
                report += `  ${index + 1}. ${rec}\n`;
            });
            report += '\n';
        }
    }

    // Failed Test Details
    const failedTests = testResults.filter(r => r.status === 'failed' || r.status === 'error');
    if (failedTests.length > 0) {
        report += `🔍 **Failed Test Details**:\n`;
        failedTests.forEach((test, index) => {
            report += `  ${index + 1}. **${test.testCaseId}**\n`;
            report += `     Expected: ${test.expectedResult}\n`;
            report += `     Actual: ${test.actualResult || 'N/A'}\n`;
            report += `     Error: ${test.error || 'None'}\n`;
            report += `     Duration: ${test.executionTime}ms\n\n`;
        });
    }

    return report;
}

function generateLegacyReport(result: WebEvalResult): string {
    // Generate a simplified report for backward compatibility
    const { summary } = result;
    
    if (result.success) {
        return `✅ All tests passed successfully. ${summary.statusDescription} (${summary.passed}/${summary.total} tests passed)`;
    } else {
        const issueCount = summary.severityBreakdown.high_severity.length + 
                          summary.severityBreakdown.medium_severity.length + 
                          summary.severityBreakdown.low_severity.length;
        
        return `❌ Tests failed: ${summary.statusDescription}. Found ${issueCount} issue(s) requiring attention. Success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`;
    }
}
