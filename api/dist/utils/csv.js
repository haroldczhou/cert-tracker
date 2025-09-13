"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSV = parseCSV;
function parseCSV(input, delimiter = ',') {
    // Normalize newlines and strip BOM
    let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (text.charCodeAt(0) === 0xfeff)
        text = text.slice(1);
    const rows = [];
    let row = [];
    let field = '';
    let i = 0;
    let inQuotes = false;
    const dlm = delimiter === '\\t' ? '\t' : delimiter; // support "\\t" literal
    while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                else {
                    inQuotes = false;
                    i++;
                    continue;
                }
            }
            else {
                field += ch;
                i++;
                continue;
            }
        }
        else {
            if (ch === '"') {
                inQuotes = true;
                i++;
                continue;
            }
            if (ch === dlm) {
                row.push(field);
                field = '';
                i++;
                continue;
            }
            if (ch === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                i++;
                continue;
            }
            field += ch;
            i++;
        }
    }
    // push last field
    row.push(field);
    rows.push(row);
    // drop trailing empty line
    if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
        rows.pop();
    }
    const headers = (rows.shift() || []).map((h) => h.trim());
    return { headers, rows };
}
//# sourceMappingURL=csv.js.map