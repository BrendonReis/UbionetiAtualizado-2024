import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";

const CheckContactOpenTickets = async (contactId: number, whatsappId?: string): Promise<Ticket | null> => {
  let ticket = null;

  if (!whatsappId) {
    ticket = await Ticket.findOne({
      where: {
        contactId,
        status: { [Op.or]: ["open", "pending", "autoassigned"] },
      }
    });
  } else {
    ticket = await Ticket.findOne({
      where: {
        contactId,
        status: { [Op.or]: ["open", "pending", "autoassigned"] },
        whatsappId
      }
    });
  }

  return ticket;
};

export default CheckContactOpenTickets;
