// Test environment: isolated database, mock payments, local storage in a temp folder.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://wgl:wgl@localhost:5432/wgl_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234567890";
process.env.STORAGE_DRIVER = "local";
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_CURRENCIES = "USD,INR";
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
