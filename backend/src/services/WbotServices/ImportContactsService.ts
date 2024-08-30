import * as Sentry from "@sentry/node";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import ShowBaileysService from "../BaileysServices/ShowBaileysService";
import CreateContactService from "../ContactServices/CreateContactService";
import { isString, isArray } from "lodash";
import path from "path";
import fs from 'fs';

const ImportContactsService = async (companyId: number): Promise<void> => {
  logger.info(`Starting import for company ID: ${companyId}`);

  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
  const wbot = getWbot(defaultWhatsapp.id);

  try {
    const baileysData = await ShowBaileysService(wbot.id);
    logger.info('Contacts retrieved from ShowBaileysService');

    if (!baileysData || !baileysData.contacts) {
      throw new Error("Invalid or empty contacts data");
    }

    const phoneContacts = baileysData.contacts;

    // Garantir que `phoneContacts` seja uma string antes de escrever nos arquivos
    const phoneContactsString = isString(phoneContacts) ? phoneContacts : JSON.stringify(phoneContacts, null, 2);

    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const beforeFilePath = path.join(publicFolder, 'contatos_antes.txt');
    fs.writeFileSync(beforeFilePath, phoneContactsString);
    logger.info('File contatos_antes.txt created successfully');

    const afterFilePath = path.join(publicFolder, 'contatos_depois.txt');
    fs.writeFileSync(afterFilePath, phoneContactsString);
    logger.info('File contatos_depois.txt created successfully');

    const phoneContactsList = isString(phoneContacts) ? JSON.parse(phoneContacts) : phoneContacts;

    if (isArray(phoneContactsList)) {
      for (const { id, name, notify } of phoneContactsList) {
        if (id === "status@broadcast" || id.includes("g.us")) continue;
        const number = id.replace(/\D/g, "");

        try {
          const existingContact = await Contact.findOne({
            where: { number, companyId }
          });

          if (existingContact) {
            existingContact.name = name || notify;
            await existingContact.save();
            logger.info(`Updated contact: ${number}`);
          } else {
            try {
              await CreateContactService({
                number,
                name: name || notify,
                companyId
              });
              logger.info(`Created contact: ${number}`);
            } catch (error) {
              Sentry.captureException(error);
              logger.warn(`Could not create contact. Err: ${error}`);
            }
          }
        } catch (error) {
          Sentry.captureException(error);
          logger.error(`Error processing contact with ID ${id}. Err: ${error}`);
        }
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
    throw err;
  }
};

export default ImportContactsService;
