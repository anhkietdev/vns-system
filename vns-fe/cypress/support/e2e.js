import "./commands";

// Disable uncaught exception failures so React errors don't crash tests
Cypress.on("uncaught:exception", () => false);
