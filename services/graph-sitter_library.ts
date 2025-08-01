const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const analyzeCodeQuality = async (repoFullName: string): Promise<{ score: number, issues: string[] }> => {
    console.log(`GRAPH-SITTER: Analyzing code quality for ${repoFullName}`);
    await delay(3000); // Simulate analysis time

    const score = Math.floor(Math.random() * (98 - 75 + 1) + 75); // Random score between 75 and 98
    const issues = [
        "High complexity in `src/components/ProjectCard.tsx`",
        "Potential null pointer exception in `services/api.ts`",
        "Unused variable `isSaving` in `App.tsx`"
    ];

    console.log(`GRAPH-SITTER: Analysis complete for ${repoFullName}. Score: ${score}`);
    return { score, issues: issues.slice(0, Math.floor(Math.random() * 3)) };
}
