// Test script to verify item code and product code constraint implementation
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

async function testItemCodeConstraint() {
  console.log('Testing item code constraints...\n');
  
  try {
    // Test 1: Try to insert duplicate item codes
    console.log('Test 1: Attempting to insert duplicate item codes...');
    
    // First item
    const { data: item1, error: error1 } = await supabase
      .from('parcel_in')
      .insert({
        name: 'Test Item 1',
        item_code: 'TEST001',
        quantity: 10,
        date: new Date().toISOString().split('T')[0],
        category: 'Component'
      })
      .select();
    
    if (error1) {
      console.log('❌ First item insertion failed:', error1.message);
    } else {
      console.log('✅ First item inserted successfully');
    }
    
    // Second item with same code
    const { data: item2, error: error2 } = await supabase
      .from('parcel_in')
      .insert({
        name: 'Test Item 2',
        item_code: 'TEST001', // Same code
        quantity: 5,
        date: new Date().toISOString().split('T')[0],
        category: 'Component'
      })
      .select();
    
    if (error2 && error2.message.includes('unique')) {
      console.log('✅ Duplicate item code correctly rejected:', error2.message);
    } else if (error2) {
      console.log('❌ Unexpected error for duplicate item code:', error2.message);
    } else {
      console.log('❌ Duplicate item code was not rejected - constraint may not be working');
    }
    
    // Test 2: Valid unique item
    console.log('\nTest 2: Inserting valid unique item...');
    
    const { data: item3, error: error3 } = await supabase
      .from('parcel_in')
      .insert({
        name: 'Test Item 3',
        item_code: 'TEST003',
        quantity: 15,
        date: new Date().toISOString().split('T')[0],
        category: 'Component'
      })
      .select();
    
    if (error3) {
      console.log('❌ Valid item insertion failed:', error3.message);
    } else {
      console.log('✅ Valid unique item inserted successfully');
    }

    // Cleanup item test data
    console.log('\nCleaning up item test data...');
    await supabase
      .from('parcel_in')
      .delete()
      .in('name', ['Test Item 1', 'Test Item 2', 'Test Item 3']);
    
  } catch (err) {
    console.error('❌ Item code test failed with error:', err.message);
  }
}

async function testProductCodeConstraint() {
  console.log('\n\nTesting product code constraints...\n');
  
  try {
    // Test 1: Try to insert duplicate product codes
    console.log('Test 1: Attempting to insert duplicate product codes...');
    
    // First product
    const { data: product1, error: error1 } = await supabase
      .from('product_in')
      .insert({
        product_name: 'Test Product 1',
        product_code: 'PRD001',
        quantity: 10,
        date: new Date().toISOString().split('T')[0],
        time_in: '10:00 AM',
        category: 'Product'
      })
      .select();
    
    if (error1) {
      console.log('❌ First product insertion failed:', error1.message);
    } else {
      console.log('✅ First product inserted successfully');
    }
    
    // Second product with same code
    const { data: product2, error: error2 } = await supabase
      .from('product_in')
      .insert({
        product_name: 'Test Product 2',
        product_code: 'PRD001', // Same code
        quantity: 5,
        date: new Date().toISOString().split('T')[0],
        time_in: '11:00 AM',
        category: 'Product'
      })
      .select();
    
    if (error2 && error2.message.includes('unique')) {
      console.log('✅ Duplicate product code correctly rejected:', error2.message);
    } else if (error2) {
      console.log('❌ Unexpected error for duplicate product code:', error2.message);
    } else {
      console.log('❌ Duplicate product code was not rejected - constraint may not be working');
    }
    
    // Test 2: Valid unique product
    console.log('\nTest 2: Inserting valid unique product...');
    
    const { data: product3, error: error3 } = await supabase
      .from('product_in')
      .insert({
        product_name: 'Test Product 3',
        product_code: 'PRD003',
        quantity: 15,
        date: new Date().toISOString().split('T')[0],
        time_in: '12:00 PM',
        category: 'Product'
      })
      .select();
    
    if (error3) {
      console.log('❌ Valid product insertion failed:', error3.message);
    } else {
      console.log('✅ Valid unique product inserted successfully');
    }

    // Cleanup product test data
    console.log('\nCleaning up product test data...');
    await supabase
      .from('product_in')
      .delete()
      .in('product_name', ['Test Product 1', 'Test Product 2', 'Test Product 3']);
    
    console.log('✅ Product code test completed');
    
  } catch (err) {
    console.error('❌ Product code test failed with error:', err.message);
  }
}

async function runAllTests() {
  console.log('🧪 Starting comprehensive code constraint tests...\n');
  
  await testItemCodeConstraint();
  await testProductCodeConstraint();
  
  console.log('\n🎉 All tests completed!');
}

// Run all tests
runAllTests().catch(console.error);
