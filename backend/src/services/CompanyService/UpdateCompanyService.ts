import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Setting from "../../models/Setting";

interface CompanyData {
  name: string;
  id?: number | string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
}

const UpdateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {
  console.log("ID recebido:", companyData.id);

  const id = typeof companyData.id === 'string' ? parseInt(companyData.id, 10) : companyData.id;

  const company = await Company.findByPk(id);

  if (!company) {
    console.error("Empresa não encontrada com ID:", id);
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  const {
    name,
    phone,
    email,
    status,
    planId,
    campaignsEnabled,
    dueDate,
    recurrence
  } = companyData;

  await company.update({
    name,
    phone,
    email,
    status,
    planId,
    dueDate,
    recurrence
  });

  if (campaignsEnabled !== undefined) {
    const [setting, created] = await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "campaignsEnabled"
      },
      defaults: {
        companyId: company.id,
        key: "campaignsEnabled",
        value: `${campaignsEnabled}`
      }
    });
    if (!created) {
      await setting.update({ value: `${campaignsEnabled}` });
    }
  }

  return company;
};

export default UpdateCompanyService;
