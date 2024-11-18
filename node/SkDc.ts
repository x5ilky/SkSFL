/**
 * Link: https://gist.github.com/x5ilky/9d27df4f2e9c8ebf3f797570340510e3
 * Version: 1.0.1
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
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import proxy from 'node-global-proxy';
import { ProxyAgent } from 'undici';

import rd from 'readline';

const question = async (prompt: string): Promise<string> => {
  return new Promise<string>((res) => {
    const readline = rd.createInterface({
    //@ts-ignore
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
  http_proxy: SDCOption<string>;
  cooldownIgnore: string[];
}

export class SDCOption<T> {
  __v: TOption<T>;
  constructor(v: TOption<T>) {
    this.__v = v;
  }

  is_some(): this is { __v: Some<T> } {
    return this.__v.__op;
  }

  is_none(): this is { __v: None } {
    return !this.__v.__op;
  }

  unwrap(): T {
    return this.expect('Unwrap failed on Option<T>');
  }

  unwrap_or(v: T): T {
    return this.is_some() ? this.__v.val : v;
  }

  expect(msg: string): T {
    if (this.is_none()) {
      throw new Error(msg);
    } else {
      return this.__v.val!;
    }
  }

  run_if_some(cb: (v: T) => void): boolean {
    if (this.is_some()) {
      cb(this.unwrap());
      return true;
    } else {
      return false;
    }
  }
}

export type Some<T> = { __op: true; val: T };
export const makesome = <T>(val: T): Some<T> => ({ __op: true, val });
export const Some = <T>(val: T): SDCOption<T> => new SDCOption(makesome(val));
export type None = { __op: false; val: null };
export const makenone = <T>(): None => ({ __op: false, val: null });
export const None = <T>(): SDCOption<T> => new SDCOption<T>(makenone());
export type TOption<T> = Some<T> | None;

export class SilkDC<TCustomState> {
  client: Client;
  commands: Map<string, SilkDCCommand<TCustomState>>;
  customCommands: { [name: string]: (v: string) => void | Promise<void> };
  cooldown: { [name: string]: { [id: string]: number } };

  constructor(
    public config: SilkDCConfig,
    options: ClientOptions,
    public customState: TCustomState
  ) {
    this.cooldown = {};
    this.config.http_proxy.run_if_some((pr) => {
      proxy.setConfig({
        http: pr,
        https: '',
      });
      proxy.start();
      options.rest ||= {};
      // @ts-ignore
      options.rest.agent = new ProxyAgent(pr);
    });
    this.client = new Client(options);
    this.client.on('ready', (cl) => {
      console.log(`\n[SDC]: Ready, logged in as ${cl.user.username}`);
    });
    this.commands = new Map();

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isAutocomplete()) {
        let cmd = this.commands.get(interaction.commandName);
        if (cmd === undefined) {
          console.error(
            `Interaction received for command: ${interaction.commandName}, but none was found?`
          );
          return;
        }
        if (cmd.autocomplete !== undefined) {
          await cmd.autocomplete(interaction);
        }
      } else if (interaction.isChatInputCommand()) {
        let cmd = this.commands.get(interaction.commandName);
        if (cmd === undefined) {
          console.error(
            `Interaction received for command: ${interaction.commandName}, but none was found?`
          );
          return;
        }
        let id = interaction.user.id;

        try {
          if (!(id in this.cooldown)) {
            this.cooldown[id] = {};
          }
          if (interaction.commandName in this.cooldown[id]) {
            let cdExpire = this.cooldown[id][interaction.commandName];
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
            console.error(e);
          }
          this.cooldown[id][interaction.commandName] =
            Date.now() + (cmd.cooldown ?? 5000);
        } catch (e: any) {
          console.error(`Error: \n\n${e}\n\n`);
        }
      }
    });

    this.customCommands = {};
  }

  /**
   * Initialize commands from the `commands_dir` config option
   */
  async init() {
    const addSubcommand = async (subc: string[], p: string) => {
      for (let fstr of await fs.readdir(p)) {
        let fp = path.join(p, fstr);
        let st = await fs.stat(fp);
        if (st.isDirectory()) {
        } else {
          let f: SilkDCCommand<TCustomState> = require('./' + fp).default;
          console.log(
            `\n[INFO] Loaded command: ${fstr} |  Desc: ${
              f.description
            } | Path: ${'./' + path.join(p, fstr)}`
          );
          this.commands.set(path.basename(fstr, '.ts'), f);
        }
      }
    };

    addSubcommand([], this.config.commandsDir);
  }

  /**
   *  Refreshes commands to discord, should not be ran by the user.
   */
  async refresh() {
    let commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    for (let key of this.commands.keys()) {
      let v = this.commands.get(key)!;
      let opt = v.options;
      console.log(`[DEBUG] ${key} ${JSON.stringify(v.description)}`);
      if (opt.is_some()) {
        let op = opt.unwrap().setName(key).setDescription(v.description);
        commands.push(op.toJSON());
      } else {
        let op = new SlashCommandBuilder()
          .setName(key)
          .setDescription(v.description);

        commands.push(op.toJSON());
      }
    }

    const rest = new REST().setToken(this.config.token);

    // and deploy your commands!

    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands.`
      );

      this.config.http_proxy.run_if_some((v) => {
        // @ts-ignore
        rest.setAgent(new ProxyAgent(v));
      });
      const data = await rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commands }
      );

      console.log(
        `Successfully reloaded ${commands.length} application (/) commands.`
      );
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Logs into the bot with the token and starts the "repl"-like thing
   */
  async serve() {
    await this.client.login(this.config.token);
    while (true) {
      let input: string = await question('> ');
      if (input === 'rfrCmd') {
        console.log('Starting refresh...');
        await this.refresh();
        console.log('Refresh finished.');
      } else if (input === 'quit') {
        console.log('Quitting...');
        process.exit(0);
      } else if (input === 'getDevLink') {
        console.log(
          `https://discord.com/api/oauth2/authorize?client_id=${
            this.client.user!.id
          }&permissions=8&scope=bot+applications.commands`
        );
        console.log('Do not use this for production, it contains admin perms');
      } else if (input === 'help') {
        console.log(`Base commands:
\trfrCmd - refreshes commands to the discord api
\tquit - quits the command
\tgetDevLink - gets a dev invite link with admin perms and bot and application.commands scope
\thelp - prints this
Custom commands:`);
        for (let cmd in this.customCommands) {
          console.log('\t' + cmd);
        }
      } else {
        if (input.split(/\s+/g)[0] in this.customCommands) {
          this.customCommands[input.split(/\s+/g)[0]](input);
        } else {
          console.error('Unknown command');
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
    for (let name of names) {
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
  options: SDCOption<SlashCommandBuilder>;
  subOptions: SDCOption<SlashCommandSubcommandBuilder>;
  cooldown?: number;
  autocomplete?: (Interaction: AutocompleteInteraction) => Promise<void>;
}

export const SubcommandHelper: <T>(cmds: {
  [id: string]: SilkDCCommand<T>;
}) => SilkDCCommand<T>['execute'] = (cmds) => {
  return async (interaction, instance) => {
    let sub = interaction.options.getSubcommand();
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
  
  let row = new ActionRowBuilder();
  buttons.forEach((button, index) => {
    let id = `button-${Math.floor(Math.random() * 1_000_000_000_000_000)}`;
    let but = new ButtonBuilder()
      .setLabel(button.label)
      .setStyle(button.style)
      .setDisabled(button.disabled)
      .setCustomId(id);
    row.addComponents(but);
    const filter = (i: any) => i.customId === id;

    const collector = (interaction.channel as GuildTextBasedChannel)!.createMessageComponentCollector({
      filter,
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
        i.reply({
          content: "This isn't your interaction!",
          ephemeral: true,
        });
      }
    });
  });

  return row as ActionRowBuilder<ButtonBuilder>;
}

export type MenuBuilderButton = {
  label: string;
  style: ButtonStyle;
  disabled?: boolean;
  onClick: MenuBuilderButtonCallback;
  emoji?: string;
};

export type MenuBuilderButtonCallback = (
  state: any[],
  i: ButtonInteraction,
  int: InteractionType,
  row: MenuBuilder
) => void;

export type InteractionType = ChatInputCommandInteraction<CacheType>;
export type OrPromise<T> = T | Promise<T>;

/**
 * Class for building menus
 */
export class MenuBuilder {
  buttonStates: { but: MenuBuilderButton; id: string }[];
  currentCollector: InteractionCollector<any> | undefined;

  constructor(
    public interaction: InteractionType,
    public callback: (...state: any[]) => OrPromise<{
      embed: EmbedBuilder;
      buttons: MenuBuilderButton[];
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

  async getData(state: any[]): Promise<{
    embed: EmbedBuilder;
    rows: ActionRowBuilder<ButtonBuilder>[];
    attachments: AttachmentBuilder[];
    buttonStates: { but: MenuBuilderButton; id: string }[];
  }> {
    let rows: ActionRowBuilder[] = [];
    let cbRes = await this.callback(...state);
    this.buttonStates = [];
    cbRes.buttons.forEach((button, index) => {
      if (index % 5 === 0) {
        rows.push(new ActionRowBuilder());
      }
      let p = Math.floor(index / 5);
      let id = `button${
        Math.floor(Math.random() * 1_000_000_000_000_000) % Date.now()
      }`;
      let but = new ButtonBuilder()
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
  async send(...state: any[]) {
    let t = await this.getData(state);

    let msg = await this.interaction.reply({
      embeds: [t.embed],
      components: t.rows as ActionRowBuilder<ButtonBuilder>[],
      files: t.attachments,
    });

    const filter = (i: ButtonInteraction) =>
      this.allowedIds.includes(i.user.id);

    try {
      this.currentCollector =
        (this.interaction.channel as GuildTextBasedChannel)?.createMessageComponentCollector({
          filter: filter as any,
          time: 60 * 60 * 1000,
        });

      if (this.currentCollector === undefined) {
        this.interaction.followUp({
          content:
            'Failed to create message button collector, message the developer of this bot!',
          ephemeral: true,
        });
        return;
      }

      this.currentCollector.on('collect', async (i: ButtonInteraction) => {
        let bstates = (() => this.buttonStates)();
        let d = bstates.find((a) => a.id === i.customId)!;
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
            i.reply({
              content: "This isn't your interaction!",
              ephemeral: true,
            });
          }
        }
      });
    } catch (e) {
      console.log(e);
      if (this.interaction.replied || this.interaction.deferred) {
        this.interaction.followUp({
          content: 'No interaction in 5 minutes, cancelling interaction...',
          ephemeral: true,
        });
      } else {
        this.interaction.reply({
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
  async edit(...state: any[]) {
    let t = await this.getData(state);
    // console.log(`json: start\n${JSON.stringify(t[0].toJSON())}\nend`)
    // console.log(`components: start\n${JSON.stringify(t[1].toJSON())}\nend`)

    this.clearCollector();

    const filter = (i: ButtonInteraction) =>
      this.allowedIds.includes(i.user.id);

    try {
      this.currentCollector =
        (this.interaction.channel as GuildTextBasedChannel)!.createMessageComponentCollector({
          filter: filter as any,
          time: 60 * 60 * 1000,
        });

      this.currentCollector.on('collect', async (i: ButtonInteraction) => {
        let d = t.buttonStates.find((a) => a.id === i.customId);
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
    let rows: ActionRowBuilder[] = [];
    let cbRes = await this.callback();
    cbRes.buttons.forEach((button, index) => {
      if (index % 5 === 0) rows.push(new ActionRowBuilder());
      let row = rows[Math.floor(index / 5)];
      let but = new ButtonBuilder()
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
