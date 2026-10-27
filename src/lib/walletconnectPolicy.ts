import { Interface, getAddress, getBytes, toUtf8String, formatUnits } from 'ethers';
const transfer = new Interface(['function transfer(address to, uint256 amount)']);
const tokens: Record<string, {symbol:string; decimals:number}> = {
  '0x0910320181889fefde0bb1ca63962b0a8882e413': {symbol:'CAMLY', decimals:3},
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

/** Strict Profile gift-recording consent. Separate from login and never a tx. */
export function personalSignMessage(params: unknown[], account: string): { bytes: Uint8Array; review: string } {
  if (params.length !== 2 || typeof params[0] !== 'string' || typeof params[1] !== 'string'
      || params[1].toLowerCase() !== account.toLowerCase()) throw Error('Sai tài khoản ký');
  const bytes = getBytes(params[0]);
  if (bytes.length > 4096) throw Error('Thông điệp quá dài');
  const text = toUtf8String(bytes);
  if (text.startsWith('fun-profile-clone.lovable.app wants you to sign in with your Ethereum account:\n')) {
    return { bytes: loginMessage(params,account), review: `Đăng nhập FUN Profile — không gửi tiền\n\n${text}` };
  }
  const lines = text.split('\n');
  const fixed = [
    'FUN Profile: authorize recording an on-chain gift',
    'Domain: fun-profile-clone.lovable.app',
    'URI: https://fun-profile-clone.lovable.app',
    'Purpose: FUN_PROFILE_DONATION_V1',
    'This signature records a gift only. It does not send funds or approve tokens.',
  ];
  if (lines.length !== 18 || fixed.some((line,index) => lines[index] !== line)) throw Error('Chỉ hỗ trợ đăng nhập hoặc xác nhận quà tặng FUN Profile');
  const value = (index: number, label: string, pattern: RegExp) => {
    const prefix = `${label}: `;
    const result = lines[index]?.startsWith(prefix) ? lines[index].slice(prefix.length) : '';
    if (!pattern.test(result)) throw Error('Thông tin xác nhận quà tặng không hợp lệ');
    return result;
  };
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  const address = /^0x[a-f0-9]{40}$/;
  const user = value(5,'Account',uuid);
  const recipientUser = value(6,'Recipient account',uuid);
  const sender = value(7,'From',address);
  const recipient = value(8,'To',address);
  value(9,'Chain ID',/^56$/);
  const hash = value(10,'Transaction',/^0x[a-f0-9]{64}$/);
  const tokenAddress = value(11,'Token',/^(native|0x[a-f0-9]{40})$/);
  const symbol = value(12,'Symbol',/^[A-Za-z0-9._-]{1,24}$/);
  const decimalsText = value(13,'Decimals',/^(0|[1-9][0-9]?)$/);
  const decimals = parseInt(decimalsText,10); // Metadata only; amounts stay BigInt.
  const raw = BigInt(value(14,'Amount (base units)',/^[1-9][0-9]{0,77}$/));
  value(15,'Nonce',/^[a-f0-9]{64}$/);
  const issuedText = value(16,'Issued at',/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  const expiresText = value(17,'Expires at',/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  const issued = Date.parse(issuedText), expires = Date.parse(expiresText);
  const token = tokenAddress === 'native' ? {symbol:'BNB',decimals:18} : tokens[tokenAddress];
  if (sender !== account.toLowerCase() || sender === recipient || user === recipientUser
      || /^0x0{40}$/.test(recipient) || raw >= 2n**256n || decimals > 36
      || !token || token.symbol !== symbol || token.decimals !== decimals
      || !Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued || expires-issued > 300000
      || issued > Date.now()+30000 || expires <= Date.now()) throw Error('Thông điệp hết hạn hoặc thông tin ví/token không khớp');
  const amount = formatUnits(raw,decimals);
  return { bytes, review: `Ghi nhận quà tặng FUN Profile — KHÔNG chuyển thêm tiền, KHÔNG cấp quyền token\n\nSố tiền: ${amount} ${symbol}\nVí gửi: ${sender}\nVí nhận: ${recipient}\nMã giao dịch: ${hash}\nTài khoản gửi: ${user}\nTài khoản nhận: ${recipientUser}\nHết hạn: ${expiresText}\n\n${text}` };
}
