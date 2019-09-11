const MiniSearch = require('minisearch');
const natural = require('natural');
const stopwordsList = require('stopwords-ru');

function getSearch(menu) {
    const tokenizer = new natural.AggressiveTokenizerRu();
    const stopwords = new Set(stopwordsList);

    const index = new MiniSearch({
        fields:      ['title'],
        storeFields: [],
        tokenize:    str => tokenizer.tokenize(str),
        processTerm: term => stopwords.has(term) ? false : natural.PorterStemmerRu.stem(term),
    });

    index.addAll(menu);

    function fetch(match) {
        return {
            ...menu[match.id],
            score: match.score,
        };
    }

    const searchOpts = {
        combineWith: 'AND',
    };

    return {
        search:  query => index.search(query, searchOpts).map(fetch),
        getById: id => menu[id],
    };
}

module.exports = {getSearch};