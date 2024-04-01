const errorResponses = require('./error_responses.json');
require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials
} = require('discord.js');
const {
    Configuration,
    OpenAIApi
} = require('openai');
const { createClient } = require('redis');

const client = new Client({
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildVoiceStates]
});

const redisClient = createClient();
redisClient.on('error', err => console.log('Redis Client Error', err));

let data = {
    GPT_API_KEY: process.env.GPT_API_KEY,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN
};

const configuration = new Configuration({
    apiKey: data.GPT_API_KEY
});
const openai = new OpenAIApi(configuration);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await redisClient.connect();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const conversationHistory = await getConversationHistory(message.channel.id);
    const response = await generateResponse(conversationHistory, data.GPT_API_KEY);
    message.channel.send(response);
    await saveConversationHistory(message.channel.id, conversationHistory + message.content + response);
});

async function getConversationHistory(channelId) {
    const history = await redisClient.get(channelId);
    return history || '';
}

async function saveConversationHistory(channelId, conversation) {
    await redisClient.set(channelId, conversation);
}

async function generateResponse(prompt) {
    // Add starting point to prompt
    const modifiedPrompt = 'Semblance, you are an AI assistant designed to help our team with various tasks. Your role includes analyzing and providing feedback on our plans, answering questions, and assisting in various tasks. Please be aware of the context and assist the team members in the most helpful way possible. ${prompt}'
    try {
        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt,
            temperature: 0.9,
            max_tokens: 150,
            top_p: 1,
            frequency_penalty: 0.0,
            presence_penalty: 0.6,
            stop: [" Human:", " AI:"],
          });

          client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
        
            const conversationHistory = await getConversationHistory(message.channel.id);
            const response = await generateResponse(conversationHistory, data.GPT_API_KEY);
        
            // Check if the response is empty or contains only whitespace
            if (response.trim().length > 0) {
                message.channel.send(response);
                await saveConversationHistory(message.channel.id, conversationHistory + message.content + response);
            } else {
                // You can send a default message or log the issue if the response is empty
                console.log('Empty response generated for the following prompt:', message.content);
            }
        });
        
client.login(data.DISCORD_BOT_TOKEN);