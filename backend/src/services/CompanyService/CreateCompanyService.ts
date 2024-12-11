import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import User from "../../models/User";
import Setting from "../../models/Setting";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface CompanyData {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
}

const generateRandomPassword = (length: number): string => {
  return crypto.randomBytes(length).toString('hex');
}

const CreateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {
  const {
    name,
    phone,
    email,
    status,
    planId,
    password,
    campaignsEnabled,
    dueDate,
    recurrence
  } = companyData;

  console.log("Dados recebidos:", companyData);
  console.log("Criando empresa com dados:", {
  name,
  phone,
  email,
  status,
  planId,
  dueDate,
  recurrence
  });

  const companySchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_COMPANY_INVALID_NAME")
      .required("ERR_COMPANY_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_COMPANY_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const companyWithSameName = await Company.findOne({
              where: { name: value }
            });

            return !companyWithSameName;
          }
          return false;
        }
      )
  });

  try {
    await companySchema.validate({ name });
  } catch (err: any) {
    console.error("Erro de validação:", err.message);
    throw new AppError(err.message);
  }

  console.log("Criando a empresa no banco de dados...");

  const company = await Company.create({
    name,
    phone,
    email,
    status,
    planId,
    dueDate,
    recurrence
  });

  console.log("Empresa criada com sucesso:", company);

  const finalPassword = password || generateRandomPassword(12);
  console.log("Senha utilizada:", finalPassword);

  const hashedPassword = await bcrypt.hash(finalPassword, 8);

  if (!password) {
    console.log("Senha gerada automaticamente para o usuário.");
  }

  const user = await User.create({
    name: company.name,
    email: company.email,
    passwordHash: hashedPassword,
    profile: "admin",
    companyId: company.id
  });

  console.log("Usuário administrador criado:", user);

  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "asaas"
    },
    defaults: {
      companyId: company.id,
      key: "asaas",
      value: ""
    },
  });

  //tokenixc
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "tokenixc"
    },
    defaults: {
      companyId: company.id,
      key: "tokenixc",
      value: ""
    },
  });

  //ipixc
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "ipixc"
    },
    defaults: {
      companyId: company.id,
      key: "ipixc",
      value: ""
    },
  });

  //ipmkauth
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "ipmkauth"
    },
    defaults: {
      companyId: company.id,
      key: "ipmkauth",
      value: ""
    },
  });

  //clientsecretmkauth
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "clientsecretmkauth"
    },
    defaults: {
      companyId: company.id,
      key: "clientsecretmkauth",
      value: ""
    },
  });

  //clientidmkauth
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "clientidmkauth"
    },
    defaults: {
      companyId: company.id,
      key: "clientidmkauth",
      value: ""
    },
  });

  //CheckMsgIsGroup
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "CheckMsgIsGroup"
    },
    defaults: {
      companyId: company.id,
      key: "enabled",
      value: ""
    },
  });

  //CheckMsgIsGroup
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "call"
    },
    defaults: {
      companyId: company.id,
      key: "call",
      value: "disabled"
    },
  });

  //scheduleType
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "scheduleType"
    },
    defaults: {
      companyId: company.id,
      key: "scheduleType",
      value: "disabled"
    },
  });


 // Enviar mensagem ao aceitar ticket
    await Setting.findOrCreate({
	where:{
      companyId: company.id,
      key: "sendGreetingAccepted",
    },
    defaults: {
      companyId: company.id,
      key: "sendGreetingAccepted",
      value: "disabled"
    },
  });
  
 // Enviar mensagem de transferencia
    await Setting.findOrCreate({
	where:{
      companyId: company.id,
      key: "sendMsgTransfTicket",
    },
    defaults: {
      companyId: company.id,
      key: "sendMsgTransfTicket",
      value: "disabled"
    },
 });

   //sendManagerWait
   await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "sendManagerWait"
    },
    defaults: {
      companyId: company.id,
      key: "sendManagerWait",
      value: "disabled"
    },
  });

    //sendManagerWaitMinutes
     await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "sendManagerWaitMinutes"
      },
      defaults: {
        companyId: company.id,
        key: "sendManagerWaitMinutes",
        value: "disabled"
      },
    });

  //userRating
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "userRating"
    },
    defaults: {
      companyId: company.id,
      key: "userRating",
      value: "disabled"
    },
  });

  //userRating
  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "chatBotType"
    },
    defaults: {
      companyId: company.id,
      key: "chatBotType",
      value: "text"
    },

  });

  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "tokensgp"
    },
    defaults: {
      companyId: company.id,
      key: "tokensgp",
      value: ""
    },
  });

  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "ipsgp"
    },
    defaults: {
      companyId: company.id,
      key: "ipsgp",
      value: ""
    },
  });

  await Setting.findOrCreate({
    where: {
      companyId: company.id,
      key: "appsgp"
    },
    defaults: {
      companyId: company.id,
      key: "appsgp",
      value: ""
    },
  });

  console.log("Configurações criadas para a empresa");

  if (companyData.campaignsEnabled !== undefined) {
    const [setting, created] = await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "campaignsEnabled"
      },
      defaults: {
        companyId: company.id,
        key: "campaignsEnabled",
        value: `${campaignsEnabled}`
      },

    });
    if (!created) {
      await setting.update({ value: `${campaignsEnabled}` });
    }
  }

  return company;
};

export default CreateCompanyService;