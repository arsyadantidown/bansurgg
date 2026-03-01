require("dotenv").config();

const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes 
} = require("discord.js");

const { joinVoiceChannel } = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Bot masuk ke voice kamu")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Bot keluar voice")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

client.once("ready", async () => {
  console.log(`Login sebagai ${client.user.tag}`);

  const guilds = await client.guilds.fetch();

  guilds.forEach(async g => {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, g.id),
      { body: commands }
    );
  });

  console.log("Slash command registered.");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {

    const channel = interaction.member.voice.channel;

    if (!channel)
      return interaction.reply({ 
        content: "Masuk voice dulu.", 
        ephemeral: true 
      });

    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    return interaction.reply("Bot masuk voice.");
  }

  if (interaction.commandName === "leave") {

    const connection = require("@discordjs/voice").getVoiceConnection(interaction.guild.id);

    if (!connection)
      return interaction.reply({ 
        content: "Bot tidak ada di voice.", 
        ephemeral: true 
      });

    connection.destroy();

    return interaction.reply("Bot keluar voice.");
  }

});

client.login(process.env.DISCORD_TOKEN);