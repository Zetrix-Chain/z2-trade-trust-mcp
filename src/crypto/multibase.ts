const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Encodes bytes as base58-btc (the Bitcoin/IPFS alphabet). Does NOT prepend the multibase
 * 'z' prefix character -- callers building an actual multibase string add it themselves. */
export function base58btcEncode(bytes: Uint8Array): string {
  let leadingZeroBytes = 0;
  while (leadingZeroBytes < bytes.length && bytes[leadingZeroBytes] === 0) leadingZeroBytes++;
  if (leadingZeroBytes === bytes.length) return BASE58_ALPHABET[0].repeat(leadingZeroBytes);

  const digits = [0];
  for (let i = leadingZeroBytes; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 256;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let result = "";
  for (let k = digits.length - 1; k >= 0; k--) result += BASE58_ALPHABET[digits[k]];
  return BASE58_ALPHABET[0].repeat(leadingZeroBytes) + result;
}

/** Decodes a base58-btc string (without a multibase prefix) back to bytes. */
export function base58btcDecode(input: string): Uint8Array {
  if (input.length === 0) return new Uint8Array();

  let leadingOnes = 0;
  while (leadingOnes < input.length && input[leadingOnes] === BASE58_ALPHABET[0]) leadingOnes++;
  if (leadingOnes === input.length) return new Uint8Array(leadingOnes);

  const bytes = [0];
  for (let i = leadingOnes; i < input.length; i++) {
    const value = BASE58_ALPHABET.indexOf(input[i]);
    if (value === -1) throw new Error(`invalid base58 character: ${input[i]}`);
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  const result = new Uint8Array(leadingOnes + bytes.length);
  for (let k = 0; k < bytes.length; k++) result[leadingOnes + bytes.length - 1 - k] = bytes[k];
  return result;
}
