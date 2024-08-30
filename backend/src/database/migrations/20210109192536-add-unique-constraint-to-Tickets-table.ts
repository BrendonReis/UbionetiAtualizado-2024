import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    console.log("Adding unique constraint to Tickets table");
    await queryInterface.addConstraint("Tickets", ["contactId", "companyId", "whatsappId"], {
      type: "unique",
      name: "contactid_companyid_unique"
    });
    console.log("Unique constraint added");
  },

  down: async (queryInterface: QueryInterface) => {
    console.log("Removing unique constraint from Tickets table");
    await queryInterface.removeConstraint("Tickets", "contactid_companyid_unique");
    console.log("Unique constraint removed");
  }
};