const autobind = require('auto-bind');
const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const secret = require('./secret');

const COMMAND_SET_VENUE = 'set_venue';
const COMMAND_SHOW_ITEM = 'show_item';
const COMMAND_SEARCH_ITEM = 'search_item';

class GluttonyBot {
    constructor() {
        this.venues = new Map();
        autobind(this);
    }

    /* private */ 
    formatItem(item) {
        return [
            `${item.title}`,
            '```',
            `Энергетическая ценность: ${item.energy || 0} ккал`,
            `Белки:                   ${item.protein || 0} г.`,
            `Жиры:                    ${item.fat || 0} г.`,
            `Углеводы:                ${item.sugar || 0} г.`,
            '```',
        ].join('\n');
    }

    registerVenue(id, name, index) {
        this.venues.set(id, {id, name, index});
    }

    /* private */ 
    getVenue(id) {
        return this.venues.get(id);
    }

    serve() {
        const opts = {telegram: {webhookReply: false}};
         
        const bot = new Telegraf(secret.token, opts);
        bot.use(session());
        bot.start(this.onStart);
        bot.help(this.onHelp);
        bot.on('callback_query', ctx => this.onCommand(ctx));
        bot.on('text', this.onText);
        bot.launch();
    }


    /* private */ 
    onStart(ctx) {
        const venues = Array.from(this.venues.values());
        const keys = venues.map(v => [Markup.callbackButton(v.name, `${COMMAND_SET_VENUE}:${v.id}`)]);
        const keyboard = Markup.inlineKeyboard(keys).extra();
        ctx.reply('Выберите заведение', keyboard);
    }

    onHelp(ctx) {
        const message = [
            'Введите `/start` для выбора заведения.',
            'Заметили баг? Напишите мне `@tommi_v`'
        ].join('\n');

        ctx.replyWithMarkdown(message);
    }

    onText(ctx) {
        this.onCommand(ctx, `${COMMAND_SEARCH_ITEM}:${ctx.message.text}`)
    }

    onCommand(ctx, forcedCmd) {
        const [command, arg] = (forcedCmd || ctx.callbackQuery.data).split(':');

        if (command === COMMAND_SET_VENUE) {
            ctx.session.venueID = arg;
            ctx.reply('Окей. Что ищем?');
            ctx.answerCbQuery();
            return;
        }

        const venue = this.getVenue(ctx.session.venueID);
        if (!venue) {
            ctx.replyWithMarkdown('Введите `/start` для выбора заведения');
            !forcedCmd && ctx.answerCbQuery();
            return;
        }

        if (command === COMMAND_SEARCH_ITEM) {
            const query = ctx.message.text;
            const found = venue.index.search(query);
    
            if (found.length === 1) {
                ctx.replyWithMarkdown(this.formatItem(found[0]));
            } else if (found.length > 1) {
                const keys = found.map(x => [Markup.callbackButton(x.title, `${COMMAND_SHOW_ITEM}:${x.id}`)]);
                const keyboard = Markup.inlineKeyboard(keys).extra();
                ctx.reply('Уточните плиз', keyboard);
            } else {
                ctx.reply('Ничего не найдено');
            }

            return;
        }

        if (command === COMMAND_SHOW_ITEM) {
            const item = venue.index.getById(arg);
            ctx.replyWithMarkdown(this.formatItem(item));
            ctx.replyWithMarkdown('Можете продолжить поиск или ввести `/start` для выбора заведения');
            ctx.answerCbQuery();
            return;
        }
    }
}

module.exports = GluttonyBot;