# CodeGen AI Web Application Testing Instructions

## Overview
This document provides comprehensive CI/CD testing instructions for the CodeGen AI web application using the web-eval-agent framework. The testing process validates the complete user workflow from configuration to automated PR creation and validation.

## Prerequisites
- CodeGen AI application running on localhost (port will be determined during testing)
- web-eval-agent installed and configured
- All required API keys and tokens available

## Test Environment Setup

### Required Environment Variables
```bash
CODEGEN_ORG_ID=[REDACTED]
CODEGEN_API_TOKEN=[REDACTED]
GITHUB_TOKEN=[REDACTED]
GEMINI_API_KEY=[REDACTED]
CLOUDFLARE_API_KEY=[REDACTED]
CLOUDFLARE_ACCOUNT_ID=[REDACTED]
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.pixeliumperfecto.workers.dev
```

**Note**: Replace [REDACTED] values with actual credentials during testing. Refer to the original user request for the specific values to use.

## Comprehensive Test Scenarios

### Phase 1: Application Access and Initial Setup

#### Test 1.1: Homepage Navigation
**Objective**: Verify the application loads correctly and is accessible
**Steps**:
1. Navigate to the target URL (https://localhost:<PORT>)
2. Verify page loads without errors
3. Check for presence of main navigation elements
4. Validate responsive design on different viewport sizes
5. Capture screenshots for visual verification

**Expected Results**:
- Page loads within 5 seconds
- No JavaScript console errors
- Main UI elements are visible and properly styled
- Application is responsive across different screen sizes

#### Test 1.2: Settings Dialog Access
**Objective**: Verify settings dialog can be opened and is functional
**Steps**:
1. Locate and click the settings/configuration button
2. Verify settings dialog opens
3. Check all form fields are present and accessible
4. Validate dialog can be closed and reopened
5. Test keyboard navigation within the dialog

**Expected Results**:
- Settings dialog opens without errors
- All required input fields are present
- Dialog is properly styled and functional
- Keyboard navigation works correctly

### Phase 2: Configuration and Authentication

#### Test 2.1: Environment Variables Input
**Objective**: Validate all required environment variables can be entered and saved
**Steps**:
1. Open settings dialog
2. Input each environment variable (use actual values from user request):
   - CODEGEN_ORG_ID: [Use provided value]
   - CODEGEN_API_TOKEN: [Use provided value]
   - GITHUB_TOKEN: [Use provided value]
   - GEMINI_API_KEY: [Use provided value]
   - CLOUDFLARE_API_KEY: [Use provided value]
   - CLOUDFLARE_ACCOUNT_ID: [Use provided value]
   - CLOUDFLARE_WORKER_NAME: webhook-gateway
   - CLOUDFLARE_WORKER_URL: https://webhook-gateway.pixeliumperfecto.workers.dev
3. Save configuration
4. Verify settings are persisted after page refresh
5. Test form validation with invalid inputs

**Expected Results**:
- All fields accept input correctly
- Configuration is saved successfully
- Settings persist after page refresh
- Form validation works for invalid inputs
- Success/error messages are displayed appropriately

#### Test 2.2: API Key Validation
**Objective**: Verify API keys are validated and authentication works
**Steps**:
1. After entering all credentials, verify API connectivity
2. Check for authentication success indicators
3. Validate GitHub integration is working
4. Test Gemini API connectivity
5. Verify Cloudflare integration

**Expected Results**:
- All API keys are validated successfully
- Authentication indicators show success
- No authentication errors in console
- Integration status is clearly displayed

### Phase 3: Project Management

#### Test 3.1: Project Selection and Addition
**Objective**: Verify project can be selected and added from dropdown
**Steps**:
1. Locate project selection dropdown
2. Search for "web-eval-agent" project
3. Select the project from dropdown
4. Add project to dashboard
5. Verify project card appears on dashboard
6. Check project information is displayed correctly

**Expected Results**:
- Dropdown loads available projects
- "web-eval-agent" project is found and selectable
- Project is added successfully to dashboard
- Project card displays correct information
- No errors during project addition process

#### Test 3.2: Project Card Functionality
**Objective**: Validate project card displays correct information and controls
**Steps**:
1. Verify project card shows project name and details
2. Check for presence of gear icon (settings)
3. Verify GitHub icon and PR counter
4. Test project card responsiveness
5. Validate all interactive elements on the card

**Expected Results**:
- Project card displays complete information
- All icons and controls are visible
- Card is properly styled and responsive
- Interactive elements respond to user actions

### Phase 4: Project Configuration

#### Test 4.1: Project Settings Access
**Objective**: Verify project-specific settings can be accessed and modified
**Steps**:
1. Click the gear icon on the project card
2. Verify project settings modal opens
3. Navigate through different settings tabs
4. Check all configuration options are available
5. Test modal close and reopen functionality

**Expected Results**:
- Settings modal opens correctly
- All settings tabs are accessible
- Configuration options are properly displayed
- Modal functionality works as expected

#### Test 4.2: Automation Configuration
**Objective**: Configure automation settings for the project
**Steps**:
1. Open project settings modal
2. Navigate to "Automation" tab
3. Locate the three automation checkboxes:
   - Auto-confirm Proposed Plan
   - Auto-merge Validated PR
   - Enable Real-time Updates
4. Select all three checkboxes
5. Save changes
6. Verify settings are persisted

**Expected Results**:
- Automation tab is accessible
- All three checkboxes are present and functional
- Settings can be saved successfully
- Configuration persists after modal close/reopen

### Phase 5: Agent Run Execution

#### Test 5.1: Agent Run Initiation
**Objective**: Start an agent run with specific instructions
**Steps**:
1. Locate and click "Agent Run" button on project card
2. Verify agent run dialog opens
3. Input the instruction: "Create PLAN.md in project's root"
4. Confirm the agent run selection
5. Verify agent run starts successfully
6. Monitor initial execution logs

**Expected Results**:
- Agent run dialog opens correctly
- Instruction input field accepts text
- Agent run starts without errors
- Initial logs show execution progress
- UI updates to reflect running state

#### Test 5.2: Agent Run Progress Monitoring
**Objective**: Monitor agent run execution and progress
**Steps**:
1. Observe real-time log updates
2. Verify progress indicators are working
3. Check for any error messages or warnings
4. Monitor execution time and performance
5. Validate UI responsiveness during execution

**Expected Results**:
- Logs update in real-time
- Progress indicators show current status
- No critical errors during execution
- Reasonable execution time
- UI remains responsive

### Phase 6: GitHub Integration Validation

#### Test 6.1: PR Creation Verification
**Objective**: Verify that a Pull Request is created on GitHub
**Steps**:
1. Monitor the GitHub icon on project card
2. Verify PR notification counter increases by 1
3. Check that PR creation is logged in agent run
4. Validate PR contains the requested changes (PLAN.md)
5. Verify PR has proper title and description

**Expected Results**:
- PR counter increases from 0 to 1
- PR creation is logged in agent execution
- New PR appears on GitHub repository
- PR contains PLAN.md file in project root
- PR has descriptive title and body

#### Test 6.2: PR Validation Flow
**Objective**: Verify automated PR validation pipeline starts
**Steps**:
1. Confirm PR validation flow initiates automatically
2. Monitor validation logs in the UI
3. Check for CI/CD pipeline execution
4. Verify web-eval-agent tests are triggered
5. Monitor validation progress and results

**Expected Results**:
- Validation flow starts automatically after PR creation
- Validation logs are displayed in real-time
- CI/CD pipeline executes successfully
- Web-eval-agent tests run against the changes
- Validation results are clearly displayed

### Phase 7: Automated Merge and Validation

#### Test 7.1: PR Merge Verification
**Objective**: Verify PR is automatically merged to main branch
**Steps**:
1. Monitor PR status in GitHub
2. Verify automated merge occurs after successful validation
3. Check that changes are merged to main branch
4. Validate PLAN.md file exists in main branch
5. Confirm merge commit appears in repository history

**Expected Results**:
- PR is merged automatically after validation passes
- Changes appear in main branch
- PLAN.md file is present in project root
- Merge commit has proper message and metadata
- No merge conflicts or errors

#### Test 7.2: Requirements Validation
**Objective**: Verify requirements are validated against project state
**Steps**:
1. Monitor post-merge validation process
2. Check if requirements are fully satisfied
3. Verify PLAN.md content meets specifications
4. Validate project state matches requirements
5. Monitor for any follow-up actions needed

**Expected Results**:
- Post-merge validation executes automatically
- Requirements validation completes successfully
- PLAN.md content is appropriate and complete
- Project state matches specified requirements
- No additional actions required

### Phase 8: Continuous Validation and Follow-up

#### Test 8.1: Requirement Completeness Check
**Objective**: Verify system checks if requirements are fully complete
**Steps**:
1. Monitor automated requirement validation
2. Check if PLAN.md creation fully satisfies the request
3. Verify no additional changes are needed
4. Validate completion status is properly reported
5. Confirm workflow completion

**Expected Results**:
- Requirement validation runs automatically
- System correctly identifies requirement completion status
- Completion status is clearly reported
- Workflow concludes successfully if complete

#### Test 8.2: Follow-up Agent Run (If Needed)
**Objective**: Verify additional agent runs are created if requirements incomplete
**Steps**:
1. If requirements are not fully complete, verify new agent run is created
2. Monitor follow-up instructions and execution
3. Verify iterative improvement process
4. Check that process continues until requirements are met
5. Validate final completion and workflow termination

**Expected Results**:
- Additional agent runs are created if needed
- Follow-up instructions are appropriate and specific
- Iterative process improves project state
- Process continues until requirements are fully satisfied
- Final completion is properly detected and reported

## Performance and Quality Metrics

### Performance Benchmarks
- Page load time: < 3 seconds
- Settings dialog open time: < 1 second
- Agent run initiation: < 2 seconds
- PR creation time: < 30 seconds
- Validation pipeline completion: < 5 minutes

### Quality Indicators
- Zero JavaScript console errors
- All API calls return successful responses
- UI remains responsive throughout testing
- All user interactions work as expected
- Proper error handling and user feedback

## Error Scenarios and Edge Cases

### Test E.1: Invalid API Keys
**Steps**:
1. Enter invalid API keys in settings
2. Attempt to save configuration
3. Verify appropriate error messages
4. Test recovery with valid keys

### Test E.2: Network Connectivity Issues
**Steps**:
1. Simulate network interruption during agent run
2. Verify error handling and recovery
3. Test retry mechanisms
4. Validate user feedback during issues

### Test E.3: GitHub API Rate Limiting
**Steps**:
1. Test behavior under GitHub API rate limits
2. Verify graceful degradation
3. Check retry logic and backoff
4. Validate user notifications

## Success Criteria

### Primary Success Criteria
1. ✅ Application loads and is fully functional
2. ✅ All environment variables can be configured
3. ✅ Project can be added and configured
4. ✅ Automation settings can be enabled
5. ✅ Agent run executes successfully
6. ✅ PR is created and validated
7. ✅ PR is automatically merged
8. ✅ Requirements are validated post-merge

### Secondary Success Criteria
1. ✅ Performance meets benchmarks
2. ✅ No critical errors or warnings
3. ✅ UI/UX is intuitive and responsive
4. ✅ Error handling works correctly
5. ✅ All integrations function properly

## Reporting Requirements

### Test Execution Report
- Detailed step-by-step execution log
- Screenshots of key UI states
- Performance metrics and timing data
- Error logs and debugging information
- Success/failure status for each test phase

### Issue Documentation
- Clear description of any failures
- Steps to reproduce issues
- Expected vs actual behavior
- Severity and impact assessment
- Recommended fixes or improvements

## Post-Test Validation

### Cleanup Tasks
1. Verify test data is properly cleaned up
2. Reset application state if needed
3. Document any persistent changes
4. Archive test reports and logs

### Follow-up Actions
1. Review test results with development team
2. Create issues for any identified problems
3. Update documentation based on findings
4. Plan improvements for next testing cycle

---

**Note**: This comprehensive testing suite validates the complete end-to-end workflow of the CodeGen AI application, ensuring all components work together seamlessly in a real-world CI/CD environment.
