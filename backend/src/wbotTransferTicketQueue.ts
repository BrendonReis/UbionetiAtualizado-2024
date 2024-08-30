import { Op } from "sequelize";
import TicketTraking from "./models/TicketTraking";
import moment from "moment";
import Ticket from "./models/Ticket";
import Whatsapp from "./models/Whatsapp";
import { getIO } from "./libs/socket";
import { logger } from "./utils/logger";
import ShowTicketService from "./services/TicketServices/ShowTicketService";

const closeInactiveTickets = async (): Promise<void> => {
  const tickets = await Ticket.findAll({
    where: {
      status: "autoassigned"
    }
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

    const minutesAgo = moment().subtract(expiresTicket, 'minutes').toDate();
    
    logger.info(`Ticket ID: ${ticket.id}, Updated At: ${ticket.updatedAt}, Minutes Ago: ${minutesAgo}`);
    
    if (new Date(ticket.updatedAt) < minutesAgo) {
      //await ticket.update({ status: "closed" });
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
    }
  }

  logger.info(`Total de tickets encerrados por inatividade: ${closedTickets.length}`);
};


export const TransferTicketQueue = async (): Promise<void> => {
  const io = getIO();

  // Fechar tickets inativos
  await closeInactiveTickets();

  // Buscar os tickets que estão pendentes e sem fila
  const tickets = await Ticket.findAll({
    where: {
      status: "autoassigned",
      queueId: { [Op.is]: null }
    }
  });

  // Varrer os tickets e verificar se algum deles está com o tempo estourado
  for (const ticket of tickets) {
    const wpp = await Whatsapp.findOne({
      where: { id: ticket.whatsappId }
    });

    if (!wpp || !wpp.timeToTransfer || !wpp.transferQueueId || wpp.timeToTransfer === 0) continue;

    let dataLimite = new Date(ticket.updatedAt);
    dataLimite.setMinutes(dataLimite.getMinutes() + wpp.timeToTransfer);

    if (new Date() > dataLimite) {
      await ticket.update({ queueId: wpp.transferQueueId });

      const ticketTraking = await TicketTraking.findOne({
        where: { ticketId: ticket.id },
        order: [["createdAt", "DESC"]]
      });

      await ticketTraking.update({
        queuedAt: moment().toDate(),
        queueId: wpp.transferQueueId
      });

      const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

      io.to(ticket.status)
        .to("notification")
        .to(ticket.id.toString())
        .emit(`company-${ticket.companyId}-ticket`, {
          action: "update",
          ticket: currentTicket,
          traking: "created ticket 33"
        });

      logger.info(`Transferência de ticket automática ticket id ${ticket.id} para a fila ${wpp.transferQueueId}`);
    }
  }
};
