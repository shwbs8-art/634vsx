const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');

const config = {
    minecraft: {
        host: 'X1XC.aternos.me',
        port: 56576,
        username: 'SecurityBot',
        auth: 'offline'
    },
    discord: {
        token: process.env.DISCORD_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID
    },
    messageInterval: 3600000
};

const spamProtection = {
    messages: new Map(),
    threshold: 3,
    timeWindow: 3000
};

let messagesEnabled = true;

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let bot;
let statusMessage;

function createBot() {
    console.log('🔄 جاري الاتصال بسيرفر ماينكرافت...');
    
    bot = mineflayer.createBot({
        host: config.minecraft.host,
        port: config.minecraft.port,
        username: config.minecraft.username,
        auth: 'offline',
        version: false,
        skipValidation: true
    });

    bot.on('login', function() {
        console.log('✅ بوت ماينكرافت دخل السيرفر!');
        startStatusUpdates();
        startRandomMovements();
        startAutoMessages();
    });

    bot.on('spawn', function() {
        console.log('🎮 البوت ظهر في العالم');
    });

    bot.on('chat', function(username, message) {
        if (username === bot.username) return;
        
        if (message === '!حالة') {
            showStatusInChat();
            return;
        }
        
        if (message === '!اوامر') {
            showHelpInChat();
            return;
        }
        
        if (message === '!لاعبين') {
            showPlayersInChat();
            return;
        }
        
        if (message === '!ديسكورد') {
            bot.chat('§b§l🔗 الديسكورد: §ahttps://discord.gg/EpCyF3A6Up');
            return;
        }

        var now = Date.now();
        if (!spamProtection.messages.has(username)) {
            spamProtection.messages.set(username, []);
        }
        var userMessages = spamProtection.messages.get(username);
        userMessages.push(now);
        
        while (userMessages.length > 0 && userMessages[0] < now - spamProtection.timeWindow) {
            userMessages.shift();
        }
        
        if (userMessages.length >= spamProtection.threshold) {
            handleSpam(username);
            return;
        }

        var channel = discordClient.channels.cache.get(config.discord.channelId);
        if (channel) {
            channel.send('💬 **' + username + '**: ' + message).catch(function() {});
        }
    });

    bot.on('end', function() {
        console.log('🔄 إعادة اتصال...');
        setTimeout(createBot, 15000);
    });

    bot.on('error', function(err) {
        console.error('❌ خطأ: ' + err.message);
    });

    bot.on('kicked', function(reason) {
        console.log('🚫 طرد: ' + reason);
    });
}

function showStatusInChat() {
    var players = Object.values(bot.players).map(function(p) { return p.username; });
    bot.chat('§6§l━━━━━━━━━━━━━━━━━━');
    bot.chat('§a§l✅ حالة السيرفر: نشط');
    bot.chat('§b§l👥 عدد اللاعبين: §f' + players.length);
    if (players.length > 0) {
        bot.chat('§e§l🎮 اللاعبين: §f' + players.join(', '));
    } else {
        bot.chat('§cلا يوجد لاعبين');
    }
    bot.chat('§d§l🔗 الديسكورد: §ahttps://discord.gg/EpCyF3A6Up');
    bot.chat('§6§l━━━━━━━━━━━━━━━━━━');
}

function showHelpInChat() {
    bot.chat('§6§l━━━━ الأوامر ━━━━');
    bot.chat('§a!حالة §f- عرض حالة السيرفر');
    bot.chat('§a!لاعبين §f- عرض اللاعبين');
    bot.chat('§a!ديسكورد §f- رابط الديسكورد');
    bot.chat('§a!اوامر §f- عرض الأوامر');
    bot.chat('§6§l━━━━━━━━━━━━━━━━━━');
}

function showPlayersInChat() {
    var players = Object.values(bot.players).map(function(p) { return p.username; });
    if (players.length > 0) {
        bot.chat('§b§l👥 اللاعبين (' + players.length + '):');
        bot.chat('§f' + players.join(', '));
    } else {
        bot.chat('§c❌ لا يوجد لاعبين');
    }
}

async function handleSpam(username) {
    try {
        bot.chat('/kick ' + username + ' سبام');
        spamProtection.messages.delete(username);
        
        var channel = discordClient.channels.cache.get(config.discord.channelId);
        if (channel) {
            await channel.send({
                embeds: [{
                    title: '🚨 تنبيه سبام!',
                    description: 'تم كشف سبام من **' + username + '**\nتم طرده تلقائياً',
                    color: 0xFF0000
                }]
            });
        }
    } catch (err) {
        console.error('فشل طرد: ' + err);
    }
}

function startAutoMessages() {
    var msg = '§6§lأهلاً بكم في سيرفر عراق بابلون §f| §bالديسكورد: §ahttps://discord.gg/EpCyF3A6Up §f| §eنتمنى لكم وقتاً ممتعاً';
    
    setTimeout(function() {
        if (messagesEnabled) sendMsg(msg);
    }, 10000);
    
    setInterval(function() {
        if (messagesEnabled) sendMsg(msg);
    }, config.messageInterval);
}

function sendMsg(message) {
    if (!bot || !bot.entity) return;
    try {
        bot.chat(message);
    } catch (err) {
        console.error('فشل إرسال: ' + err);
    }
}

async function startStatusUpdates() {
    var channel = discordClient.channels.cache.get(config.discord.channelId);
    if (!channel) return;

    try {
        var messages = await channel.messages.fetch({ limit: 10 });
        var oldMessages = messages.filter(function(m) { return m.author.id === discordClient.user.id; });
        for (var msg of oldMessages.values()) {
            await msg.delete().catch(function() {});
        }

        statusMessage = await channel.send({
            embeds: [{
                title: '📊 حالة سيرفر ماينكرافت',
                description: '⏳ جاري التحميل...',
                color: 0xF1C40F
            }]
        });
    } catch (err) {
        console.error('فشل إنشاء رسالة: ' + err.message);
    }

    updateStatus();
    setInterval(updateStatus, 300000);
}

async function updateStatus() {
    var channel = discordClient.channels.cache.get(config.discord.channelId);
    if (!channel || !statusMessage) return;

    try {
        var players = bot && bot.players ? Object.values(bot.players).map(function(p) { return p.username; }) : [];
        var isOnline = bot && bot.entity ? true : false;
        
        var embed = {
            title: '📊 حالة سيرفر ماينكرافت',
            color: isOnline ? 0x00FF00 : 0xFF0000,
            fields: [
                {
                    name: '🟢 حالة السيرفر',
                    value: isOnline ? '**✅ نشط**' : '**❌ مغلق**',
                    inline: true
                },
                {
                    name: '👥 عدد اللاعبين',
                    value: '**' + players.length + '**',
                    inline: true
                },
                {
                    name: '🎮 اللاعبين المتصلين',
                    value: players.length > 0 ? players.map(function(p) { return '• ' + p; }).join('\n') : '*لا يوجد لاعبين*',
                    inline: false
                },
                {
                    name: '🔗 الديسكورد',
                    value: 'https://discord.gg/EpCyF3A6Up',
                    inline: false
                }
            ],
            timestamp: new Date(),
            footer: {
                text: '🔄 تحديث كل 5 دقائق | عراق بابلون'
            }
        };

        await statusMessage.edit({ embeds: [embed] });
        console.log('✅ تم تحديث الحالة');
    } catch (err) {
        console.error('فشل تحديث: ' + err.message);
    }
}

function startRandomMovements() {
    setInterval(function() {
        if (!bot || !bot.entity) return;

        var actions = [
            function() {
                bot.setControlState('jump', true);
                setTimeout(function() { bot.setControlState('jump', false); }, 300);
            },
            function() {
                var dirs = ['forward', 'back', 'left', 'right'];
                var dir = dirs[Math.floor(Math.random() * dirs.length)];
                bot.setControlState(dir, true);
                setTimeout(function() { bot.setControlState(dir, false); }, 1000 + Math.random() * 2000);
            },
            function() {
                bot.look(Math.random() * Math.PI * 2, (Math.random() * 1.5) - 0.75, true);
            }
        ];

        actions[Math.floor(Math.random() * actions.length)]();
    }, 5000 + Math.random() * 10000);
}

discordClient.on('ready', function() {
    console.log('🤖 ' + discordClient.user.tag + ' جاهز!');
});

discordClient.on('messageCreate', async function(message) {
    if (message.author.bot) return;
    
    if (message.content === '!تحديث') {
        await updateStatus();
        await message.reply('✅ تم تحديث الحالة');
    }
    
    if (message.content === '!لاعبين') {
        if (bot && bot.players) {
            var players = Object.values(bot.players).map(function(p) { return p.username; });
            await message.channel.send('👥 **اللاعبين (' + players.length + '):** ' + (players.length > 0 ? players.join(', ') : 'لا يوجد'));
        }
    }
    
    if (message.content === '!رسالة') {
        var msg = '§6§lأهلاً بكم في سيرفر عراق بابلون §f| §bالديسكورد: §ahttps://discord.gg/EpCyF3A6Up';
        sendMsg(msg);
        await message.reply('✅ تم إرسال الرسالة');
    }
    
    if (message.content === '!ايقاف') {
        messagesEnabled = false;
        await message.reply('❌ تم إيقاف الرسائل');
    }
    
    if (message.content === '!تشغيل') {
        messagesEnabled = true;
        await message.reply('✅ تم تشغيل الرسائل');
    }
});

discordClient.login(config.discord.token).then(function() {
    console.log('✅ ديسكورد متصل');
    createBot();
}).catch(function(err) {
    console.error('❌ فشل اتصال الديسكورد: ' + err.message);
});
