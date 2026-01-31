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
import BackupSeedSettingsPage from './pages/BackupSeedSettingsPage';

// Onboarding flow pages
import OnboardingPage from './pages/OnboardingPage';
import ImportWalletPage from './pages/ImportWalletPage';
import SetupPasswordPage from './pages/SetupPasswordPage';
import CompletePage from './pages/CompletePage';

// Create wallet flow pages
import CreateWalletPage from './pages/CreateWalletPage';
import BackupSeedPage from './pages/BackupSeedPage';
import SeedQuizPage from './pages/SeedQuizPage';

type OnboardingStep = 
  | 'onboarding'  // Welcome screen
  | 'import'      // Import existing wallet
  | 'create'      // Create new - education
  | 'backup'      // Show seed phrase
  | 'quiz'        // Verify seed
  | 'password'    // Setup password
  | 'complete';   // Done

interface ImportedWallet {
  address: string;
  privateKey: string;
}

interface CreatedWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

function PopupApp() {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [version, setVersion] = useState('');
  
  // Onboarding flow state
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('onboarding');
  const [importedWallet, setImportedWallet] = useState<ImportedWallet | null>(null);
  const [createdWallet, setCreatedWallet] = useState<CreatedWallet | null>(null);

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

  // Import flow handlers
  const handleImportSuccess = (address: string, privateKey: string) => {
    setImportedWallet({ address, privateKey });
    setOnboardingStep('password');
  };

  // Create flow handlers
  const handleWalletCreated = (address: string, privateKey: string, mnemonic: string) => {
    setCreatedWallet({ address, privateKey, mnemonic });
    setOnboardingStep('backup');
  };

  const handleBackupComplete = () => {
    setOnboardingStep('quiz');
  };

  const handleQuizComplete = () => {
    setOnboardingStep('password');
  };

  // Password setup complete
  const handlePasswordComplete = () => {
    setOnboardingStep('complete');
  };

  // Start using wallet after complete
  const handleStartUsing = () => {
    setHasWallet(true);
    setIsUnlocked(true);
    // Reset flow state
    setOnboardingStep('onboarding');
    setImportedWallet(null);
    setCreatedWallet(null);
  };

  // Get current wallet data for password setup
  const getCurrentWalletData = () => {
    if (createdWallet) {
      return { address: createdWallet.address, privateKey: createdWallet.privateKey };
    }
    if (importedWallet) {
      return { address: importedWallet.address, privateKey: importedWallet.privateKey };
    }
    return null;
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

  // No wallet setup yet - show onboarding flow
  if (!hasWallet) {
    const walletData = getCurrentWalletData();
    const isNewWallet = !!createdWallet;

    return (
      <PopupLayout>
        {onboardingStep === 'onboarding' && (
          <OnboardingPage 
            version={version} 
            onImportWallet={() => setOnboardingStep('import')}
            onCreateWallet={() => setOnboardingStep('create')}
          />
        )}
        {onboardingStep === 'import' && (
          <ImportWalletPage 
            onBack={() => setOnboardingStep('onboarding')}
            onImportSuccess={handleImportSuccess}
          />
        )}
        {onboardingStep === 'create' && (
          <CreateWalletPage
            onBack={() => setOnboardingStep('onboarding')}
            onWalletCreated={handleWalletCreated}
          />
        )}
        {onboardingStep === 'backup' && createdWallet && (
          <BackupSeedPage
            mnemonic={createdWallet.mnemonic}
            onBack={() => setOnboardingStep('create')}
            onContinue={handleBackupComplete}
          />
        )}
        {onboardingStep === 'quiz' && createdWallet && (
          <SeedQuizPage
            mnemonic={createdWallet.mnemonic}
            onBack={() => setOnboardingStep('backup')}
            onComplete={handleQuizComplete}
          />
        )}
        {onboardingStep === 'password' && walletData && (
          <SetupPasswordPage 
            walletAddress={walletData.address}
            privateKey={walletData.privateKey}
            mnemonic={createdWallet?.mnemonic}
            onComplete={handlePasswordComplete}
            onBack={() => setOnboardingStep(isNewWallet ? 'quiz' : 'import')}
          />
        )}
        {onboardingStep === 'complete' && walletData && (
          <CompletePage 
            walletAddress={walletData.address}
            isNewWallet={isNewWallet}
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
        <Route 
          path="/backup-seed" 
          element={
            isUnlocked 
              ? <BackupSeedSettingsPage /> 
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
