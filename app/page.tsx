import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SignInPage } from '@/components/SignInPage'
import { Dashboard } from '@/components/Dashboard'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) return <SignInPage />
  return <Dashboard />
}
