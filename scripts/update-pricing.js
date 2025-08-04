#!/usr/bin/env node

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
      process.env[key] = values.join('=');
    }
  });
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function updatePricingData() {
  try {
    console.log('🔄 Fetching pricing data from Stripe...');
    
    // Get Stripe price IDs from environment
    const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
    const unlimitedPriceId = process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID;
    
    if (!starterPriceId || !unlimitedPriceId) {
      throw new Error('Missing Stripe price IDs in environment variables');
    }
    
    // Fetch price data from Stripe
    const [starterPrice, unlimitedPrice] = await Promise.all([
      stripe.prices.retrieve(starterPriceId),
      stripe.prices.retrieve(unlimitedPriceId)
    ]);
    
    console.log('💰 Starter price from Stripe:', starterPrice.unit_amount / 100);
    console.log('💰 Unlimited price from Stripe:', unlimitedPrice.unit_amount / 100);
    
    // Load existing pricing data
    const pricingPath = path.join(__dirname, '../data/pricing.json');
    const pricingData = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));
    
    // Update with real Stripe data
    pricingData.plans.starter.price = starterPrice.unit_amount / 100;
    pricingData.plans.starter.stripePriceId = starterPriceId;
    
    pricingData.plans.unlimited.price = unlimitedPrice.unit_amount / 100;
    pricingData.plans.unlimited.stripePriceId = unlimitedPriceId;
    
    // Update limits from environment variables
    pricingData.plans.free.monthlyLimit = parseInt(process.env.FREE_MONTHLY_LIMIT || '10');
    pricingData.plans.starter.monthlyLimit = parseInt(process.env.STARTER_MONTHLY_LIMIT || '100');
    
    // Save updated data
    fs.writeFileSync(pricingPath, JSON.stringify(pricingData, null, 2));
    
    console.log('✅ Pricing data updated successfully!');
    console.log(`📊 Free: ${pricingData.plans.free.monthlyLimit} resumes/month`);
    console.log(`📊 Starter: $${pricingData.plans.starter.price}/month - ${pricingData.plans.starter.monthlyLimit} resumes/month`);
    console.log(`📊 Unlimited: $${pricingData.plans.unlimited.price}/month - unlimited resumes`);
    
  } catch (error) {
    console.error('❌ Error updating pricing data:', error.message);
    process.exit(1);
  }
}

updatePricingData();