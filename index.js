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
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const path = require("path");

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

    await interaction.deferReply(); // biar ga timeout

    const channel = interaction.member.voice.channel;

    if (!channel)
      return interaction.editReply("Masuk voice dulu.");

    if (getVoiceConnection(interaction.guild.id))
      return interaction.editReply("Bot sudah ada di voice.");

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    const player = createAudioPlayer();

    const resource = createAudioResource(
      path.join(__dirname, "silent.mp3")
    );

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      player.play(createAudioResource(
        path.join(__dirname, "silent.mp3")
      ));
    });

    interaction.editReply("Bot masuk voice dan stay 24/7.");
  }

  if (interaction.commandName === "leave") {

    const connection = getVoiceConnection(interaction.guild.id);

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