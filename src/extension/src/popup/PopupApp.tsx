import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import PopupLayout from './components/PopupLayout';
import UnlockPage from './pages/UnlockPage';
import HomePage from './pages/HomePage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import SettingsPage from './pages/SettingsPage';
import ConnectPage from './pages/ConnectPage';
import ApproveTxPage from './pages/ApproveTxPage';
import ApproveSignPage from './pages/ApproveSignPage';
import ConnectedDAppsPage from './pages/ConnectedDAppsPage';

// Import flow pages
import OnboardingPage from './pages/OnboardingPage';
import ImportWalletPage from './pages/ImportWalletPage';
import SetupPasswordPage from './pages/SetupPasswordPage';
import CompletePage from './pages/CompletePage';

type ImportStep = 'onboarding' | 'import' | 'password' | 'complete';

interface ImportedWallet {
  address: string;
  privateKey: string;
}

function PopupApp() {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [version, setVersion] = useState('');
  
  // Import flow state
  const [importStep, setImportStep] = useState<ImportStep>('onboarding');
  const [importedWallet, setImportedWallet] = useState<ImportedWallet | null>(null);

  useEffect(() => {
    // Check wallet state on load
    checkWalletState();
    // Get version from manifest
    const manifest = chrome.runtime.getManifest();
    setVersion(manifest.version);
  }, []);

  const checkWalletState = async () => {
    try {
      // Check if wallet exists
      const response = await chrome.runtime.sendMessage({ type: 'IS_UNLOCKED' });
      setIsUnlocked(response?.data?.unlocked ?? false);
      
      // Check if wallet is set up
      const walletData = await chrome.storage.local.get('fun_wallet_list');
      setHasWallet(!!walletData.fun_wallet_list);
    } catch (error) {
      console.error('Error checking wallet state:', error);
      setIsUnlocked(false);
      setHasWallet(false);
    }
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  // Handle import success - move to password setup
  const handleImportSuccess = (address: string, privateKey: string) => {
    setImportedWallet({ address, privateKey });
    setImportStep('password');
  };

  // Handle password setup complete
  const handlePasswordComplete = () => {
    setImportStep('complete');
  };

  // Handle start using wallet after complete
  const handleStartUsing = () => {
    setHasWallet(true);
    setIsUnlocked(true);
    // Reset import flow state
    setImportStep('onboarding');
    setImportedWallet(null);
  };

  // Loading state
  if (isUnlocked === null || hasWallet === null) {
    return (
      <PopupLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PopupLayout>
    );
  }

  // No wallet setup yet - show import flow
  if (!hasWallet) {
    return (
      <PopupLayout>
        {importStep === 'onboarding' && (
          <OnboardingPage 
            version={version} 
            onImportWallet={() => setImportStep('import')} 
          />
        )}
        {importStep === 'import' && (
          <ImportWalletPage 
            onBack={() => setImportStep('onboarding')}
            onImportSuccess={handleImportSuccess}
          />
        )}
        {importStep === 'password' && importedWallet && (
          <SetupPasswordPage 
            walletAddress={importedWallet.address}
            privateKey={importedWallet.privateKey}
            onComplete={handlePasswordComplete}
            onBack={() => setImportStep('import')}
          />
        )}
        {importStep === 'complete' && importedWallet && (
          <CompletePage 
            walletAddress={importedWallet.address}
            onStart={handleStartUsing} 
          />
        )}
      </PopupLayout>
    );
  }

  return (
    <PopupLayout>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/unlock" 
          element={
            isUnlocked 
              ? <Navigate to="/" replace /> 
              : <UnlockPage onUnlock={handleUnlock} />
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            isUnlocked 
              ? <HomePage /> 
              : <Navigate to="/unlock" replace />
          } 
        />
        <Route 
          path="/send" 
          element={
            isUnlocked 
              ? <SendPage /> 
              : <Navigate to="/unlock" replace />
          } 
        />
        <Route 
          path="/receive" 
          element={
            isUnlocked 
              ? <ReceivePage /> 
              : <Navigate to="/unlock" replace />
          } 
        />
        <Route 
          path="/settings" 
          element={
            isUnlocked 
              ? <SettingsPage /> 
              : <Navigate to="/unlock" replace />
          } 
        />
        
        {/* DApp connection routes */}
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/approve-tx" element={<ApproveTxPage />} />
        <Route path="/approve-sign" element={<ApproveSignPage />} />
        
        {/* Settings sub-routes */}
        <Route 
          path="/connected-dapps" 
          element={
            isUnlocked 
              ? <ConnectedDAppsPage /> 
              : <Navigate to="/unlock" replace />
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PopupLayout>
  );
}

export default PopupApp;
