import { Request, Response } from "express";
import ImportContactsService from "../services/WbotServices/ImportContactsService";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  try {
    await ImportContactsService(companyId);
    return res.status(200).json({ message: "contacts imported" });
  } catch (error) {
    return res.status(500).json({ message: "Internals Server Error" });
  }
};

