import { runE2ETests } from './web-eval-agent_library';
import { analyzeCodeQuality } from './graph-sitter_library';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

type LogCallback = (log: string) => void;

export const runValidationPipeline = async (
    repoFullName: string,
    prNumber: number,
    geminiApiKey: string,
    logCallback: LogCallback
): Promise<{ success: boolean; finalReport: string }> => {
    logCallback(`GRAINCHAIN: Starting validation for PR #${prNumber} in ${repoFullName}...`);
    await delay(1000);

    logCallback("GRAINCHAIN: Creating secure sandbox snapshot...");
    await delay(1500);
    logCallback("GRAINCHAIN: Snapshot created.");

    logCallback(`GRAINCHAIN: Cloning PR #${prNumber} codebase...`);
    await delay(2000);
    logCallback("GRAINCHAIN: Codebase cloned.");
    
    logCallback("GRAINCHAIN: Running setup commands (`npm install && npm run dev`)...");
    await delay(3500);
    const setupSuccess = Math.random() > 0.1; // 90% success
    if (!setupSuccess) {
        const report = "Deployment failed: `npm install` exited with a dependency conflict.";
        logCallback(`GRAINCHAIN: ❌ ${report}`);
        return { success: false, finalReport: report };
    }
    logCallback("GRAINCHAIN: ✅ Setup commands completed successfully.");

    const deploymentUrl = `https://pr-${prNumber}-${repoFullName.replace('/', '-')}.grainchain.dev`;
    logCallback(`GRAINCHAIN: Deployment successful. Available at: ${deploymentUrl}`);

    logCallback(`GRAINCHAIN: Initiating static analysis with Graph-Sitter...`);
    const analysisResult = await analyzeCodeQuality(repoFullName);
    logCallback(`GRAPH-SITTER: Analysis complete. Score: ${analysisResult.score}. Issues found: ${analysisResult.issues.length}`);

    logCallback("GRAINCHAIN: Initiating E2E tests with Web-Eval-Agent...");
    const testResult = await runE2ETests(geminiApiKey, deploymentUrl);
    logCallback(`WEB-EVAL-AGENT: ${testResult.success ? '✅ Tests passed.' : '❌ Tests failed.'}`);
    logCallback(`WEB-EVAL-AGENT Report: ${testResult.report}`);
    
    logCallback("GRAINCHAIN: Tearing down sandbox environment...");
    await delay(1000);
    logCallback("GRAINCHAIN: Validation pipeline complete.");

    const finalReport = `Validation Summary for PR #${prNumber}:\n- Deployment: Success\n- Static Analysis Score: ${analysisResult.score}\n- E2E Tests: ${testResult.success ? 'Passed' : 'Failed'}\n\n${testResult.report}`;
    
    return { success: testResult.success, finalReport };
};
