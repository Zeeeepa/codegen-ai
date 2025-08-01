import React, { useState, useEffect } from 'react';
import { validateEnvironmentConfiguration } from '../utils/preferences';

interface SetupGuideProps {
  onComplete?: () => void;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({ onComplete }) => {
  const [config, setConfig] = useState<{
    isValid: boolean;
    missingVars: string[];
    warnings: string[];
  }>({ isValid: false, missingVars: [], warnings: [] });
  
  const [backendStatus, setBackendStatus] = useState<{
    isHealthy: boolean;
    checking: boolean;
    error?: string;
  }>({ isHealthy: false, checking: true });

  useEffect(() => {
    const validation = validateEnvironmentConfiguration();
    setConfig(validation);
    
    // Check backend health
    checkBackendHealth();
  }, []);
  
  const checkBackendHealth = async () => {
    setBackendStatus({ isHealthy: false, checking: true });
    
    try {
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        timeout: 5000
      } as any);
      
      if (response.ok) {
        await response.json(); // Health check response
        setBackendStatus({ isHealthy: true, checking: false });
      } else {
        setBackendStatus({ 
          isHealthy: false, 
          checking: false, 
          error: `Server responded with ${response.status}` 
        });
      }
    } catch (error) {
      setBackendStatus({ 
        isHealthy: false, 
        checking: false, 
        error: 'Cannot connect to backend server' 
      });
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (config.isValid) {
    return null; // Don't show setup guide if everything is configured
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '2rem auto',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>
        🔧 Setup Required
      </h2>
      
      <p style={{ marginBottom: '1.5rem', color: '#6c757d' }}>
        Your CodegenApp needs to be configured before it can load data.
      </p>

      {config.missingVars.length > 0 && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ color: '#721c24', marginBottom: '0.5rem' }}>
            ❌ Missing Required Configuration:
          </h4>
          <ul style={{ color: '#721c24', marginBottom: '0' }}>
            {config.missingVars.map(varName => (
              <li key={varName}>
                <code>{varName}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {config.warnings.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ color: '#856404', marginBottom: '0.5rem' }}>
            ⚠️ Warnings:
          </h4>
          <ul style={{ color: '#856404', marginBottom: '0' }}>
            {config.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Backend Server Status */}
      <div style={{
        backgroundColor: backendStatus.isHealthy ? '#d4edda' : '#f8d7da',
        border: `1px solid ${backendStatus.isHealthy ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h4 style={{ 
          color: backendStatus.isHealthy ? '#155724' : '#721c24', 
          marginBottom: '0.5rem' 
        }}>
          {backendStatus.checking ? '🔄' : backendStatus.isHealthy ? '✅' : '❌'} Backend Server Status
        </h4>
        <p style={{ 
          color: backendStatus.isHealthy ? '#155724' : '#721c24', 
          marginBottom: '0.5rem' 
        }}>
          {backendStatus.checking 
            ? 'Checking backend server...'
            : backendStatus.isHealthy 
              ? 'Backend server is running on port 8001 ✅'
              : `Backend server is not responding: ${backendStatus.error}`
          }
        </p>
        {!backendStatus.isHealthy && !backendStatus.checking && (
          <div style={{ fontSize: '0.9em', color: '#721c24' }}>
            <strong>To fix:</strong> Run <code style={{ 
              backgroundColor: '#f8d7da', 
              padding: '0.2rem 0.4rem', 
              borderRadius: '3px' 
            }}>npm run dev</code> to start both frontend and backend servers.
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <h4 style={{ color: '#0c5460', marginBottom: '1rem' }}>
          🚀 Quick Setup Steps:
        </h4>
        
        <ol style={{ color: '#0c5460', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Get your API token:</strong>
            <br />
            Visit <a href="https://app.codegen.com/settings" target="_blank" rel="noopener noreferrer" 
                     style={{ color: '#007bff' }}>
              https://app.codegen.com/settings
            </a>
          </li>
          
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Update your .env file:</strong>
            <br />
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '3px',
              fontSize: '0.9em'
            }}>
              REACT_APP_API_TOKEN=your_actual_token_here
            </code>
          </li>
          
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Restart the application:</strong>
            <br />
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '3px',
              fontSize: '0.9em'
            }}>
              npm run dev
            </code>
          </li>
        </ol>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => {
            checkBackendHealth();
            const validation = validateEnvironmentConfiguration();
            setConfig(validation);
          }}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            marginRight: '1rem'
          }}
        >
          🔍 Check Again
        </button>
        
        <button
          onClick={handleRefresh}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            marginRight: '1rem'
          }}
        >
          🔄 Refresh Page
        </button>
        
        <a
          href="https://github.com/Zeeeepa/codegenApp/blob/main/SETUP.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        >
          📖 Full Setup Guide
        </a>
      </div>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#e2e3e5',
        borderRadius: '4px',
        fontSize: '0.9em',
        color: '#495057'
      }}>
        <strong>💡 Pro Tip:</strong> Make sure both your frontend (port 8000) and backend (port 3001) servers are running. 
        You can test the backend at: <a href="http://localhost:3001/health" target="_blank" rel="noopener noreferrer">
          http://localhost:3001/health
        </a>
      </div>
    </div>
  );
};
