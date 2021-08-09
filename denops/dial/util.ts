/// 文字列のインデックスをバイトインデックスに変換する。
export function toByteIdx(line: string, idx: number) {
  const text = line.substr(0, idx);
  return (new TextEncoder()).encode(text).length;
}

/// バイトインデックスを文字列のインデックスに変換する。
export function toStringIdx(line: string, idx: number) {
  const encodedValues = (new TextEncoder()).encode(line).subarray(0, idx);
  return (new TextDecoder()).decode(encodedValues).length;
}
