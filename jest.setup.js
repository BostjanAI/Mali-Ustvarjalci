process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unit_test';
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NEXTAUTH_SECRET = 'unit-tests-only-secret-over-32-characters';
process.env.AUTH_MODE = 'mock';
process.env.NEXT_PUBLIC_MOCK_MODE = 'false';
