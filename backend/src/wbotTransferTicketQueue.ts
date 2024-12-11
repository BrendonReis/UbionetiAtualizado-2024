import { Op } from "sequelize";
import TicketTracking from "./models/TicketTraking";
import moment from "moment";
import Contact from "./models/Contact";
import Ticket from "./models/Ticket";
import formatBody from "./helpers/Mustache";
import SendWhatsAppMessage from "./services/WbotServices/SendWhatsAppMessage";
import Whatsapp from "./models/Whatsapp";
import { getIO } from "./libs/socket";
import { logger } from "./utils/logger";
import ShowTicketService from "./services/TicketServices/ShowTicketService";

const closeInactiveTickets = async (): Promise<void> => {
  try {
    const tickets = await Ticket.findAll({
      where: {
        status: "autoassigned"
      },
      include: [{ model: Contact, as: 'contact' }]
    });

    const closedTickets: number[] = [];

    for (const ticket of tickets) {
      const queueIntegration = await Whatsapp.findOne({
        where: {
          companyId: ticket.companyId
        }
      });

      if (!queueIntegration || !queueIntegration.expiresTicket) {
        logger.warn(`Total de tickets não encontrado para a empresa ${ticket.companyId}`);
        continue;
      }

      const expiresTicket = parseInt(queueIntegration.expiresTicket as any, 10);
      if (isNaN(expiresTicket)) {
        logger.error(`Valor inválido para expiresInactiveMessage: ${queueIntegration.expiresTicket}`);
        continue;
      }

      logger.info(`Expires inactive message (minutes): ${expiresTicket}`);
      if (!ticket.updatedAt) {
        logger.warn(`updatedAt está vazio para o ticket ${ticket.id}. Atualização ignorada.`);
        continue;
      }

      const minutesAgo = moment().subtract(expiresTicket, 'minutes').toDate();
      logger.info(`Ticket ID: ${ticket.id}, Updated At: ${ticket.updatedAt}, Minutes Ago: ${minutesAgo}`);

      if (ticket.updatedAt && new Date(ticket.updatedAt) < minutesAgo) {
        await ticket.update({
          status: "closed",
          promptId: null,
          integrationId: null,
          useIntegration: false,
          typebotStatus: false,
          typebotSessionId: null
        });
        logger.info(`Ticket ${ticket.id} encerrado por inatividade.`);
        closedTickets.push(ticket.id);

        const expiresInactiveMessage = queueIntegration.expiresInactiveMessage;

        const contact = ticket.contact;

        if (expiresInactiveMessage) {
          if (contact && contact.number) {
            const messageBody = formatBody(`\u200e ${expiresInactiveMessage}`, contact);
            try {
              await SendWhatsAppMessage({ body: messageBody, ticket: ticket });
              logger.info(`Mensagem de encerramento enviada para o ticket ${ticket.id}: ${messageBody}`);
            } catch (sendError) {
              logger.error(`Erro ao enviar mensagem para o ticket ${ticket.id}: ${sendError.message}`);
            }
          } else {
            logger.error(`Número de contato inválido para o ticket ${ticket.id}: ${JSON.stringify(contact)}`);
          }
        }
      }
    }

    logger.info(`Total de tickets encerrados por inatividade: ${closedTickets.length}`);
  } catch (error) {
    logger.error(`Erro ao fechar tickets inativos: ${error.message}`);
  }
};

export const TransferTicketQueue = async (): Promise<void> => {
  const io = getIO();

  await closeInactiveTickets();

  try {
    const tickets = await Ticket.findAll({
      where: {
        status: "autoassigned",
        queueId: { [Op.is]: null }
      }
    });

    const transferPromises = tickets.map(async (ticket) => {
      const wpp = await Whatsapp.findOne({
        where: { id: ticket.whatsappId }
      });

      if (!wpp || !wpp.timeToTransfer || !wpp.transferQueueId || wpp.timeToTransfer === 0) return;

      if (!ticket.updatedAt) {
        logger.warn(`updatedAt está vazio para o ticket ${ticket.id}. Atualização ignorada.`);
        return;
      }

      let dataLimite = new Date(ticket.updatedAt);
      if (isNaN(dataLimite.getTime())) {
        logger.warn(`Data inválida para o ticket ${ticket.id}. Atualização ignorada.`);
        return;
      }

      dataLimite.setMinutes(dataLimite.getMinutes() + wpp.timeToTransfer);

      if (new Date() > dataLimite) {
        await ticket.update({ queueId: wpp.transferQueueId });

        const ticketTracking = await TicketTracking.findOne({
          where: { ticketId: ticket.id },
          order: [["createdAt", "DESC"]]
        });

        if (ticketTracking) {
          await ticketTracking.update({
            queuedAt: moment().toDate(),
            queueId: wpp.transferQueueId
          });
        } else {
          logger.warn(`Ticket tracking não encontrado para o ticket ${ticket.id}.`);
        }

        const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

        io.to(ticket.status)
          .to("notification")
          .to(ticket.id.toString())
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket: currentTicket,
            tracking: "created ticket 33"
          });

        logger.info(`Transferência de ticket automática ticket id ${ticket.id} para a fila ${wpp.transferQueueId}`);
      }
    });

    await Promise.all(transferPromises);
  } catch (error) {
    logger.error(`Erro ao transferir tickets: ${error.message}`);
  }
};
