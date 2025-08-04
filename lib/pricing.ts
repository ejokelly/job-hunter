import fs from 'fs';
import path from 'path';

interface PricingPlan {
  name: string;
  price: number;
  monthlyLimit: number | null;
  stripePriceId?: string | null;
  features: string[];
  upgradeToTier?: string;
}

interface PricingData {
  plans: {
    free: PricingPlan;
    starter: PricingPlan;
    unlimited: PricingPlan;
  };
}

let cachedPricingData: PricingData | null = null;

export function getPricingData(): PricingData {
  if (cachedPricingData) {
    return cachedPricingData;
  }
  
  try {
    const pricingPath = path.join(process.cwd(), 'data/pricing.json');
    const pricingData = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));
    cachedPricingData = pricingData;
    return pricingData;
  } catch (error) {
    console.error('Error loading pricing data:', error);
    // Fallback to hardcoded data if file doesn't exist
    return {
      plans: {
        free: {
          name: "Free",
          price: 0,
          monthlyLimit: 10,
          features: ["10 resumes per month", "10 cover letters per month"],
          upgradeToTier: "starter"
        },
        starter: {
          name: "Starter", 
          price: 25,
          monthlyLimit: 100,
          features: ["100 resumes per month", "100 cover letters per month"],
          upgradeToTier: "unlimited"
        },
        unlimited: {
          name: "Crazy Job Market",
          price: 250,
          monthlyLimit: null,
          features: ["Unlimited resume generations", "Unlimited cover letters"]
        }
      }
    };
  }
}

export function getPlanByTier(tier: string): PricingPlan | null {
  const pricing = getPricingData();
  return pricing.plans[tier as keyof typeof pricing.plans] || null;
}

export function getUpgradeInfo(currentTier: string): { tier: string; plan: PricingPlan } | null {
  const currentPlan = getPlanByTier(currentTier);
  if (!currentPlan?.upgradeToTier) {
    return null;
  }
  
  const upgradePlan = getPlanByTier(currentPlan.upgradeToTier);
  if (!upgradePlan) {
    return null;
  }
  
  return {
    tier: currentPlan.upgradeToTier,
    plan: upgradePlan
  };
}