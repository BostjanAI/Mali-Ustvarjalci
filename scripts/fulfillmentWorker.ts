import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  if (!process.argv.includes('--apply')) {
    console.log(
      'Use --apply to process pending fulfilments and reconcile Stripe reservations/refunds.',
    );
    return;
  }
  const { runFulfillmentWorker } = await import('../src/lib/fulfillmentWorker');
  const { prisma } = await import('../src/lib/prisma');
  try {
    console.log(await runFulfillmentWorker());
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error('Worker failed');
  process.exitCode = 1;
});
