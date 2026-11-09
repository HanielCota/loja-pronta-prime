/** Used only to deny the retired credential and identify affected accounts during rollout. */
export const RETIRED_STUDENT_PASSWORD = 'loja1234';

export function isRetiredStudentPassword(password: string) {
  return password.normalize('NFKC') === RETIRED_STUDENT_PASSWORD;
}
