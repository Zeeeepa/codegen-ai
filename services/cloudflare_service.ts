const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const verifyCloudflareToken = async (apiKey: string, accountId: string): Promise<boolean> => {
    console.log("Verifying Cloudflare token (mocked)...");
    await delay(500);
    return !!apiKey && !!accountId;
};

// Enhanced Cloudflare worker validation
export const validateCloudflareWorker = async (workerUrl: string): Promise<{
    isValid: boolean;
    error?: string;
    response?: any;
}> => {
    try {
        // Test the worker endpoint
        const response = await fetch(`${workerUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Cloudflare Worker validation successful:', data);
            return { isValid: true, response: data };
        } else {
            throw new Error(`Worker responded with status ${response.status}`);
        }
    } catch (error) {
        console.error('Cloudflare Worker validation failed:', error);
        return { 
            isValid: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
};
