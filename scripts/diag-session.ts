import { db } from "@/db";
import { sql } from "drizzle-orm";
async function main() {
  const fks = await db.execute(sql`
    SELECT tc.table_name AS child, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='game_session' ORDER BY tc.table_name`);
  for (const r of (fks.rows ?? fks) as any[]) console.log(`  ${r.child}: ${r.delete_rule}`);
  process.exit(0);
}
main().catch((e)=>{console.error(e);process.exit(1);});
