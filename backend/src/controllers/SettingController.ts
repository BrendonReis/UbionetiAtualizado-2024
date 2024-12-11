import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import Ticket from "../models/Ticket";
import sequelize from "sequelize";
import database from "../database";
import Company from "../models/Company";
import Contact from "../models/Contact";

const notifiedTickets = new Set();

let managerWaitRunning = false;
let interval: NodeJS.Timeout | null = null;

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const settings = await ListSettingsService({ companyId });

  return res.status(200).json(settings);
};

export const update = async (req: Request, res: Response): Promise<Response> => {

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { settingKey: key } = req.params;
  const { value } = req.body;
  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  const managerWait = req.body;

  if (managerWait.key === "sendManagerWait" || managerWait.key === "sendManagerWaitMinutes") {
    await saveManagerWaitValue(managerWait.key, managerWait.value);
  }

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

const getManagerWaitStatus = async (key: string) => {
  const selectSql = `SELECT status FROM "SendManagerWait" WHERE type = $1`;
  const selectValues = [key];

  try {
    const result = await database.query(selectSql, {
      bind: selectValues,
      type: sequelize.QueryTypes.SELECT
    }) as { status: string }[];

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Erro ao buscar status na tabela SendManagerWait:", error);
    return null;
  }
};

const getSendManagerWaitMinute = async (key: string) => {
  const selectSql = `SELECT status FROM "SendManagerWait" WHERE type = $1`;
  const selectValues = [key];

  try {
    const result = await database.query(selectSql, {
      bind: selectValues,
      type: sequelize.QueryTypes.SELECT
    }) as { status: string }[];

    if (result.length > 0) {
      const status = parseInt(result[0].status, 10);
      return isNaN(status) ? null : status;
    }
  } catch (error) {
    console.error("Erro ao buscar sendManagerWaitMinute:", error);
  }

  return null;
};

export const saveManagerWaitValue = async (key: string, value: string) => {
  const checkSql = `SELECT COUNT(*) as count FROM "SendManagerWait" WHERE type = $1`;
  const checkValues = [key];

  try {
    const result = await database.query(checkSql, {
      bind: checkValues,
      type: sequelize.QueryTypes.SELECT
    }) as { count: number }[];

    let sendManagerWaitMinute: number | null = null;

    if (result[0].count > 0) {
      const updateSql = `UPDATE "SendManagerWait" SET status = $1 WHERE type = $2`;
      const updateValues = [value, key];

      await database.query(updateSql, {
        bind: updateValues,
        type: sequelize.QueryTypes.UPDATE
      });
    } else {
      const insertSql = `INSERT INTO "SendManagerWait" (type, status) VALUES ($1, $2)`;
      const insertValues = [key, value];

      await database.query(insertSql, {
        bind: insertValues,
        type: sequelize.QueryTypes.INSERT
      });
    }

    sendManagerWaitMinute = await getSendManagerWaitMinute(key);

    if (key === "sendManagerWaitMinutes" && !isNaN(parseInt(value, 10))) {
      sendManagerWaitMinute = parseInt(value, 10) || sendManagerWaitMinute;
    }

    if (sendManagerWaitMinute !== null) {
      const intervalTime = sendManagerWaitMinute * 60 * 1000;
      console.info(`Novo intervalo de tempo: ${intervalTime} ms`);

      await checkManagerWaitStatus(key, sendManagerWaitMinute);
    } else {
      console.warn("Nenhum intervalo de tempo configurado. Não será possível processar.");
      return;
    }
  } catch (error) {
    console.error("Erro ao processar dados na tabela SendManagerWait:", error);
  }
};

const checkManagerWaitStatus = async (key: string, sendManagerWaitMinute: number) => {
  if (managerWaitRunning) return;

  const intervalTime = sendManagerWaitMinute * 60 * 1000;

  managerWaitRunning = true;

  if (interval) {
    clearInterval(interval);
  }

  interval = setInterval(async () => {

    try {
      const statusResult = await getManagerWaitStatus('sendManagerWait');

      if (!statusResult || !statusResult.status) {
        console.warn(`Nenhum status válido encontrado. Gerenciamento desabilitado.`);
        clearInterval(interval!);
        managerWaitRunning = false;
        return;
      }

      notifiedTickets.clear();
      const currentTime = new Date();
      const pendingTickets = await getPendingTickets(key);

      console.info(`Tickets pendentes recebidos:`, pendingTickets);

      pendingTickets.forEach(ticket => {
        const ticketUpdateTime = new Date(ticket.message.updatedAt);
        const ticketTimeDifference = currentTime.getTime() - ticketUpdateTime.getTime();

        if (ticketTimeDifference > intervalTime && !notifiedTickets.has(ticket.ticket.id)) {
          console.info(`O atendimento está pendente a mais de ${sendManagerWaitMinute} minutos.`);

          const io = getIO();
          io.to(`company-${ticket.ticket.companyId}-mainchannel`).emit(`company-${ticket.ticket.companyId}-notification`, ticket);

          notifiedTickets.add(ticket.ticket.id);
        } else {
          console.warn(`Ticket com ID ${ticket.ticket.id} foi atualizado recentemente ou já foi notificado.`);
        }
      });
    } catch (error) {
      console.error("Erro na verificação de status de gerenciamento:", error);
      clearInterval(interval!);
      managerWaitRunning = false;
    }
  }, intervalTime);
};

const getPendingTickets = async (key: string) => {
  try {

    const result = await Ticket.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: Company,
          attributes: ['id', 'name'],
          include: [
            {
              model: Contact,
              as: 'contacts',
              attributes: ['id', 'name', 'number', 'profilePicUrl']
            }
          ]
        }
      ],
    });

    console.info(JSON.stringify(result, null, 2));

    if (!result.length) return [];

    let sendManagerWaitMinute = await getSendManagerWaitMinute(key);

    sendManagerWaitMinute = Number(sendManagerWaitMinute);

    if (isNaN(sendManagerWaitMinute)) {
      sendManagerWaitMinute = 0;
    }

    if (sendManagerWaitMinute === null) {
      console.warn("Valor de sendManagerWaitMinutes não encontrado no banco.");
      return [];
    }

    return result.map(ticket => {
      const contact = ticket.company.contacts.find((contact: { id: any; }) => contact.id === ticket.contactId);
      const company = ticket.company;
      
      return {
        action: "pendingTicket",
        statusPending: `O atendimento está pendente a mais de ${sendManagerWaitMinute} minutos.`,
        message: {
          mediaUrl: null,
          id: ticket.id,
          remoteJid: `${contact ? contact.number : ''}@s.whatsapp.net`,
          participant: null,
          dataJson: JSON.stringify({
            key: {
              remoteJid: `${contact ? contact.number : ''}@s.whatsapp.net`,
              fromMe: ticket.fromMe,
              id: ticket.id
            },
            messageTimestamp: new Date(ticket.updatedAt).getTime(),
            pushName: contact ? contact.name : 'Unknown',
            broadcast: false,
            message: {
              conversation: ticket.lastMessage,
              messageContextInfo: {
                deviceListMetadata: {
                  senderKeyHash: "sampleHash",
                  senderTimestamp: new Date(ticket.updatedAt).getTime(),
                  senderAccountType: "E2EE",
                  receiverAccountType: "E2EE",
                  recipientKeyHash: "sampleRecipientHash",
                  recipientTimestamp: new Date(ticket.updatedAt).getTime()
                },
                deviceListMetadataVersion: 2,
                messageSecret: "sampleSecret"
              },
              messageSecret: "sampleMessageSecret"
            },
            verifiedBizName: contact ? contact.name : 'Unknown'
          }),
          ack: 0,
          read: false,
          fromMe: ticket.fromMe,
          body: ticket.lastMessage,
          mediaType: "conversation",
          isDeleted: false,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          quotedMsgId: null,
          ticketId: ticket.id,
          contactId: ticket.contactId,
          companyId: ticket.companyId,
          queueId: null,
          isEdited: false,
          contact: contact ? {
            id: contact.id,
            name: contact.name,
            number: contact.number,
            email: contact.email || '',
            profilePicUrl: contact.profilePicUrl,
            isGroup: false,
            companyId: company.id,
            whatsappId: null,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt
          } : null,
          ticket: {
            id: ticket.id,
            status: ticket.status,
            unreadMessages: ticket.unreadMessages,
            lastMessage: ticket.lastMessage,
            isGroup: ticket.isGroup,
            userId: null,
            contactId: ticket.contactId,
            whatsappId: ticket.whatsappId,
            queueId: ticket.queueId,
            chatbot: false,
            queueOptionId: null,
            companyId: company.id,
            uuid: ticket.uuid,
            useIntegration: false,
            integrationId: null,
            typebotSessionId: null,
            typebotStatus: false,
            promptId: null,
            fromMe: ticket.fromMe,
            amountUsedBotQueues: 0,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            contact: contact ? {
              id: contact.id,
              name: contact.name,
              number: contact.number,
              profilePicUrl: contact.profilePicUrl
            } : null,
            queue: null,
            whatsapp: {
              name: ""
            }
          }
        },
        ticket: {
          id: ticket.id,
          status: ticket.status,
          unreadMessages: ticket.unreadMessages,
          lastMessage: ticket.lastMessage,
          isGroup: ticket.isGroup,
          userId: null,
          contactId: ticket.contactId,
          whatsappId: ticket.whatsappId,
          queueId: ticket.queueId,
          chatbot: false,
          queueOptionId: null,
          companyId: company.id,
          uuid: ticket.uuid,
          useIntegration: false,
          integrationId: null,
          typebotSessionId: null,
          typebotStatus: false,
          promptId: null,
          fromMe: ticket.fromMe,
          amountUsedBotQueues: 0,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          contact: contact ? {
            id: contact.id,
            name: contact.name,
            number: contact.number,
            profilePicUrl: contact.profilePicUrl
          } : null,
          queue: null,
          whatsapp: {
            name: ""
          }
        },
        contact: contact ? {
          id: contact.id,
          name: contact.name,
          number: contact.number,
          email: contact.email || '',
          profilePicUrl: contact.profilePicUrl,
          isGroup: false,
          companyId: company.id,
          whatsappId: ticket.whatsappId,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt
        } : null
      };
    });
  } catch (error) {
    console.error("Erro ao buscar tickets:", error);
  }
};