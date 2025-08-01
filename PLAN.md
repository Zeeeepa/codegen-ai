# CodeGen AI Orchestrator - Implementation Plan

This document outlines the features and components of the AI Project Orchestrator application.

### Core Components Checklist

- [X] **Project Dashboard & Management**
    - **Description**: A persistent, card-based dashboard for managing GitHub projects. Uses `localStorage` to save the state.
    - **Dependencies**: `React`, `hooks/useLocalStorage.ts`

- [X] **GitHub Integration (Mocked)**
    - **Description**: Fetches a list of user repositories for selection. Simulates setting a webhook on a project when it's added to the dashboard.
    - **Dependencies**: `services/api.ts`

- [X] **Agent Run Initiation & Monitoring**
    - **Description**: Users can initiate an AI agent run from a project card by providing a high-level "Target" or goal. The card displays the agent's status and a live log of its activities.
    - **Dependencies**: `ProjectCard.tsx`, `modals/AgentRunModal.tsx`, `services/api.ts`

- [X] **Interactive Agent Control Flow**
    - **Description**: The UI dynamically adapts based on the agent's response, supporting multiple interaction types:
        - **Default Response**: Provides a text area to continue the conversation with the agent.
        - **Plan Proposal**: Displays a structured plan with options to "Confirm" or "Modify".
        - **PR Creation**: Shows a notification on the card indicating a new PR has been created.
    - **Dependencies**: `ProjectCard.tsx`, `services/api.ts`

- [X] **Project-Specific Settings**
    - **Description**: A comprehensive settings modal for each project, accessible via a gear icon. Changes are saved persistently.
    - **Dependencies**: `modals/SettingsModal.tsx`, `hooks/useLocalStorage.ts`
    - **Features**:
        - **[X] Repository Rules**: A text area for providing specific instructions to the agent. Card border highlights if rules are present.
        - **[X] Planning Statement**: A customizable master prompt that is sent with every agent run.
        - **[X] Setup Commands**: Define shell commands for sandboxed environments. Includes a branch selector and a (mocked) "Run" button to test commands.
        - **[X] Secrets Management**: A secure UI to add, view, and remove environment variables for the project.
        - **[X] Automation Toggles**: Checkboxes to `Auto-confirm Proposed Plan` and `Auto-merge Validated PR`.

- [X] **Pull Request Validation Flow (Mocked)**
    - **Description**: Simulates a full CI/CD and validation pipeline. Clicking the PR notification on a card initiates a validation process. The UI shows the status (Validating, Success, Failed) and provides options to merge upon success.
    - **Dependencies**: `ProjectCard.tsx`

- [X] **Persistence**
    - **Description**: The entire dashboard state, including the list of projects and their detailed settings, is persisted in the browser's local storage.
    - **Dependencies**: `hooks/useLocalStorage.ts`

### Conceptual Backend Services

- [X] **Cloudflare Worker (`webhook-gateway`)**
    - **Description**: A publicly accessible endpoint to receive webhooks from GitHub for PR events.
    - **Status**: Conceptual; mocked by the frontend.

- [X] **Codegen SDK (Core Agent)**
    - **Description**: The primary AI engine for code generation, planning, and task execution.
    - **Status**: Conceptual; mocked by `services/api.ts`.

- [X] **Grainchain (Sandboxing)**
    - **Description**: Creates secure, isolated environments for deploying and validating pull requests.
    - **Status**: Conceptual; workflow is mocked in `ProjectCard.tsx`.

- [X] **Graph-Sitter (Code Analysis)**
    - **Description**: Provides static analysis and context to the AI agent.
    - **Status**: Conceptual.

- [X] **Web-Eval-Agent (E2E Testing)**
    - **Description**: An AI-powered agent for performing end-to-end tests on the deployed application in the sandbox.
    - **Status**: Conceptual; failure/success is mocked in `ProjectCard.tsx`.
