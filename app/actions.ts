'use server'

import { checkVencimientos } from '@/lib/checkVencimientos'

export async function runCheckAction() {
  return await checkVencimientos()
}
