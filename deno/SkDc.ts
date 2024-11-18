/**
 * Link: https://github.com/x5ilky/SkSFL
 * Version: 1.0.1deno
 * Author: x5ilky (https://github.com/x5ilky)
 * 
 * Dependencies:
 *  - node-global-proxy (using proxy server)
 *  - undici            (")
 *  - discord.js
 */
import {
  ActionRowBuilder,
  AttachmentBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Client,
  ClientOptions,
  EmbedBuilder,
  Events,
  GuildTextBasedChannel,
  InteractionCollector,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  ChannelType
} from 'npm:discord.js';

import path from 'node:path';
import proxy from 'npm:node-global-proxy';
import { ProxyAgent } from 'npm:undici';

import rd from 'node:readline';
import process from "node:process";

// #begin_import
import { SkOption } from "../shared/SkOp.ts";
import { Logger, LogLevel } from "../shared/SkLg.ts";
// #end_import

const question = (prompt: string): Promise<string> => {
  return new Promise<string>((res) => {
    const readline = rd.createInterface({
    //@ts-ignore: weird error, guarenteed to work
      input: process.stdin,
      output: process.stdout,
    });
    readline.question(prompt, (name: string) => {
      res(name);
      readline.close();
    });
  });
};

interface SilkDCConfig {
  token: string;
  commandsDir: string;
  http_proxy: SkOption<string>;
  cooldownIgnore: string[];
}

export class SilkDC<TCustomState> {
  client: Client;
  commands: Map<string, SilkDCCommand<TCustomState>>;
  customCommands: { [name: string]: (v: string) => void | Promise<void> };
  cooldown: { [name: string]: { [id: string]: number } };
  logger: Logger;

  constructor(
    public config: SilkDCConfig,
    options: ClientOptions,
    public customState: TCustomState,
    logger: Logger
  ) {
    this.logger = logger;
    this.logger.config.prefixTags?.push({
      color: [203, 105, 170],
      name: "SDC",
      priority: -10
    })
    this.cooldown = {};
    this.config.http_proxy.run_if_some((pr) => {
      proxy.default.setConfig({
        http: pr,
        https: '',
      });

      proxy.default.start();
      options.rest ||= {};
      // deno-lint-ignore no-explicit-any
      options.rest.agent = new ProxyAgent(pr) as any;
    });
    this.client = new Client(options);
    this.client.on('ready', (cl) => {
      this.logger.info(`Ready, logged in as ${cl.user.username}`);
    });
    this.commands = new Map();

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isAutocomplete()) {
        const cmd = this.commands.get(interaction.commandName);
        if (cmd === undefined) {
          this.logger.error(
            `Interaction received for command: ${interaction.commandName}, but none was found?`
          );
          return;
        }
        if (cmd.autocomplete !== undefined) {
          await cmd.autocomplete(interaction);
        }
      } else if (interaction.isChatInputCommand()) {
        const cmd = this.commands.get(interaction.commandName);
        if (cmd === undefined) {
          this.logger.error(
            `Interaction received for command: ${interaction.commandName}, but none was found?`
          );
          return;
        }
        const id = interaction.user.id;

        try {
          if (!(id in this.cooldown)) {
            this.cooldown[id] = {};
          }
          if (interaction.commandName in this.cooldown[id]) {
            const cdExpire = this.cooldown[id][interaction.commandName];
            if (
              Date.now() < cdExpire && !(this.config.cooldownIgnore.includes(interaction.user.id))
            ) {
              interaction.reply({
                content: `Yo slow down, u can run this command again <t:${Math.floor(
                  cdExpire / 1000
                )}:R>`,
                ephemeral: true,
              });
              return;
            }
          }

          try {
            await interaction.deferReply();
            cmd.execute(interaction, this);
          } catch (e) {
            this.logger.error(`${e}`);
          }
          this.cooldown[id][interaction.commandName] =
            Date.now() + (cmd.cooldown ?? 5000);
        } catch (e) {
          this.logger.error(`Error: \n\n${e}\n\n`);
        }
      }
    });

    this.customCommands = {};
  }

  /**
   * Initialize commands from the `commands_dir` config option
   */
  async init() {
    const addSubcommand = async (_subc: string[], p: string) => {
      for await (const fstr of Deno.readDir(p)) {
        const fp = path.join(p, fstr.name);
        const st = await Deno.stat(fp);
        if (!st.isDirectory) {
          const f: SilkDCCommand<TCustomState> = (await import('./' + fp)).default;
          this.logger.info(
            `Loaded command: ${fstr} |  Desc: ${f.description} | Path: ${'./' + path.join(p, fstr.name)}`
          );
          this.commands.set(path.basename(fstr.name, '.ts'), f);
        }
      }
    };

    await addSubcommand([], this.config.commandsDir);
  }

  /**
   *  Refreshes commands to discord, should not be ran by the user.
   */
  async refresh() {
    const commands = [];
    for (const key of this.commands.keys()) {
      const v = this.commands.get(key)!;
      const opt = v.options;
      this.logger.debug(`${key} ${JSON.stringify(v.description)}`);
      if (opt.is_some()) {
        const op = opt.unwrap().setName(key).setDescription(v.description);
        commands.push(op.toJSON());
      } else {
        const op = new SlashCommandBuilder()
          .setName(key)
          .setDescription(v.description);

        commands.push(op.toJSON());
      }
    }

    const rest = new REST().setToken(this.config.token);

    // and deploy your commands!

    try {
      this.logger.start(
        LogLevel.INFO,
        `Refreshing ${commands.length} application (/) commands.`
      );

      this.config.http_proxy.run_if_some((v) => {
        // deno-lint-ignore no-explicit-any
        rest.setAgent(new ProxyAgent(v) as any);
      });
      const _data = await rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commands }
      );

      this.logger.end(
        LogLevel.INFO,
        `Successfully reloaded ${commands.length} application (/) commands.`
      );
    } catch (error) {
      this.logger.error(`${error}`);
    }
  }

  /**
   * Logs into the bot with the token and starts the "repl"-like thing
   */
  async serve() {
    await this.client.login(this.config.token);
    while (true) {
      const input: string = await question('> ');
      if (input === 'rfrCmd') {
        this.logger.start(LogLevel.INFO, 'Starting refresh...');
        await this.refresh();
        this.logger.end(LogLevel.INFO, 'Refresh finished.');
      } else if (input === 'quit') {
        this.logger.start(LogLevel.INFO, 'Quitting...');
        process.exit(0);
      } else if (input === 'getDevLink') {
        this.logger.info(
          `https://discord.com/api/oauth2/authorize?client_id=${
            this.client.user!.id
          }&permissions=8&scope=bot+applications.commands`
        );
        this.logger.info('Do not use this for production, it contains admin perms');
      } else if (input === 'help') {
        this.logger.info(`Base commands:
\trfrCmd - refreshes commands to the discord api
\tquit - quits the command
\tgetDevLink - gets a dev invite link with admin perms and bot and application.commands scope
\thelp - prints this
Custom commands:`);
        for (const cmd in this.customCommands) {
          this.logger.info('\t' + cmd);
        }
      } else {
        if (input.split(/\s+/g)[0] in this.customCommands) {
          this.customCommands[input.split(/\s+/g)[0]](input);
        } else {
          this.logger.error('Unknown command');
        }
      }
    }
  }

  /**
   * Add's a custom command to the "repl"-like thing
   * @param names aliases for the command
   * @param cb callback that is called when the command is runned
   */
  addCustomCommand(names: string[], cb: (v: string) => void) {
    for (const name of names) {
      this.customCommands[name] = cb;
    }
  }
}

export interface SilkDCCommand<T> {
  execute: (
    interaction: ChatInputCommandInteraction,
    instance: SilkDC<T>
  ) => Promise<void>;
  description: string;
  options: SkOption<SlashCommandBuilder>;
  subOptions: SkOption<SlashCommandSubcommandBuilder>;
  cooldown?: number;
  autocomplete?: (Interaction: AutocompleteInteraction) => Promise<void>;
}

export const SubcommandHelper: <T>(cmds: {
  [id: string]: SilkDCCommand<T>;
}) => SilkDCCommand<T>['execute'] = (cmds) => {
  return async (interaction, instance) => {
    const sub = interaction.options.getSubcommand();
    await cmds[sub].execute(interaction, instance);
  };
};
export type ActionBarButton = {
  label: string;
  style: ButtonStyle;
  disabled: boolean;
  onclick: (i: ButtonInteraction, row: ActionRowBuilder) => void;
};

/**
 * @deprecated Don't use this function, use `MenuBuilder` instead
 * 
 * Creates an action bar to use in embeds
 * @param interaction Interaction from command
 * @param buttons List of buttons to u se
 * @param allowedIds Id's that are allowed to interact with the embed
 * @returns Action row builder
 */
export function createActionBar(
  interaction: ChatInputCommandInteraction<CacheType>,
  buttons: ActionBarButton[],
  allowedIds?: 'all' | string[]
): ActionRowBuilder<ButtonBuilder> {
  
  const row = new ActionRowBuilder();
  buttons.forEach((button) => {
    const id = `button-${Math.floor(Math.random() * 1_000_000_000_000_000)}`;
    const but = new ButtonBuilder()
      .setLabel(button.label)
      .setStyle(button.style)
      .setDisabled(button.disabled)
      .setCustomId(id);
    row.addComponents(but);
    const filter = (i: ButtonInteraction) => i.customId === id;

    if (interaction.channel?.type !== ChannelType.GuildText) return;
    const collector = (interaction.channel as GuildTextBasedChannel)!.createMessageComponentCollector({
      // deno-lint-ignore no-explicit-any
      filter: filter as any,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (i: ButtonInteraction) => {
      if (i.user.id === interaction.user.id && allowedIds === undefined) {
        button.onclick(i, row);
      } else if (allowedIds !== undefined) {
        if (allowedIds === 'all') {
          button.onclick(i, row);
        } else if (allowedIds.includes(i.user.id)) {
          button.onclick(i, row);
        }
      } else {
        await i.reply({
          content: "This isn't your interaction!",
          ephemeral: true,
        });
      }
    });
  });

  return row as ActionRowBuilder<ButtonBuilder>;
}

export type MenuBuilderButton<T> = {
  label: string;
  style: ButtonStyle;
  disabled?: boolean;
  onClick: MenuBuilderButtonCallback<T>;
  emoji?: string;
};

export type MenuBuilderButtonCallback<T> = (
  state: T[],
  i: ButtonInteraction,
  int: InteractionType,
  row: MenuBuilder<T>
) => void;

export type InteractionType = ChatInputCommandInteraction<CacheType>;
export type OrPromise<T> = T | Promise<T>;

/**
 * Class for building menus
 */
export class MenuBuilder<T> {
  buttonStates: { but: MenuBuilderButton<T>; id: string }[];
  currentCollector: InteractionCollector<ButtonInteraction> | undefined;

  constructor(
    public interaction: InteractionType,
    // deno-lint-ignore no-explicit-any
    public callback: (...state: any[]) => OrPromise<{
      embed: EmbedBuilder;
      buttons: MenuBuilderButton<T>[];
      attachments: AttachmentBuilder[];
    }>,
    public allowedIds: string[]
  ) {
    this.buttonStates = [];
    this.currentCollector = undefined;
  }

  clearCollector() {
    if (this.currentCollector === undefined) return;
    else this.currentCollector.stop();
  }

  async getData(state: T[]): Promise<{
    embed: EmbedBuilder;
    rows: ActionRowBuilder<ButtonBuilder>[];
    attachments: AttachmentBuilder[];
    buttonStates: { but: MenuBuilderButton<T>; id: string }[];
  }> {
    const rows: ActionRowBuilder[] = [];
    const cbRes = await this.callback(...state);
    this.buttonStates = [];
    cbRes.buttons.forEach((button, index) => {
      if (index % 5 === 0) {
        rows.push(new ActionRowBuilder());
      }
      const p = Math.floor(index / 5);
      const id = `button${
        Math.floor(Math.random() * 1_000_000_000_000_000) % Date.now()
      }`;
      const but = new ButtonBuilder()
        .setLabel(button.label)
        .setStyle(button.style)
        .setDisabled(button.disabled)
        .setCustomId(id);
      if (button.emoji) but.setEmoji(button.emoji);
      rows[p].addComponents(but);
      this.buttonStates.push({
        but: button,
        id,
      });
    });

    return {
      embed: cbRes.embed,
      rows: rows as unknown as ActionRowBuilder<ButtonBuilder>[],
      attachments: cbRes.attachments,
      buttonStates: this.buttonStates,
    };
  }

  /**
   * Use this method to send the embed for the first time
   * @param state state to be shared throughout operations
   * @returns Nothing
   */
  async send(...state: T[]) {
    const t = await this.getData(state);

    const _msg = await this.interaction.reply({
      embeds: [t.embed],
      components: t.rows as ActionRowBuilder<ButtonBuilder>[],
      files: t.attachments,
    });

    const filter = (i: ButtonInteraction) =>
      this.allowedIds.includes(i.user.id);

    try {
      this.currentCollector =
        (this.interaction.channel as GuildTextBasedChannel)!.createMessageComponentCollector({
          // deno-lint-ignore no-explicit-any
          filter: filter as any,
          time: 60 * 60 * 1000,
        }) as InteractionCollector<ButtonInteraction>;

      if (this.currentCollector === undefined) {
        this.interaction.followUp({
          content:
            'Failed to create message button collector, message the developer of this bot!',
          ephemeral: true,
        });
        return;
      }

      this.currentCollector.on('collect', async (i: ButtonInteraction) => {
        const bstates = (() => this.buttonStates)();
        const d = bstates.find((a) => a.id === i.customId)!;
        if (d !== undefined) {
          if (
            i.user.id === this.interaction.user.id &&
            this.allowedIds === undefined
          ) {
            d.but.onClick(state, i, this.interaction, this);
          } else if (this.allowedIds !== undefined) {
            if (this.allowedIds.includes(i.user.id)) {
              d.but.onClick(state, i, this.interaction, this);
            }
          } else {
            await i.reply({
              content: "This isn't your interaction!",
              ephemeral: true,
            });
          }
        }
      });
    } catch (e) {
      console.log(e);
      if (this.interaction.replied || this.interaction.deferred) {
        await this.interaction.followUp({
          content: 'No interaction in 5 minutes, cancelling interaction...',
          ephemeral: true,
        });
      } else {
        await this.interaction.reply({
          content: 'No interaction in 5 minutes, cancelling interaction...',
          ephemeral: true,
        });
      }
      await this.disable();
    }
  }

  /**
   * Use this method when updating the embed.
   * Always use `i.deferUpdate()`
   * @param state state to be shared throughout operation
   */
  async edit(...state: T[]) {
    const t = await this.getData(state);
    // console.log(`json: start\n${JSON.stringify(t[0].toJSON())}\nend`)
    // console.log(`components: start\n${JSON.stringify(t[1].toJSON())}\nend`)

    this.clearCollector();

    const filter = (i: ButtonInteraction) =>
      this.allowedIds.includes(i.user.id);

    try {
      this.currentCollector =
        (this.interaction.channel as GuildTextBasedChannel)!.createMessageComponentCollector({
          // deno-lint-ignore no-explicit-any
          filter: filter as any,
          time: 60 * 60 * 1000,
        }) as InteractionCollector<ButtonInteraction>;

      this.currentCollector?.on('collect', async (i: ButtonInteraction) => {
        const d = t.buttonStates.find((a) => a.id === i.customId);
        if (d !== undefined) {
          if (
            i.user.id === this.interaction.user.id &&
            this.allowedIds === undefined
          ) {
            d.but.onClick(state, i, this.interaction, this);
          } else if (this.allowedIds !== undefined) {
            if (this.allowedIds.includes(i.user.id)) {
              d.but.onClick(state, i, this.interaction, this);
            }
          } else {
            await i.reply({
              content: "This isn't your interaction!",
              ephemeral: true,
            });
          }
        }
      });
    } catch {
      this.interaction.reply({
        content: 'No interaction in 5 minutes, cancelling interaction...',
        ephemeral: true,
      });
    }

    await this.interaction.editReply({
      embeds: [t.embed],
      components: t.rows as ActionRowBuilder<ButtonBuilder>[],
      files: t.attachments,
    });
  }

  /**
   * Disable buttons
   */
  async disable() {
    const rows: ActionRowBuilder[] = [];
    const cbRes = await this.callback();
    cbRes.buttons.forEach((button, index) => {
      if (index % 5 === 0) rows.push(new ActionRowBuilder());
      const row = rows[Math.floor(index / 5)];
      const but = new ButtonBuilder()
        .setLabel(button.label)
        .setStyle(button.style)
        .setDisabled(true)
        .setCustomId(
          `button-${
            Math.floor(Math.random() * 1_000_000_000_000_000) % Date.now()
          }`
        );
      if (button.emoji) but.setEmoji(button.emoji);
      row.addComponents(but);
    });

    await this.interaction.editReply({
      embeds: [cbRes.embed],
      components: rows as ActionRowBuilder<ButtonBuilder>[],
      files: cbRes.attachments,
    });
  }
}
