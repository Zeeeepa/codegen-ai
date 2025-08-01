/**
 * AI-powered test result analysis using Gemini
 * Provides intelligent analysis of test results and failure identification
 */

import { GoogleGenAI } from "@google/genai";
import type { TestResult, AIAnalysisResult, Issue, SeverityBreakdown } from '../../types/web-eval';

export class GeminiAnalyzer {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeTestResults(
    deploymentUrl: string,
    testResults: TestResult[]
  ): Promise<AIAnalysisResult> {
    console.log(`🤖 Analyzing test results for: ${deploymentUrl}`);

    try {
      const analysisPrompt = this.buildAnalysisPrompt(deploymentUrl, testResults);
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: analysisPrompt
      });

      const responseText = response.response.text();
      return this.parseAnalysisResponse(responseText, testResults);

    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.createFallbackAnalysis(testResults);
    }
  }

  async generateSeverityBreakdown(testResults: TestResult[]): Promise<SeverityBreakdown> {
    const failedResults = testResults.filter(result => result.status === 'failed' || result.status === 'error');
    
    if (failedResults.length === 0) {
      return {
        high_severity: [],
        medium_severity: [],
        low_severity: []
      };
    }

    try {
      const severityPrompt = this.buildSeverityPrompt(failedResults);
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: severityPrompt
      });

      const responseText = response.response.text();
      return this.parseSeverityResponse(responseText, failedResults);

    } catch (error) {
      console.error('Error in severity analysis:', error);
      return this.createFallbackSeverityBreakdown(failedResults);
    }
  }

  private buildAnalysisPrompt(deploymentUrl: string, testResults: TestResult[]): string {
    const failedTests = testResults.filter(r => r.status === 'failed' || r.status === 'error');
    const passedTests = testResults.filter(r => r.status === 'passed');

    const testSummary = testResults.map(result => {
      return `
Test: ${result.testCaseId}
Status: ${result.status}
Expected: ${result.expectedResult}
Actual: ${result.actualResult || 'N/A'}
Error: ${result.error || 'None'}
Details: ${result.details}
Execution Time: ${result.executionTime}ms
---`;
    }).join('\n');

    return `
You are an expert QA analyst reviewing automated test results for the web application at ${deploymentUrl}.

CRITICAL INSTRUCTIONS:
1. Only identify ACTUAL functional issues, broken features, or technical problems
2. Do NOT classify subjective opinions, missing features that may be intentional, or design preferences as issues
3. Focus on issues that represent broken functionality, technical errors, accessibility violations, or performance problems
4. Provide SPECIFIC and DETAILED descriptions for each issue

Test Results Summary:
- Total Tests: ${testResults.length}
- Passed: ${passedTests.length}
- Failed: ${failedTests.length}
- Success Rate: ${((passedTests.length / testResults.length) * 100).toFixed(1)}%

Detailed Test Results:
${testSummary}

Based on these test results, provide:

1. Overall Assessment: A brief summary of the application's quality and functionality
2. Identified Issues: List only real functional problems with specific details
3. Recommendations: Actionable steps to fix the identified issues
4. Confidence Level: How confident you are in this analysis (0-100)

For each issue you identify, provide:
- The exact test case that failed
- The specific element or functionality that was tested
- The exact action that was performed
- What was expected vs what actually happened
- Why this represents a real functional problem

Format your response as JSON:
{
  "overallAssessment": "Brief summary of application quality",
  "identifiedIssues": [
    {
      "category": "functionality|ui|performance|accessibility|navigation",
      "description": "Specific detailed description with exact steps and results",
      "testCase": "test case ID that failed",
      "element": "specific element that was tested",
      "action": "action that was performed",
      "expectedResult": "what was expected",
      "actualResult": "what actually happened"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "confidence": 85
}

Only include real issues found during testing. Be specific and actionable in your descriptions.
`;
  }

  private buildSeverityPrompt(failedResults: TestResult[]): string {
    const failureDetails = failedResults.map(result => {
      return `
Test Case: ${result.testCaseId}
Expected: ${result.expectedResult}
Actual: ${result.actualResult || 'N/A'}
Error: ${result.error || 'None'}
Details: ${result.details}
---`;
    }).join('\n');

    return `
Analyze these test failures and classify them by severity. Only classify actual functional issues, not subjective preferences.

Failed Test Details:
${failureDetails}

Classify each real issue by severity:

HIGH SEVERITY: Critical functionality broken, security issues, accessibility violations, or major user experience blockers
MEDIUM SEVERITY: Important features not working correctly, performance issues, or usability problems
LOW SEVERITY: Minor UI inconsistencies, non-critical functionality issues, or cosmetic problems

Format as JSON:
{
  "high_severity": [
    {
      "category": "category_name",
      "description": "specific detailed description with exact steps and results"
    }
  ],
  "medium_severity": [
    {
      "category": "category_name", 
      "description": "specific detailed description with exact steps and results"
    }
  ],
  "low_severity": [
    {
      "category": "category_name",
      "description": "specific detailed description with exact steps and results"
    }
  ]
}

Only include real functional issues. Provide clear, specific descriptions.
`;
  }

  private parseAnalysisResponse(responseText: string, testResults: TestResult[]): AIAnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        
        return {
          overallAssessment: analysisData.overallAssessment || 'Analysis completed',
          identifiedIssues: this.parseIssues(analysisData.identifiedIssues || []),
          recommendations: analysisData.recommendations || [],
          confidence: analysisData.confidence || 75,
          model: 'gemini-2.0-flash'
        };
      }
    } catch (error) {
      console.error('Error parsing AI analysis response:', error);
    }

    return this.createFallbackAnalysis(testResults);
  }

  private parseSeverityResponse(responseText: string, failedResults: TestResult[]): SeverityBreakdown {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const severityData = JSON.parse(jsonMatch[0]);
        
        return {
          high_severity: this.parseIssues(severityData.high_severity || []),
          medium_severity: this.parseIssues(severityData.medium_severity || []),
          low_severity: this.parseIssues(severityData.low_severity || [])
        };
      }
    } catch (error) {
      console.error('Error parsing severity response:', error);
    }

    return this.createFallbackSeverityBreakdown(failedResults);
  }

  private parseIssues(issuesData: any[]): Issue[] {
    return issuesData.map(issue => ({
      category: issue.category || 'general',
      description: issue.description || 'Issue detected during testing',
      testCase: issue.testCase,
      element: issue.element,
      action: issue.action,
      expectedResult: issue.expectedResult,
      actualResult: issue.actualResult
    }));
  }

  private createFallbackAnalysis(testResults: TestResult[]): AIAnalysisResult {
    const failedTests = testResults.filter(r => r.status === 'failed' || r.status === 'error');
    const passedTests = testResults.filter(r => r.status === 'passed');
    
    const issues: Issue[] = failedTests.map(result => ({
      category: 'functionality',
      description: `Test case ${result.testCaseId} failed: ${result.error || result.details}`,
      testCase: result.testCaseId,
      expectedResult: result.expectedResult,
      actualResult: result.actualResult
    }));

    let assessment = 'All tests passed successfully';
    if (failedTests.length > 0) {
      const successRate = (passedTests.length / testResults.length) * 100;
      assessment = `${failedTests.length} test(s) failed out of ${testResults.length} total tests (${successRate.toFixed(1)}% success rate)`;
    }

    return {
      overallAssessment: assessment,
      identifiedIssues: issues,
      recommendations: failedTests.length > 0 
        ? ['Review and fix the failing test cases', 'Verify element selectors and expected behaviors']
        : ['Continue monitoring application functionality'],
      confidence: 60,
      model: 'fallback-analysis'
    };
  }

  private createFallbackSeverityBreakdown(failedResults: TestResult[]): SeverityBreakdown {
    const issues: Issue[] = failedResults.map(result => ({
      category: 'functionality',
      description: `${result.testCaseId}: ${result.error || result.details}`,
      testCase: result.testCaseId,
      expectedResult: result.expectedResult,
      actualResult: result.actualResult
    }));

    // Simple severity classification based on error types
    const highSeverity = issues.filter(issue => 
      issue.description.toLowerCase().includes('error') || 
      issue.description.toLowerCase().includes('failed') ||
      issue.description.toLowerCase().includes('404')
    );

    const mediumSeverity = issues.filter(issue => 
      !highSeverity.includes(issue) && (
        issue.description.toLowerCase().includes('timeout') ||
        issue.description.toLowerCase().includes('slow')
      )
    );

    const lowSeverity = issues.filter(issue => 
      !highSeverity.includes(issue) && !mediumSeverity.includes(issue)
    );

    return {
      high_severity: highSeverity,
      medium_severity: mediumSeverity,
      low_severity: lowSeverity
    };
  }
}
