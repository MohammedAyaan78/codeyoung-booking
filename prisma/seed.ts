import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Demo mentor credentials — fictional, for local/demo use only.
 * Password: CodeYoungDemo123!
 * NOT production credentials.
 */
const DEMO_PASSWORD = 'CodeYoungDemo123!';

const MENTORS = [
  { name: 'Aarav Sharma',  email: 'aarav.sharma@codeyoung.demo',  timezone: 'Asia/Kolkata'        },
  { name: 'Maya Patel',    email: 'maya.patel@codeyoung.demo',    timezone: 'Asia/Kolkata'        },
  { name: 'Daniel Thomas', email: 'daniel.thomas@codeyoung.demo', timezone: 'America/New_York'    },
  { name: 'Sophia Wilson', email: 'sophia.wilson@codeyoung.demo', timezone: 'America/Los_Angeles' },
  { name: 'Arjun Mehta',   email: 'arjun.mehta@codeyoung.demo',   timezone: 'Asia/Singapore'      },
  { name: 'Emma Johnson',  email: 'emma.johnson@codeyoung.demo',  timezone: 'Europe/London'       },
  { name: 'Kabir Singh',   email: 'kabir.singh@codeyoung.demo',   timezone: 'Asia/Kolkata'        },
  { name: 'Olivia Brown',  email: 'olivia.brown@codeyoung.demo',  timezone: 'Europe/Paris'        },
  { name: 'Riya Kapoor',   email: 'riya.kapoor@codeyoung.demo',   timezone: 'Asia/Kolkata'        },
  { name: 'Noah Williams', email: 'noah.williams@codeyoung.demo', timezone: 'America/Chicago'     },
];

async function main() {
  console.log('🌱 Seeding mentors...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const mentor of MENTORS) {
    await prisma.mentor.upsert({
      where: { email: mentor.email },
      update: { passwordHash },
      create: { ...mentor, active: true, role: 'MENTOR', passwordHash },
    });
    console.log(`  ✓ ${mentor.name} (${mentor.timezone})`);
  }

  console.log(`\n✅ Seeded ${MENTORS.length} mentors.`);
  console.log(`\n📋 Demo credentials (fictional — not production):`);
  console.log(`   Email: <any mentor email above>`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
