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

function PopupApp() {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  useEffect(() => {
    // Check wallet state on load
    checkWalletState();
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

  // No wallet setup yet - show onboarding
  if (!hasWallet) {
    return (
      <PopupLayout>
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <div className="text-4xl mb-4">🦊</div>
          <h1 className="text-xl font-bold mb-2">Chào mừng đến FUN Wallet</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Vui lòng sử dụng ứng dụng PWA để tạo ví mới trước khi sử dụng extension.
          </p>
          <a 
            href="https://wallet-fun-rich.lovable.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium"
          >
            Mở FUN Wallet PWA
          </a>
        </div>
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
