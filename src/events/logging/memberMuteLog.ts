import type { GuildMember, PartialGuildMember } from 'discord.js';
import { AuditLogEvent, EmbedBuilder } from 'discord.js';

import { reducedLogsSchema } from '../../Schemas/reducedLogging';

export const memberMuteLog = async (
  member: GuildMember | PartialGuildMember
) => {
  member.guild.fetchAuditLogs().then((audit) => {
    const executor = audit.entries.first();
    const { id } = member.user;
    const name = member.user.username;

    // If missing values or message is from a bot return
    if (!executor || !id || !name || member?.user?.bot) return;

    // If no reason is provided return
    if (!executor?.reason) return;

    // If user kicked themselves return
    if (executor?.executor?.id === id) return;

    // If action type is 25 return
    if (executor?.action === AuditLogEvent.MemberRoleUpdate) return;

    // If reduced logs are enabled, send the log to the reduced logs channel
    reducedLogsSchema.findOne(
      {
        guildId: member.guild.id,
      },
      async (err: any, data: { channel: string }) => {
        if (err) throw err;

        if (data) {
          // @ts-ignore
          const mChannel = member.guild.channels.cache.get(data.channel);
          if (!mChannel) return;
          const logEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('Member Timed Out')
            .addFields(
              {
                name: 'Member Name',
                value: `${name} (<@${id}>)`,
                inline: false,
              },
              {
                name: 'Member ID',
                value: `${id}`,
                inline: false,
              },
              {
                name: 'Timed Out By',
                value: `${executor?.executor?.username}#${executor?.executor?.discriminator}`,
                inline: false,
              },
              {
                name: 'Reason',
                value: `${executor?.reason}`,
                inline: false,
              }
            );

          // @ts-ignore
          mChannel.send({ embeds: [logEmbed] });
        }
      }
    );
  });
};