require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus
} = require("@discordjs/voice");

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

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

  for (const [id] of guilds) {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, id),
      { body: commands }
    );
  }

  console.log("Slash command registered.");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {

    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply({
        content: "Masuk voice dulu.",
        ephemeral: true
      });
    }

    if (getVoiceConnection(interaction.guild.id)) {
      return interaction.reply("Bot sudah ada di voice.");
    }

    await interaction.reply("Bot berhasil join dan stay 24/7.");

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    const player = createAudioPlayer();

    const silence = Buffer.from([0xF8, 0xFF, 0xFE]);

    function play() {
      const resource = createAudioResource(silence, {
        inputType: StreamType.Opus
      });
      player.play(resource);
    }

    play();
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, play);
  }

  if (interaction.commandName === "leave") {

    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return interaction.reply({
        content: "Bot tidak ada di voice.",
        ephemeral: true
      });
    }

    connection.destroy();
    return interaction.reply("Bot keluar voice.");
  }
});

client.login(process.env.DISCORD_TOKEN);