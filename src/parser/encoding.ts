// ============================================================================
// 编码检测与解码 — F4 编码自动检测
// 支持 UTF-8 / GBK / GB2312 等中文编码
// ============================================================================

export type Encoding = 'utf-8' | 'gbk' | 'gb2312';

/**
 * 检测文本编码
 * 通过检查 BOM、字节分布等特征判断编码
 */
export function detectEncoding(bytes: Uint8Array): Encoding {
  // 1. 检查 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }

  // 2. 检查是否全为 ASCII 字符（大概率 UTF-8）
  let asciiCount = 0;
  const sampleSize = Math.min(bytes.length, 5000);
  for (let i = 0; i < sampleSize; i++) {
    if (bytes[i]! < 0x80) asciiCount++;
  }

  // 如果大部分是 ASCII → UTF-8
  if (asciiCount > sampleSize * 0.95) {
    return 'utf-8';
  }

  // 3. UTF-8 自同步性检测：检查多字节序列是否合法 UTF-8
  if (isValidUtf8(bytes)) {
    return 'utf-8';
  }

  // 4. GB2312 检测：GB2312 首字节范围 0xA1-0xF7，二字节 0xA1-0xFE
  let gbPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const b1 = bytes[i]!;
    const b2 = bytes[i + 1]!;
    if (b1 >= 0x80) {
      totalPairs++;
      if ((b1 >= 0xA1 && b1 <= 0xF7) && (b2 >= 0xA1 && b2 <= 0xFE)) {
        gbPairs++;
      }
    }
  }

  if (totalPairs > 0 && gbPairs / totalPairs > 0.8) {
    return 'gbk';
  }

  // 默认 GBK（中文文本常见编码）
  return 'gbk';
}

/**
 * 验证字节序列是否为合法 UTF-8
 */
function isValidUtf8(bytes: Uint8Array): boolean {
  let i = 0;
  let validSequences = 0;
  let invalidSequences = 0;

  while (i < bytes.length) {
    const b = bytes[i]!;
    let seqLen: number;

    if (b < 0x80) {
      i++;
      validSequences++;
      continue;
    } else if ((b & 0xe0) === 0xc0) {
      seqLen = 2;
    } else if ((b & 0xf0) === 0xe0) {
      seqLen = 3;
    } else if ((b & 0xf8) === 0xf0) {
      seqLen = 4;
    } else {
      invalidSequences++;
      i++;
      continue;
    }

    // 检查后续字节
    if (i + seqLen > bytes.length) {
      invalidSequences++;
      i++;
      continue;
    }

    let valid = true;
    for (let j = 1; j < seqLen; j++) {
      if ((bytes[i + j]! & 0xc0) !== 0x80) {
        valid = false;
        invalidSequences++;
        break;
      }
    }
    if (valid) validSequences++;
    i += seqLen;
  }

  return validSequences > invalidSequences;
}

/**
 * 将字节数组按指定编码解码为文本
 */
export function decodeBytes(bytes: Uint8Array, encoding: Encoding): string {
  // 根据 BOM 跳过前 3 字节
  const BOM_LEN = (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ? 3 : 0;

  if (encoding === 'utf-8') {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes.slice(BOM_LEN));
  }

  // GBK/GB2312 解码
  try {
    const decoder = new TextDecoder('gbk');
    return decoder.decode(bytes.slice(BOM_LEN));
  } catch {
    // 部分浏览器不支持 gbk decoder, fallback
    const decoder = new TextDecoder('gb2312');
    return decoder.decode(bytes.slice(BOM_LEN));
  }
}
