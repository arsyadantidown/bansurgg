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
  VoiceConnectionStatus,
  AudioPlayerStatus,
  entersState,
  StreamType
} = require("@discordjs/voice");

const { Readable } = require("stream");

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

function createSilentStream() {
  const silenceFrame = Buffer.alloc(3840); 
  return new Readable({
    read() {
      this.push(silenceFrame);
    }
  });
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {

    const channel = interaction.member.voice.channel;

    if (!channel)
      return interaction.reply({ 
        content: "Masuk voice dulu.", 
        ephemeral: true 
      });

    if (getVoiceConnection(interaction.guild.id))
      return interaction.reply("Bot ada di voice kocak");

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    const player = createAudioPlayer();
    const resource = createAudioResource(createSilentStream(), {
      inputType: StreamType.Raw
    });

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      player.play(createAudioResource(createSilentStream(), {
        inputType: StreamType.Raw
      }));
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
      }
    });

    return interaction.reply("aw");
  }

  if (interaction.commandName === "leave") {

    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection)
      return interaction.reply({ 
        content: "gada bot kocak", 
        ephemeral: true 
      });

    connection.destroy();

    return interaction.reply("Bot keluar voice.");
  }
});

client.login(process.env.DISCORD_TOKEN);