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
  StreamType
} = require("@discordjs/voice");

const prism = require("prism-media");
const ffmpeg = require("ffmpeg-static");

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

  // ========================= JOIN =========================
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

    await interaction.reply("Bot masuk voice...");

    try {

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false
      });

      const player = createAudioPlayer();

      // Generate infinite silent audio via ffmpeg
      const silentStream = new prism.FFmpeg({
        args: [
          "-f", "lavfi",
          "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
          "-f", "opus",
          "-"
        ],
        ffmpeg
      });

      const resource = createAudioResource(silentStream, {
        inputType: StreamType.Opus
      });

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        player.play(resource);
      });

      await interaction.editReply("Bot berhasil join dan stay 24/7.");

    } catch (err) {
      console.error(err);
      await interaction.editReply("Terjadi error saat join voice.");
    }
  }

  // ========================= LEAVE =========================
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