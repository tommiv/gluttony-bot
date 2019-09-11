const request = require('request-promise');
const cheerio = require('cheerio');
const xlsx = require('xlsx-populate');

const CELL_HEADER_HEIGHT = 5;

function findMeaningfulCellIndex(row) {
    for (let i = 1; i < row._cells.length; i++) {
        if (row.cell(i).value()) return i;
    }

    return -1;
}

function findDataOffset(sheet) {
    for (let i = 1; i < sheet._rows.length; i++) {
        const row = sheet.row(i);
        const cellIdx = findMeaningfulCellIndex(row);
        if (cellIdx === -1) continue;

        const hmmm = row.cell(cellIdx).value();
        if (hmmm && hmmm.includes('Наименование')) {
            return i + CELL_HEADER_HEIGHT;
        }
    }

    throw new Error('Data not found');
}

function isSection(row) {
    return row._cells.filter(x => Boolean(x._value)).length === 1;
}

function isEmpty(row) {
    return !row._cells.some(x => Boolean(x._value));
}

function safeCellVal(row, idx) {
    const val = row.cell(idx).value();
    if (typeof val === 'undefined') return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return val;
    if (val.text) return val.text().trim();
    return val;
}

function rowToDish(row, id) {
    const offset = findMeaningfulCellIndex(row);

    return {
        id,
        title:       safeCellVal(row, offset + 0),
        weight:      safeCellVal(row, offset + 1),
        volume:      safeCellVal(row, offset + 2),
        price:       safeCellVal(row, offset + 3),
        composition: safeCellVal(row, offset + 4),
        energy:      safeCellVal(row, offset + 5),
        protein:     safeCellVal(row, offset + 6),
        fat:         safeCellVal(row, offset + 7),
        sugar:       safeCellVal(row, offset + 8),
    };
}

async function fetchMenu() {
    const html = await request('https://shoko.ru/menu/');
    const doc = cheerio.load(html);
    const link = 'https://shoko.ru' + doc('.menuDownloadLink').attr('href');
    return request(link, {encoding: null});
}

async function getMenu() {
    const buf = await fetchMenu();
    const book = await xlsx.fromDataAsync(buf);
    const sheet = book.sheet(0);
    const dataOffset = findDataOffset(sheet);

    let currentSection;
    let menu = [];
    let pointer = 0;
    for (let i = dataOffset; i < sheet._rows.length; i++) {
        const row = sheet.row(i);
        
        const firstCell = findMeaningfulCellIndex(row);
        if (firstCell === -1) continue;

        if (isSection(row)) {
            currentSection = safeCellVal(row, firstCell);
            continue;
        }

        if (isEmpty(row)) {
            continue;
        }

        const dish = {
            ...rowToDish(row, pointer),
            section: currentSection,
        };

        menu.push(dish);

        pointer++;
    }

    return menu;
}

module.exports = {getMenu};
