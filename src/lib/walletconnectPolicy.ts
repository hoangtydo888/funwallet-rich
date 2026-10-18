import { Interface, getAddress, getBytes, toUtf8String, formatUnits } from 'ethers';
const transfer = new Interface(['function transfer(address to, uint256 amount)']);
const tokens: Record<string, {symbol:string; decimals:number}> = {
  '0x0910320181889fefde0bb1ca63962b0a8882e413': {symbol:'CAMLY', decimals:18},
  '0x55d398326f99059ff775485246999027b3197955': {symbol:'USDT', decimals:18},
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {symbol:'USDC', decimals:18},
};
export function unsignedTransfer(raw: unknown, account: string) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Giao dịch không hợp lệ');
  const tx = raw as Record<string, unknown>;
  if (typeof tx.from !== 'string' || tx.from.toLowerCase() !== account.toLowerCase()) throw Error('Sai ví gửi');
  if (tx.chainId !== undefined && BigInt(tx.chainId as string) !== 56n) throw Error('Chỉ hỗ trợ BSC');
  const allowed = ['from','to','data','value','chainId','gas','gasPrice','maxFeePerGas','maxPriorityFeePerGas','nonce','type'];
  if (Object.keys(tx).some(key => !allowed.includes(key))) throw Error('Trường giao dịch chưa hỗ trợ');
  if (typeof tx.to !== 'string') throw Error('Thiếu người nhận');
  const to = getAddress(tx.to).toLowerCase();
  const quantity = (value: unknown) => {
    if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) throw Error('Số lượng phải là chuỗi hex');
    return BigInt(value);
  };
  const value = tx.value === undefined ? 0n : quantity(tx.value);
  const data = tx.data === undefined ? '0x' : tx.data;
  if (typeof data !== 'string') throw Error('Dữ liệu không hợp lệ');
  if (data === '0x') return { to, data, value, recipient: to, amount: formatUnits(value,18), symbol:'BNB' };
  const token = tokens[to];
  if (!token || value !== 0n || !/^0xa9059cbb[0-9a-f]{128}$/i.test(data)) throw Error('Chỉ hỗ trợ chuyển BNB, CAMLY, USDT, USDC; không cấp quyền chi tiêu token');
  const decoded = transfer.decodeFunctionData('transfer', data);
  return { to, data, value, recipient: String(decoded[0]).toLowerCase(), amount:formatUnits(decoded[1],token.decimals), symbol:token.symbol };
}
export function loginMessage(params: unknown[], account: string): Uint8Array {
  if (params.length !== 2 || typeof params[1] !== 'string' || params[1].toLowerCase() !== account.toLowerCase() || typeof params[0] !== 'string') throw Error('Sai tài khoản ký');
  const bytes = getBytes(params[0]);
  const text = toUtf8String(bytes);
  if (bytes.length > 4096 || !text.startsWith('fun-profile-clone.lovable.app wants you to sign in with your Ethereum account:\n') || !text.toLowerCase().includes(account.toLowerCase())) throw Error('Chỉ hỗ trợ thông điệp đăng nhập FUN Profile');
  const issued = Date.parse(/^Issued At: (.+)$/m.exec(text)?.[1] ?? '');
  if (!Number.isFinite(issued) || issued > Date.now()+30000 || issued+300000 <= Date.now() || !/^Chain ID: 56$/m.test(text) || !/^URI: https:\/\/fun-profile-clone\.lovable\.app\/?$/m.test(text) || !/^Nonce: [a-f0-9]{32,64}$/m.test(text)) throw Error('Thông điệp đã hết hạn hoặc không hợp lệ');
  return bytes;
}
