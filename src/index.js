const shoko = require('./import/shoko');
const {getSearch} = require('./search/minisearch');
const GluttonyBot = require('./telegram/bot');

async function registerAll(bot) {
    try {
        const shokoDB = getSearch(await shoko.getMenu());
        bot.registerVenue('shoko', 'Шоколадница', shokoDB);
    } catch (e) {
        console.error(new Date(), e);
    }
    
    console.log(new Date(), 'DB rebuilt');
}

async function main() {
    const bot = new GluttonyBot();
    await registerAll(bot);
    bot.serve();

    setInterval(() => registerAll(bot), 6 * 60 * 60 * 1000);
}

main();