/**
 * Test suite generator for web evaluation
 * Creates structured test cases based on URL analysis and AI-powered scouting
 */

import { GoogleGenAI } from "@google/genai";
import type { TestCase, TestSuite, TestSuiteConfig } from '../../types/web-eval';

export class TestSuiteGenerator {
  private geminiApiKey: string;
  private ai: GoogleGenAI;

  constructor(geminiApiKey: string) {
    this.geminiApiKey = geminiApiKey;
    this.ai = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  async generateTestSuite(deploymentUrl: string): Promise<TestSuite> {
    console.log(`🔍 Generating test suite for: ${deploymentUrl}`);

    // First, scout the page to identify interactive elements
    const scoutedElements = await this.scoutPage(deploymentUrl);
    
    // Generate specific test cases based on scouted elements
    const testCases = await this.generateTestCases(deploymentUrl, scoutedElements);

    const config: TestSuiteConfig = {
      timeout: 30000,
      retries: 2,
      headless: true,
      viewport: {
        width: 1280,
        height: 720
      },
      waitForNetworkIdle: true,
      captureScreenshots: true
    };

    return {
      id: `suite-${Date.now()}`,
      name: `Web Evaluation Suite for ${new URL(deploymentUrl).hostname}`,
      description: `Comprehensive UI/UX testing suite for ${deploymentUrl}`,
      testCases,
      config
    };
  }

  private async scoutPage(url: string): Promise<string[]> {
    try {
      console.log(`🕵️ Scouting page elements for: ${url}`);

      const scoutPrompt = `
You are a QA engineer analyzing a web application at ${url}. 

Based on typical web application patterns, identify the most likely interactive elements that would be present on this page. Consider:

1. Navigation elements (header menu, sidebar, breadcrumbs)
2. Authentication elements (login, signup, logout buttons)
3. Form elements (contact forms, search bars, input fields)
4. Content interaction (buttons, links, dropdowns, modals)
5. Footer elements (links, social media, contact info)

Provide a comprehensive list of interactive elements that a QA tester should verify, formatted as a JSON array of strings describing each element:

Example format:
[
  "Header navigation menu with main sections",
  "Login/Sign up buttons in top right",
  "Main call-to-action button on homepage",
  "Search functionality in header",
  "Contact form with email and message fields",
  "Footer links for privacy policy and terms",
  "Social media links in footer"
]

Focus on elements that are critical for user experience and functionality.
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: scoutPrompt
      });

      // Parse the response to extract the JSON array
      const responseText = response.response.text();
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        try {
          const elements = JSON.parse(jsonMatch[0]);
          console.log(`✅ Identified ${elements.length} interactive elements`);
          return elements;
        } catch (parseError) {
          console.warn('Failed to parse AI response, using fallback elements');
        }
      }

      // Fallback elements if AI parsing fails
      return this.getFallbackElements(url);

    } catch (error) {
      console.error('Error scouting page:', error);
      return this.getFallbackElements(url);
    }
  }

  private getFallbackElements(url: string): string[] {
    const hostname = new URL(url).hostname;
    return [
      `Header navigation menu on ${hostname}`,
      `Main content area buttons and links`,
      `Footer navigation and contact links`,
      `Search functionality if present`,
      `Login/authentication elements`,
      `Contact or signup forms`,
      `Mobile menu toggle button`,
      `Social media links and external references`
    ];
  }

  private async generateTestCases(url: string, scoutedElements: string[]): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // Generate test cases for each scouted element
    for (let i = 0; i < scoutedElements.length; i++) {
      const element = scoutedElements[i];
      const testCase = await this.createTestCaseForElement(url, element, i);
      if (testCase) {
        testCases.push(testCase);
      }
    }

    // Add some standard test cases that should always be included
    testCases.push(...this.getStandardTestCases(url));

    return testCases;
  }

  private async createTestCaseForElement(url: string, elementDescription: string, index: number): Promise<TestCase | null> {
    try {
      const testCasePrompt = `
Create a specific test case for this web element: "${elementDescription}" on ${url}

Generate a test case with these details:
1. A specific CSS selector or element identifier (be realistic about common selectors)
2. The appropriate test action (click, type, check, navigate, hover, scroll)
3. What the expected result should be
4. Appropriate category and priority

Format as JSON:
{
  "name": "Test case name",
  "description": "What this test verifies",
  "category": "ui|functionality|performance|accessibility|navigation",
  "priority": "high|medium|low",
  "selector": "CSS selector or element identifier",
  "action": "click|type|check|navigate|hover|scroll",
  "expectedResult": "What should happen when the test passes"
}

Make the test case specific and actionable. Use realistic selectors like:
- ".login-button", "#signin", "[data-testid='login']" for login elements
- ".nav-menu", ".header-nav", ".main-navigation" for navigation
- ".contact-form", "#contact-form", ".form-submit" for forms
- ".footer-links", ".social-links", ".footer-nav" for footer elements
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: testCasePrompt
      });

      const responseText = response.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

      if (jsonMatch) {
        try {
          const testCaseData = JSON.parse(jsonMatch[0]);
          
          return {
            id: `test-${index + 1}`,
            name: testCaseData.name || `Test ${elementDescription}`,
            description: testCaseData.description || `Verify ${elementDescription} functionality`,
            category: testCaseData.category || 'functionality',
            priority: testCaseData.priority || 'medium',
            selector: testCaseData.selector || `.element-${index}`,
            action: testCaseData.action || 'check',
            expectedResult: testCaseData.expectedResult || 'Element should be present and functional',
            timeout: 10000
          };
        } catch (parseError) {
          console.warn(`Failed to parse test case for element: ${elementDescription}`);
        }
      }

      // Fallback test case if AI generation fails
      return this.createFallbackTestCase(elementDescription, index);

    } catch (error) {
      console.error(`Error generating test case for element: ${elementDescription}`, error);
      return this.createFallbackTestCase(elementDescription, index);
    }
  }

  private createFallbackTestCase(elementDescription: string, index: number): TestCase {
    // Determine action and selector based on element description
    let action: TestCase['action'] = 'check';
    let selector = `.element-${index}`;
    let category: TestCase['category'] = 'functionality';
    let priority: TestCase['priority'] = 'medium';

    if (elementDescription.toLowerCase().includes('login') || elementDescription.toLowerCase().includes('signin')) {
      action = 'click';
      selector = '.login-button, #login, [data-testid="login"]';
      category = 'functionality';
      priority = 'high';
    } else if (elementDescription.toLowerCase().includes('form')) {
      action = 'type';
      selector = '.form-input, input[type="text"], input[type="email"]';
      category = 'functionality';
      priority = 'high';
    } else if (elementDescription.toLowerCase().includes('nav') || elementDescription.toLowerCase().includes('menu')) {
      action = 'click';
      selector = '.nav-menu, .navigation, .header-nav';
      category = 'navigation';
      priority = 'high';
    } else if (elementDescription.toLowerCase().includes('button')) {
      action = 'click';
      selector = 'button, .btn, .button';
      category = 'functionality';
      priority = 'medium';
    }

    return {
      id: `test-${index + 1}`,
      name: `Test ${elementDescription}`,
      description: `Verify that ${elementDescription} works correctly`,
      category,
      priority,
      selector,
      action,
      expectedResult: `${elementDescription} should be functional and responsive`,
      timeout: 10000
    };
  }

  private getStandardTestCases(url: string): TestCase[] {
    return [
      {
        id: 'std-page-load',
        name: 'Page Load Test',
        description: 'Verify that the page loads successfully without errors',
        category: 'performance',
        priority: 'high',
        action: 'navigate',
        expectedResult: 'Page should load within reasonable time without 404 or server errors',
        timeout: 15000
      },
      {
        id: 'std-title-check',
        name: 'Page Title Check',
        description: 'Verify that the page has a proper title',
        category: 'ui',
        priority: 'medium',
        selector: 'title',
        action: 'check',
        expectedResult: 'Page should have a non-empty title tag',
        timeout: 5000
      },
      {
        id: 'std-responsive-check',
        name: 'Basic Responsive Check',
        description: 'Verify that the page is responsive and displays correctly',
        category: 'ui',
        priority: 'medium',
        selector: 'body',
        action: 'check',
        expectedResult: 'Page should display properly without horizontal scrollbars',
        timeout: 5000
      },
      {
        id: 'std-console-errors',
        name: 'Console Error Check',
        description: 'Verify that there are no critical JavaScript errors',
        category: 'functionality',
        priority: 'high',
        action: 'check',
        expectedResult: 'No critical JavaScript errors should be present in console',
        timeout: 5000
      }
    ];
  }
}
