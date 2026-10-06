// Replace only the landmark array, preserving all helpers and other image pools.
function replaceLandmarkBlock(content, provinces) {
  const marker = 'const PROVINCES_AND_LANDMARKS = [';
  const start = content.indexOf(marker);
  if (start === -1) throw new Error('Landmark declaration not found');
  const arrayStart = content.indexOf('[', start);
  let depth = 0, quote = '', escaped = false, end = -1;
  for (let i = arrayStart; i < content.length; i++) {
    const char = content[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if ('"\'`'.includes(char)) { quote = char; continue; }
    if (char === '[' || char === '{') depth++;
    if (char === ']' || char === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error('Landmark array is not balanced');
  if (content[end] === ';') end++;
  return content.slice(0, start) + `const PROVINCES_AND_LANDMARKS = ${JSON.stringify(provinces, null, 2)};` + content.slice(end);
}
module.exports = { replaceLandmarkBlock };
