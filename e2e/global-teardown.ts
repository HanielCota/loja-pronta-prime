import { removeStudents, RUN_FILTER, runPattern } from './support/cleanup';
import { closeDatabase, runId } from './support/students';

/** Remove as alunas desta execução e os logos delas no bucket. */
export default async function globalTeardown() {
  await removeStudents(RUN_FILTER, [runPattern(runId())]);
  await closeDatabase();
}
