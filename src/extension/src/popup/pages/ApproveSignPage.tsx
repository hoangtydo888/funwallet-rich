import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PenTool, X, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { ethers } from 'ethers';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { SecureWalletStorage } from '@shared/types';
import { STORAGE_KEYS } from '@shared/storage/types';

interface PendingSignRequest {
  id: string;
  method: string;
  params: unknown[];
  origin: string;
  timestamp: number;
}

function ApproveSignPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const requestId = searchParams.get('requestId') || '';
  const message = searchParams.get('message') || '';
  const origin = searchParams.get('origin') || 'Unknown';
  const method = searchParams.get('method') || 'personal_sign';
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  
  useEffect(() => {
    // Decode message if hex
    try {
      if (message.startsWith('0x')) {
        // Try to decode as UTF-8
        const decoded = ethers.toUtf8String(message);
        setDecodedMessage(decoded);
      } else if (method === 'eth_signTypedData_v4') {
        // Parse typed data JSON
        const parsed = JSON.parse(message);
        setDecodedMessage(JSON.stringify(parsed, null, 2));
      } else {
        setDecodedMessage(message);
      }
    } catch {
      // If decode fails, show original
      setDecodedMessage(message);
    }
  }, [message, method]);

  const handleSign = async () => {
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    
    setSigning(true);
    setError('');
    
    try {
      // Get encrypted wallet data
      const encryptedData = await chrome.storage.local.get(STORAGE_KEYS.ENCRYPTED_KEYS);
      const data = encryptedData[STORAGE_KEYS.ENCRYPTED_KEYS];
      
      if (!data) {
        throw new Error('Không tìm thấy ví');
      }
      
      const parsed: SecureWalletStorage = JSON.parse(data);
      const addresses = Object.keys(parsed.wallets);
      
      if (addresses.length === 0) {
        throw new Error('Không tìm thấy ví');
      }
      
      // Get first wallet address
      const address = addresses[0];
      const keyData = parsed.wallets[address];
      
      // Decrypt private key
      const privateKey = await decryptPrivateKey(keyData, password);
      
      // Create wallet and sign
      const wallet = new ethers.Wallet(privateKey);
      let signature: string;
      
      if (method === 'eth_signTypedData_v4') {
        // Parse and sign typed data
        const typedData = JSON.parse(message);
        const { domain, types, message: typedMessage, primaryType } = typedData;
        
        // Remove EIP712Domain from types if present
        const typesWithoutDomain = { ...types };
        delete typesWithoutDomain.EIP712Domain;
        
        signature = await wallet.signTypedData(domain, typesWithoutDomain, typedMessage);
      } else {
        // Personal sign
        let messageToSign = message;
        if (message.startsWith('0x')) {
          messageToSign = ethers.toUtf8String(message);
        }
        signature = await wallet.signMessage(messageToSign);
      }
      
      // Send approval to background
      await chrome.runtime.sendMessage({
        type: 'APPROVE_SIGN',
        payload: { requestId, signature }
      });
      
      // Close popup
      window.close();
    } catch (err) {
      console.error('[ApproveSignPage] Sign error:', err);
      if (err instanceof Error && err.message.includes('decrypt')) {
        setError('Mật khẩu không đúng');
      } else {
        setError(err instanceof Error ? err.message : 'Ký thất bại');
      }
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    await chrome.runtime.sendMessage({
      type: 'REJECT_SIGN',
      payload: { requestId }
    });
    window.close();
  };

  const getHostname = () => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold text-center">Ký tin nhắn</h1>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {/* Icon and Origin */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <PenTool className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {getHostname()} muốn bạn ký:
          </p>
        </div>
        
        {/* Message Preview */}
        <div className="bg-muted/50 rounded-xl p-3 mb-4 max-h-32 overflow-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {decodedMessage.slice(0, 500)}
            {decodedMessage.length > 500 && '...'}
          </pre>
        </div>
        
        {/* Method Badge */}
        <div className="flex justify-center mb-4">
          <span className="px-2 py-1 bg-muted rounded text-xs font-mono">
            {method}
          </span>
        </div>
        
        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            Chỉ ký tin nhắn từ nguồn bạn tin tưởng. Tin nhắn giả mạo có thể được sử dụng để đánh cắp tài sản.
          </p>
        </div>
        
        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nhập mật khẩu để ký</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className="w-full px-3 py-2 pr-10 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSign()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button 
          onClick={handleSign}
          disabled={signing || !password}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
        >
          {signing ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {signing ? 'Đang ký...' : 'Ký'}
        </button>
        <button 
          onClick={handleReject}
          disabled={signing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-muted rounded-xl font-medium"
        >
          <X className="w-5 h-5" />
          Từ chối
        </button>
      </div>
    </div>
  );
}

export default ApproveSignPage;
