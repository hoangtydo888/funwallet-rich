import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isValidAddress, sendBNB, sendToken, getBNBBalance, getTokenBalance, COMMON_TOKENS } from '@/lib/wallet';

export interface TransferItem {
  address: string;
  amount: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  txHash?: string;
  error?: string;
}

export interface BulkTransfer {
  id: string;
  created_by: string;
  token_symbol: string;
  token_address: string | null;
  total_recipients: number;
  successful_count: number;
  failed_count: number;
  total_amount: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface BulkTransferProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  isRunning: boolean;
}

export const useBulkTransfer = () => {
  const { user } = useAuth();
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [progress, setProgress] = useState<BulkTransferProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    isRunning: false,
  });
  const [bulkTransfers, setBulkTransfers] = useState<BulkTransfer[]>([]);

  // Parse CSV content
  const parseCSV = useCallback((content: string): TransferItem[] => {
    const lines = content.trim().split('\n');
    const items: TransferItem[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('address') || trimmedLine.startsWith('#')) {
        continue; // Skip header or comments
      }

      const parts = trimmedLine.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const address = parts[0];
        const amount = parts[1];

        items.push({
          address,
          amount,
          status: isValidAddress(address) && parseFloat(amount) > 0 ? 'pending' : 'failed',
          error: !isValidAddress(address) ? 'Địa chỉ không hợp lệ' : 
                 parseFloat(amount) <= 0 ? 'Số tiền không hợp lệ' : undefined,
        });
      }
    }

    return items;
  }, []);

  // Validate transfer items
  const validateItems = useCallback((items: TransferItem[]): { valid: TransferItem[]; invalid: TransferItem[] } => {
    const valid: TransferItem[] = [];
    const invalid: TransferItem[] = [];

    for (const item of items) {
      if (isValidAddress(item.address) && parseFloat(item.amount) > 0) {
        valid.push({ ...item, status: 'pending' });
      } else {
        invalid.push({
          ...item,
          status: 'failed',
          error: !isValidAddress(item.address) ? 'Địa chỉ không hợp lệ' : 'Số tiền không hợp lệ',
        });
      }
    }

    return { valid, invalid };
  }, []);

  // Get balance for a token
  const getBalance = useCallback(async (privateKey: string, tokenSymbol: string): Promise<string> => {
    const { ethers } = await import('ethers');
    const wallet = new ethers.Wallet(privateKey);
    const token = COMMON_TOKENS.find(t => t.symbol === tokenSymbol);
    
    if (!token) return '0';
    
    if (token.address === null) {
      return await getBNBBalance(wallet.address);
    } else {
      return await getTokenBalance(token.address, wallet.address);
    }
  }, []);

  // Execute bulk transfer
  const executeBulkTransfer = useCallback(async (
    privateKey: string,
    items: TransferItem[],
    tokenSymbol: string,
    batchSize: number = 5,
    delayMs: number = 2000
  ): Promise<{ bulkTransferId: string | null; results: TransferItem[] }> => {
    if (!user) return { bulkTransferId: null, results: items };

    const token = COMMON_TOKENS.find(t => t.symbol === tokenSymbol);
    if (!token) return { bulkTransferId: null, results: items };

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Create bulk transfer record
    const { data: bulkTransferData, error: bulkError } = await supabase
      .from('bulk_transfers')
      .insert({
        created_by: user.id,
        token_symbol: tokenSymbol,
        token_address: token.address,
        total_recipients: items.length,
        total_amount: totalAmount.toString(),
        status: 'processing',
      })
      .select()
      .single();

    if (bulkError || !bulkTransferData) {
      console.error('Error creating bulk transfer:', bulkError);
      return { bulkTransferId: null, results: items };
    }

    const bulkTransferId = bulkTransferData.id;

    // Insert all transfer items
    const itemsToInsert = items.map(item => ({
      bulk_transfer_id: bulkTransferId,
      recipient_address: item.address,
      amount: item.amount,
      status: 'pending',
    }));

    await supabase.from('bulk_transfer_items').insert(itemsToInsert);

    // Initialize progress
    setProgress({
      total: items.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isRunning: true,
    });

    const results: TransferItem[] = [...items];

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));
      
      // Process batch concurrently
      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        try {
          let result: { hash: string } | { error: string };
          
          if (token.address === null) {
            result = await sendBNB(privateKey, item.address, item.amount);
          } else {
            result = await sendToken(privateKey, token.address, item.address, item.amount, token.decimals);
          }

          if ('hash' in result) {
            results[globalIndex] = {
              ...item,
              status: 'success',
              txHash: result.hash,
            };

            // Update item in database
            await supabase
              .from('bulk_transfer_items')
              .update({ status: 'success', tx_hash: result.hash })
              .eq('bulk_transfer_id', bulkTransferId)
              .eq('recipient_address', item.address);
          } else {
            results[globalIndex] = {
              ...item,
              status: 'failed',
              error: result.error,
            };

            await supabase
              .from('bulk_transfer_items')
              .update({ status: 'failed', error_message: result.error })
              .eq('bulk_transfer_id', bulkTransferId)
              .eq('recipient_address', item.address);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results[globalIndex] = {
            ...item,
            status: 'failed',
            error: errorMessage,
          };

          await supabase
            .from('bulk_transfer_items')
            .update({ status: 'failed', error_message: errorMessage })
            .eq('bulk_transfer_id', bulkTransferId)
            .eq('recipient_address', item.address);
        }

        return results[globalIndex];
      });

      await Promise.all(batchPromises);

      // Update progress
      const processed = Math.min(i + batchSize, items.length);
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;

      setProgress({
        total: items.length,
        processed,
        successful,
        failed,
        isRunning: processed < items.length,
      });

      setTransferItems([...results]);

      // Delay between batches to avoid rate limiting
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Update bulk transfer record
    const finalSuccessful = results.filter(r => r.status === 'success').length;
    const finalFailed = results.filter(r => r.status === 'failed').length;

    await supabase
      .from('bulk_transfers')
      .update({
        successful_count: finalSuccessful,
        failed_count: finalFailed,
        status: finalFailed === 0 ? 'completed' : 'partial',
        completed_at: new Date().toISOString(),
      })
      .eq('id', bulkTransferId);

    setProgress(prev => ({ ...prev, isRunning: false }));

    return { bulkTransferId, results };
  }, [user]);

  // Fetch bulk transfer history
  const fetchBulkTransfers = useCallback(async () => {
    const { data, error } = await supabase
      .from('bulk_transfers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching bulk transfers:', error);
      return;
    }

    setBulkTransfers(data || []);
  }, []);

  // Get bulk transfer details with items
  const getBulkTransferDetails = useCallback(async (bulkTransferId: string) => {
    const { data: items, error } = await supabase
      .from('bulk_transfer_items')
      .select('*')
      .eq('bulk_transfer_id', bulkTransferId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching transfer items:', error);
      return [];
    }

    return items || [];
  }, []);

  // Export failed transfers as CSV
  const exportFailedTransfers = useCallback((items: TransferItem[]): string => {
    const failedItems = items.filter(item => item.status === 'failed');
    const header = 'address,amount,error';
    const rows = failedItems.map(item => `${item.address},${item.amount},"${item.error || ''}"`);
    return [header, ...rows].join('\n');
  }, []);

  return {
    transferItems,
    setTransferItems,
    progress,
    bulkTransfers,
    parseCSV,
    validateItems,
    getBalance,
    executeBulkTransfer,
    fetchBulkTransfers,
    getBulkTransferDetails,
    exportFailedTransfers,
  };
};
