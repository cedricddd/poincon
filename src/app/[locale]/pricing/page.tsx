import { auth } from '@/auth'
import { PricingPlans } from './PricingPlans'

export default async function PricingPage() {
  const session = await auth()
  return <PricingPlans isAuthenticated={!!session?.user} />
}
