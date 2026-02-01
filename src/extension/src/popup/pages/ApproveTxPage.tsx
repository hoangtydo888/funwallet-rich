import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, X, Check, AlertTriangle, Eye, EyeOff, Fuel, FileCode } from 'lucide-react';
import { ethers } from 'ethers';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { SecureWalletStorage } from '@shared/types';
import { BSC_MAINNET } from '@shared/constants/tokens';

/**
 * Helper: Convert value (có thể là hex hoặc string số) sang ether display string
 * Xử lý cả hex (wei) và string số, validate không âm
 */
const parseTransactionValue = (rawValue: string): string => {
  if (!rawValue || rawValue === '0' || rawValue === '0x0') return '0';
  
  try {
    if (rawValue.startsWith('0x')) {
      // Hex (wei) → ether
      const weiValue = BigInt(rawValue);
      if (weiValue < 0n) return '0'; // Không cho phép âm
      return ethers.formatEther(weiValue);
    } else {
      // String số → validate
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue) || numValue < 0) return '0';
      return rawValue;
    }
  } catch {
    console.warn('[ApproveTxPage] Failed to parse value:', rawValue);
    return '0';
  }
};

function ApproveTxPage() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  
  // Parse transaction data from URL với value được normalize
  const txData = useMemo(() => ({
    to: searchParams.get('to') || '',
    value: parseTransactionValue(searchParams.get('value') || '0'),
    data: searchParams.get('data') || '',
    origin: searchParams.get('origin') || 'Unknown',
  }), [searchParams]);
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    estimateGas();
  }, []);

  const estimateGas = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrl);
      
      const tx: ethers.TransactionRequest = {
        to: txData.to,
        value: txData.value !== '0' ? ethers.parseEther(txData.value) : 0n,
      };
      
      if (txData.data) {
        tx.data = txData.data;
      }
      
      const gasLimit = await provider.estimateGas(tx);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');
      
      const gasCost = gasLimit * gasPrice;
      setGasEstimate(ethers.formatEther(gasCost));
    } catch (err) {
      console.log('[ApproveTxPage] Gas estimate failed:', err);
      setGasEstimate('~0.0005'); // Fallback estimate
    }
  };

  const handleApprove = async () => {
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    
    setSending(true);
    setError('');
    
    try {
      // Get encrypted wallet data
      const encryptedData = await chrome.storage.local.get('fun_wallet_encrypted_keys');
      const data = encryptedData.fun_wallet_encrypted_keys;
      
      if (!data) {
        throw new Error('Không tìm thấy ví');
      }
      
      const parsed: SecureWalletStorage = JSON.parse(data);
      const addresses = Object.keys(parsed.wallets);
      
      if (addresses.length === 0) {
        throw new Error('Không tìm thấy ví');
      }
      
      // Get first wallet
      const address = addresses[0];
      const keyData = parsed.wallets[address];
      
      // Decrypt private key
      const privateKey = await decryptPrivateKey(keyData, password);
      
      // Create provider and wallet
      const provider = new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Build transaction
      const tx: ethers.TransactionRequest = {
        to: txData.to,
        value: txData.value !== '0' ? ethers.parseEther(txData.value) : 0n,
      };
      
      if (txData.data) {
        tx.data = txData.data;
      }
      
      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
      console.log('[ApproveTxPage] Transaction sent:', txResponse.hash);
      
      // Notify background of success
      await chrome.runtime.sendMessage({
        type: 'APPROVE_TRANSACTION',
        payload: { requestId, txHash: txResponse.hash }
      });
      
      // Close popup
      window.close();
    } catch (err) {
      console.error('[ApproveTxPage] Transaction error:', err);
      if (err instanceof Error && err.message.includes('decrypt')) {
        setError('Mật khẩu không đúng');
      } else if (err instanceof Error && err.message.includes('insufficient funds')) {
        setError('Số dư không đủ để thực hiện giao dịch');
      } else {
        setError(err instanceof Error ? err.message : 'Giao dịch thất bại');
      }
    } finally {
      setSending(false);
    }
  };

  const handleReject = async () => {
    await chrome.runtime.sendMessage({
      type: 'REJECT_TRANSACTION',
      payload: { requestId }
    });
    window.close();
  };

  const getHostname = () => {
    try {
      return new URL(txData.origin).hostname;
    } catch {
      return txData.origin;
    }
  };

  const formatValue = () => {
    if (txData.value === '0' || !txData.value) return '0';
    try {
      return parseFloat(txData.value).toFixed(6);
    } catch {
      return txData.value;
    }
  };

  const isContractInteraction = !!txData.data && txData.data !== '0x';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold text-center">Phê duyệt giao dịch</h1>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            {isContractInteraction ? (
              <>
                <FileCode className="w-5 h-5 text-primary" />
                <span className="font-medium">Tương tác Smart Contract</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5 text-primary" />
                <span className="font-medium">Gửi</span>
              </>
            )}
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Đến</span>
              <span className="font-mono text-xs">
                {txData.to.slice(0, 8)}...{txData.to.slice(-6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số lượng</span>
              <span className="font-medium">{formatValue()} BNB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Từ</span>
              <span>{getHostname()}</span>
            </div>
            {gasEstimate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Fuel className="w-3 h-3" />
                  Gas (ước tính)
                </span>
                <span className="text-muted-foreground">~{gasEstimate} BNB</span>
              </div>
            )}
          </div>
          
          {/* Show contract data if exists */}
          {isContractInteraction && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowData(!showData)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <FileCode className="w-3 h-3" />
                {showData ? 'Ẩn dữ liệu' : 'Xem dữ liệu hợp đồng'}
              </button>
              {showData && (
                <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all whitespace-pre-wrap max-h-20 overflow-auto">
                  {txData.data}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            Hãy kiểm tra kỹ thông tin giao dịch trước khi phê duyệt.
          </p>
        </div>
        
        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nhập mật khẩu để xác nhận</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className="w-full px-3 py-2 pr-10 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleApprove()}
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
          onClick={handleApprove}
          disabled={sending || !password}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {sending ? 'Đang gửi...' : 'Phê duyệt'}
        </button>
        <button 
          onClick={handleReject}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-muted rounded-xl font-medium"
        >
          <X className="w-5 h-5" />
          Từ chối
        </button>
      </div>
    </div>
  );
}

export default ApproveTxPage;
