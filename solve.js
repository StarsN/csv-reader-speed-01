// Fast drop-in for csv-reader 1.0.0 (make.fun's own reference program).
// Same answers, same error policy, read once left to right. Written fresh for
// csv-reader-speed-01-run-20261121. No dependencies, no state kept between calls.
//
// Speed comes from never reading a character twice: unquoted fields are taken
// as one slice up to the next delimiter (one regex search), quoted fields as
// one slice up to their closing quote (indexOf scan, doubled quotes folded in
// bulk), and line breaks inside quotes are counted in bulk. The reference
// builds every field a character at a time; this one only touches characters
// that delimit something.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

const DELIM = /[,\r\n]/g;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Reads unquoted characters onto `value` up to the next comma or line break.
  // A CR not followed by LF is dropped (stray_cr). Returns the field, how it
  // ended, and how many characters were kept (for the quote_junk rule).
  function readUnquoted(value) {
    let added = 0;
    for (;;) {
      DELIM.lastIndex = pos;
      const m = DELIM.exec(text);
      if (m === null) {
        const rest = n - pos;
        if (rest > 0) {
          value += text.slice(pos, n);
          added += rest;
        }
        pos = n;
        return { value, ended: END, added };
      }
      const i = m.index;
      const c = m[0];
      if (c === ',') {
        if (i > pos) {
          value += text.slice(pos, i);
          added += i - pos;
        }
        pos = i + 1;
        return { value, ended: COMMA, added };
      }
      if (c === '\n') {
        if (i > pos) {
          value += text.slice(pos, i);
          added += i - pos;
        }
        pos = i + 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      // c === '\r'
      if (text.charCodeAt(i + 1) === 10) {
        if (i > pos) {
          value += text.slice(pos, i);
          added += i - pos;
        }
        pos = i + 2;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      error('stray_cr');
      if (i > pos) {
        value += text.slice(pos, i);
        added += i - pos;
      }
      pos = i + 1;
    }
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let q = pos + 1;
    let closeIdx = -1;
    for (;;) {
      q = text.indexOf('"', q);
      if (q === -1) break;
      if (text.charCodeAt(q + 1) === 34) {
        q += 2;
        continue;
      }
      closeIdx = q;
      break;
    }
    if (closeIdx === -1) {
      // The quote never closes: it is a literal character, and the text after
      // it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      error('unterminated_quote');
      return readUnquoted('"');
    }
    let value = text.slice(open + 1, closeIdx);
    if (value.indexOf('\r') !== -1 || value.indexOf('\n') !== -1 || value.indexOf('"') !== -1) {
      const breaks = value.match(/\r\n?|\n/g);
      if (breaks !== null) line += breaks.length;
      if (value.indexOf('"') !== -1) value = value.replace(/""/g, '"');
      if (value.indexOf('\r') !== -1) value = value.replace(/\r\n?/g, '\n');
    }
    pos = closeIdx + 1;
    if (pos >= n) return { value, ended: END };
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      return { value, ended: COMMA };
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    // What follows the closing quote is appended as it stands, up to the next
    // comma or line break.
    const junk = readUnquoted(value);
    if (junk.added > 0) error('quote_junk');
    return junk;
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
