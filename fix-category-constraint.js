import { supabase } from './lib/supabaseClient.js';

async function fixCategoryConstraints() {
  try {
    console.log('Updating category constraints...');
    
    // Drop existing constraints
    console.log('Dropping existing constraints...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_in') THEN
                ALTER TABLE parcel_in DROP CONSTRAINT check_category_in;
            END IF;
            
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_out') THEN
                ALTER TABLE parcel_out DROP CONSTRAINT check_category_out;
            END IF;
        END $$;
      `
    });
    
    // Add new constraints with updated categories
    console.log('Adding new constraints with updated categories...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE parcel_in ADD CONSTRAINT check_category_in 
        CHECK (category IN (
            'Component', 
            'Product', 
            'Tool', 
            'Others',
            'Electronics',
            'Merchandise', 
            'Tools',
            'Components',
            'EROV PRODUCT',
            'JSUMO PRODUCT',
            'ZM ROBO PRODUCT'
        ));

        ALTER TABLE parcel_out ADD CONSTRAINT check_category_out 
        CHECK (category IN (
            'Component', 
            'Product', 
            'Tool', 
            'Others',
            'Electronics',
            'Merchandise', 
            'Tools',
            'Components',
            'EROV PRODUCT',
            'JSUMO PRODUCT',
            'ZM ROBO PRODUCT'
        ));
      `
    });
    
    console.log('✅ Category constraints updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating constraints:', error);
    
    // Try alternative approach using direct SQL
    console.log('Trying alternative approach...');
    
    try {
      const { error: altError } = await supabase
        .from('parcel_in')
        .select('category')
        .limit(1);
        
      if (altError) {
        console.log('Direct table access also failed:', altError);
      } else {
        console.log('Table access works, constraint issue may need manual fix');
      }
    } catch (altErr) {
      console.log('Alternative approach also failed:', altErr.message);
    }
  }
}

fixCategoryConstraints();
