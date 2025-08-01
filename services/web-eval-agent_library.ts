import { GoogleGenAI } from "@google/genai";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const verifyGeminiApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) {
        console.warn("Gemini API Key is missing for verification.");
        return false;
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({model: 'gemini-2.5-flash', contents: 'test'});
        return true;
    } catch (error) {
        console.error("Gemini API key verification failed:", error);
        return false;
    }
};

export const runE2ETests = async (apiKey: string, deploymentUrl: string): Promise<{success: boolean; report: string}> => {
    console.log(`WEB-EVAL: Running E2E tests on ${deploymentUrl}`);
    await delay(4000); // Simulate longer test run
    
    if (!apiKey) {
        return { success: false, report: "E2E tests failed: Gemini API key is missing." };
    }

    try {
        // Mock a Gemini call to evaluate the deployment
        // In a real scenario, we might pass screenshots or DOM snapshots
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({model: 'gemini-2.5-flash', contents: `Evaluate the UI at ${deploymentUrl}. Is the login button visible?`});
        
        // Mocked response based on a simulated pass/fail
        const success = Math.random() > 0.3; // 70% success chance
        if (success) {
            console.log("WEB-EVAL: E2E tests passed.");
            return { success: true, report: `All tests passed. Gemini check confirmed UI elements are present.` };
        } else {
            console.log("WEB-EVAL: E2E tests failed.");
            return { success: false, report: "E2E tests failed: Login button not found on the homepage." };
        }
    } catch(e) {
         return { success: false, report: `E2E tests failed with an API error: ${(e as Error).message}` };
    }
}
