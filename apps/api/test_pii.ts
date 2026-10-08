import { logger } from "./src/utils/logger.js";
logger.info("Test PII", {
  email: "test@example.com",
  phone: "1234567890",
  apiKey: "sk_test_123",
  password: "supersecret",
  nested: {
    customerEmail: "user@domain.com",
    contact_phone: "+919876543210"
  }
});
