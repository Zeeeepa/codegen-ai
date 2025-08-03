# CodeGen AI Application Test

## Test Steps

1. Open the URL http://localhost:5173
2. Open settings dialog by clicking the settings button
3. Input all environment variables (replace with your actual values):
   - CODEGEN_ORG_ID: your_org_id_here
   - CODEGEN_API_TOKEN: your_codegen_api_token_here
   - GITHUB_TOKEN: your_github_token_here
   - GEMINI_API_KEY: your_gemini_api_key_here
   - CLOUDFLARE_API_KEY: your_cloudflare_api_key_here
   - CLOUDFLARE_ACCOUNT_ID: your_cloudflare_account_id_here
   - CLOUDFLARE_WORKER_NAME: webhook-gateway
   - CLOUDFLARE_WORKER_URL: https://your-worker-url.workers.dev
4. Save the settings
5. Add project "web-eval-agent" from dropdown project selection
6. Press gear icon on project's card
7. Press automation tab
8. Select all 3 checkboxes
9. Press save changes
10. Press agent run button
11. Input "Create PLAN.md in project's root"
12. Confirm selection
13. Verify that PR notification number increased by 1 on github icon on project card
14. Verify that PR validation flow started and shows logs
15. Verify that PR was merged to main branch
16. Verify that after PR was merged to main branch - user's requirements were checked against project's state to validate that requirements were fully complete
