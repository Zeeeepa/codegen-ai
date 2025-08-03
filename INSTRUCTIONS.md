# CodeGen AI Application - Complete CI/CD Testing Instructions

## Overview
This document provides comprehensive instructions for testing the CodeGen AI application using web-eval-agent to validate the complete CI/CD workflow.

## Prerequisites

### Required Environment Variables
```bash
CODEGEN_ORG_ID=your_org_id_here
CODEGEN_API_TOKEN=your_codegen_api_token_here
GITHUB_TOKEN=your_github_token_here
GEMINI_API_KEY=your_gemini_api_key_here
CLOUDFLARE_API_KEY=your_cloudflare_api_key_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://your-worker-url.workers.dev
```

### Test Environment Setup
1. **Application Server**: Running on http://localhost:5173
2. **Web-eval-agent**: Installed and configured with Gemini API
3. **GitHub Integration**: Active with proper permissions
4. **Cloudflare Workers**: Configured for webhook handling

## Comprehensive Test Scenarios

### Test 1: Application Access and Initial Setup
**Objective**: Verify application loads and basic functionality works
**Steps**:
1. Navigate to http://localhost:5173
2. Verify page loads without errors
3. Check that all UI components are visible
4. Validate responsive design on different screen sizes

**Success Criteria**:
- ✅ Application loads successfully
- ✅ No console errors
- ✅ UI elements render correctly
- ✅ Navigation works properly

### Test 2: Environment Configuration
**Objective**: Test settings dialog and environment variable input
**Steps**:
1. Open settings dialog
2. Input each environment variable (replace with your actual values):
   - CODEGEN_ORG_ID: your_org_id_here
   - CODEGEN_API_TOKEN: your_codegen_api_token_here
   - GITHUB_TOKEN: your_github_token_here
   - GEMINI_API_KEY: your_gemini_api_key_here
   - CLOUDFLARE_API_KEY: your_cloudflare_api_key_here
   - CLOUDFLARE_ACCOUNT_ID: your_cloudflare_account_id_here
   - CLOUDFLARE_WORKER_NAME: webhook-gateway
   - CLOUDFLARE_WORKER_URL: https://your-worker-url.workers.dev
3. Save configuration
4. Verify settings are persisted after page refresh
5. Test form validation with invalid inputs

**Success Criteria**:
- ✅ Settings dialog opens and closes properly
- ✅ All environment variables can be input and saved
- ✅ Settings persist across page refreshes
- ✅ Form validation works for invalid inputs
- ✅ Success message appears after saving

### Test 3: Project Management
**Objective**: Test project addition and configuration
**Steps**:
1. Add project "web-eval-agent" from dropdown project selection
2. Verify project appears in project list
3. Check project card displays correctly
4. Test project selection and deselection

**Success Criteria**:
- ✅ Project can be added from dropdown
- ✅ Project card displays with correct information
- ✅ Project selection state is maintained
- ✅ Multiple projects can be managed

### Test 4: Automation Configuration
**Objective**: Test automation settings and configuration
**Steps**:
1. Press gear icon on project's card
2. Navigate to automation tab
3. Select all 3 checkboxes:
   - Auto-create PRs
   - Auto-merge approved PRs
   - Auto-validate requirements
4. Press save changes
5. Verify settings are saved and displayed correctly

**Success Criteria**:
- ✅ Gear icon opens project settings
- ✅ Automation tab is accessible
- ✅ All automation options can be enabled
- ✅ Settings are saved successfully
- ✅ Visual feedback confirms saved state

### Test 5: Agent Execution
**Objective**: Test agent run functionality and GitHub integration
**Steps**:
1. Press agent run button
2. Input "Create PLAN.md in project's root"
3. Confirm selection
4. Monitor execution progress
5. Verify GitHub integration works

**Success Criteria**:
- ✅ Agent run dialog opens
- ✅ Instructions can be input and submitted
- ✅ Execution starts and shows progress
- ✅ GitHub API calls are successful
- ✅ Real-time status updates appear

### Test 6: GitHub Integration Validation
**Objective**: Verify GitHub PR creation and management
**Steps**:
1. Verify that PR notification number increased by 1 on github icon on project card
2. Check that PR was created in GitHub repository
3. Validate PR contains expected changes (PLAN.md file)
4. Verify PR description and metadata are correct

**Success Criteria**:
- ✅ PR notification counter updates
- ✅ PR is created in GitHub repository
- ✅ PR contains requested changes
- ✅ PR metadata is accurate
- ✅ PR is linked to correct project

### Test 7: CI/CD Pipeline Validation
**Objective**: Test automated validation and merge process
**Steps**:
1. Verify that PR validation flow started and shows logs
2. Monitor CI/CD pipeline execution
3. Check that automated tests pass
4. Validate code quality checks
5. Verify security scans complete

**Success Criteria**:
- ✅ CI/CD pipeline triggers automatically
- ✅ All automated tests pass
- ✅ Code quality checks pass
- ✅ Security scans complete successfully
- ✅ Pipeline logs are accessible

### Test 8: Automated Merge Process
**Objective**: Test automatic PR merge functionality
**Steps**:
1. Verify that PR was merged to main branch
2. Check merge commit appears in repository
3. Validate branch cleanup occurred
4. Verify deployment triggers (if applicable)

**Success Criteria**:
- ✅ PR merges automatically after validation
- ✅ Merge commit is created
- ✅ Feature branch is deleted
- ✅ Main branch is updated
- ✅ Deployment process triggers

### Test 9: Requirements Validation
**Objective**: Test post-merge requirement validation
**Steps**:
1. Verify that after PR was merged to main branch - user's requirements were checked against project's state
2. Validate that requirements were fully complete
3. Check that further subsequent agent run was created if needed
4. Verify completion status is accurate

**Success Criteria**:
- ✅ Requirements validation runs post-merge
- ✅ Project state matches requirements
- ✅ Completion status is accurate
- ✅ Additional runs trigger if needed
- ✅ Final validation report is generated

## Performance and Quality Metrics

### Response Time Benchmarks
- **Page Load**: < 2 seconds
- **Settings Save**: < 1 second
- **Agent Execution Start**: < 3 seconds
- **GitHub API Calls**: < 5 seconds
- **PR Creation**: < 10 seconds

### Quality Assurance Checks
- **Code Coverage**: > 80%
- **Security Scan**: No high/critical vulnerabilities
- **Performance Score**: > 90
- **Accessibility Score**: > 95
- **SEO Score**: > 90

## Error Scenarios and Edge Cases

### Test 10: Error Handling
**Objective**: Validate error handling and recovery
**Steps**:
1. Test with invalid API tokens
2. Test with network connectivity issues
3. Test with malformed input data
4. Test with GitHub API rate limits
5. Test with insufficient permissions

**Expected Behavior**:
- ✅ Graceful error messages displayed
- ✅ No application crashes
- ✅ Recovery mechanisms work
- ✅ User guidance provided
- ✅ Logs capture error details

### Test 11: Concurrent Operations
**Objective**: Test handling of multiple simultaneous operations
**Steps**:
1. Start multiple agent runs simultaneously
2. Test concurrent settings changes
3. Validate queue management
4. Check resource utilization

**Expected Behavior**:
- ✅ Operations queue properly
- ✅ No race conditions occur
- ✅ Resource usage remains stable
- ✅ All operations complete successfully

## Success Criteria

### Primary Success Metrics
1. **Functional Completeness**: All 16 test steps execute successfully
2. **Integration Reliability**: GitHub, Cloudflare, and Gemini APIs work correctly
3. **Automation Effectiveness**: CI/CD pipeline completes end-to-end
4. **User Experience**: Interface is intuitive and responsive
5. **Error Resilience**: Application handles errors gracefully

### Performance Benchmarks
- **Overall Test Suite**: Completes in < 10 minutes
- **Zero Critical Failures**: No blocking issues encountered
- **High Success Rate**: > 95% of test steps pass
- **Consistent Results**: Tests are repeatable and reliable

## Reporting Requirements

### Test Execution Report
The web-eval-agent must generate a comprehensive report including:

1. **Executive Summary**
   - Overall test status (PASS/FAIL)
   - Total execution time
   - Success rate percentage
   - Critical issues identified

2. **Detailed Test Results**
   - Step-by-step execution log
   - Screenshots of key interactions
   - Performance metrics for each step
   - Error details (if any)

3. **Integration Validation**
   - API response times and status codes
   - GitHub PR creation and merge confirmation
   - Cloudflare webhook delivery status
   - Gemini API usage and response quality

4. **Quality Metrics**
   - Code coverage reports
   - Security scan results
   - Performance benchmarks
   - Accessibility compliance

5. **Recommendations**
   - Areas for improvement
   - Performance optimization suggestions
   - Security enhancements
   - User experience improvements

## Post-Test Validation

### Verification Checklist
After test completion, verify:
- [ ] All environment variables are properly configured
- [ ] Application runs without errors
- [ ] GitHub integration is functional
- [ ] PR was created and merged successfully
- [ ] PLAN.md file exists in repository root
- [ ] CI/CD pipeline executed completely
- [ ] No security vulnerabilities introduced
- [ ] Performance metrics meet benchmarks
- [ ] User requirements are fully satisfied

### Cleanup Tasks
1. Remove test data and temporary files
2. Reset environment to clean state
3. Archive test reports and logs
4. Update documentation if needed
5. Notify stakeholders of results

## Troubleshooting Guide

### Common Issues and Solutions
1. **API Authentication Failures**
   - Verify API tokens are valid and not expired
   - Check token permissions and scopes
   - Validate environment variable names

2. **Network Connectivity Issues**
   - Test internet connection
   - Check firewall and proxy settings
   - Verify API endpoint availability

3. **GitHub Integration Problems**
   - Confirm repository permissions
   - Check GitHub API rate limits
   - Validate webhook configurations

4. **Performance Issues**
   - Monitor system resources
   - Check for memory leaks
   - Optimize API call patterns

This comprehensive testing framework ensures complete validation of the CodeGen AI application's CI/CD workflow and provides detailed reporting for continuous improvement.
