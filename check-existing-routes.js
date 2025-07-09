#!/usr/bin/env node

/**
 * Check existing email routing rules in Cloudflare
 * This will show us what's already configured
 */

import { cloudflareService } from './server/services/cloudflareService.js';

async function checkExistingRoutes() {
  console.log('🔍 Checking existing email routing rules...');
  
  try {
    const response = await cloudflareService.getEmailRules();
    
    console.log('📋 Existing Email Routing Rules:');
    if (response && response.length > 0) {
      response.forEach((rule, index) => {
        console.log(`\n${index + 1}. ${rule.name || 'Unnamed Rule'}`);
        console.log(`   ID: ${rule.id}`);
        console.log(`   Enabled: ${rule.enabled}`);
        console.log(`   Created: ${rule.created || 'Unknown'}`);
        
        if (rule.matchers) {
          console.log('   Matchers:');
          rule.matchers.forEach(matcher => {
            console.log(`     - ${matcher.field}: ${matcher.value}`);
          });
        }
        
        if (rule.actions) {
          console.log('   Actions:');
          rule.actions.forEach(action => {
            console.log(`     - Type: ${action.type}`);
            if (action.value) console.log(`       Value: ${action.value}`);
            if (action.destinations) console.log(`       Destinations: ${action.destinations.join(', ')}`);
          });
        }
      });
    } else {
      console.log('   No email routing rules found');
    }
    
    console.log('\n✅ Analysis complete');
    
    // Check specifically for bryan@backstageos.com
    const bryanRule = response?.find(rule => 
      rule.matchers?.some(matcher => 
        matcher.value === 'bryan@backstageos.com'
      )
    );
    
    if (bryanRule) {
      console.log('\n🎯 Found rule for bryan@backstageos.com:');
      console.log(`   Status: ${bryanRule.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   Action: ${bryanRule.actions?.[0]?.type || 'Unknown'}`);
    } else {
      console.log('\n❌ No rule found for bryan@backstageos.com');
      console.log('   This confirms manual routing rule creation is needed');
    }
    
  } catch (error) {
    console.error('❌ Failed to check routing rules:', error);
    console.error('Error details:', error.message);
  }
}

checkExistingRoutes();