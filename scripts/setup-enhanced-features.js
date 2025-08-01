#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🚀 Setting up Codegen AI Project Orchestrator Environment\n');
  
  console.log('📋 You need to provide the following API tokens:');
  console.log('1. Codegen API Token (from https://app.codegen.com)');
  console.log('2. GitHub Personal Access Token (from https://github.com/settings/tokens)\n');
  
  console.log('⚠️  IMPORTANT: Make sure your tokens have the necessary permissions:');
  console.log('   - Codegen API Token: Should have access to your organization');
  console.log('   - GitHub Token: Should have repo, workflow, and admin:org permissions\n');
  
  const codegenToken = await question('Enter your Codegen API Token: ');
  const githubToken = await question('Enter your GitHub Personal Access Token: ');
  
  const envContent = `# Codegen API Configuration
VITE_CODEGEN_API_TOKEN=${codegenToken}
VITE_CODEGEN_ORG_ID=323

# GitHub Configuration
VITE_GITHUB_TOKEN=${githubToken}

# Cloudflare Webhook Configuration
VITE_CLOUDFLARE_WEBHOOK_URL=https://webhook-gateway.pixeliumperfecto.workers.dev
`;

  const envPath = path.join(__dirname, '..', '.env.local');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment variables configured successfully!');
    console.log(`📁 File created: ${envPath}`);
    console.log('\n🔄 Please restart your development server to load the new environment variables:');
    console.log('   npm run dev');
  } catch (error) {
    console.error('\n❌ Error creating .env.local file:', error.message);
  }
  
  rl.close();
}

setupEnvironment().catch(console.error);