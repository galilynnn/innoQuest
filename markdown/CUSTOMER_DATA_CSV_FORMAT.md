# Customer Data CSV Format

## Required Column Names (Case-Sensitive)

Your CSV file **must** have these exact column names:

| Column Name | Type | Range | Description |
|-------------|------|-------|-------------|
| `Health` | Decimal | 0-10 | Customer's health consciousness score |
| `Sustainability` | Decimal | 0-10 | Customer's sustainability preference score |
| `Brand Loyalty` | Decimal | 0-10 | Customer's brand loyalty score |
| `Experimental Food` | Decimal | 0-10 | Customer's experimental food interest score |
| `Income` | Decimal | > 0 | Customer's income (any positive number) |

## Example CSV Structure

```csv
Health,Sustainability,Brand Loyalty,Experimental Food,Income
8.5,7.2,6.8,9.1,75000
6.3,8.9,7.5,5.4,52000
9.0,6.5,8.2,7.8,98000
5.7,9.3,6.1,8.6,45000
7.8,7.7,9.2,6.3,110000
```

## Sample Data Generation

Here's a Python script to generate sample customer data:

```python
import random
import csv

def generate_customer_data(num_customers=10000):
    """Generate sample customer data with random attributes"""
    
    customers = []
    
    for i in range(num_customers):
        customer = {
            'Health': round(random.uniform(0, 10), 1),
            'Sustainability': round(random.uniform(0, 10), 1),
            'Brand Loyalty': round(random.uniform(0, 10), 1),
            'Experimental Food': round(random.uniform(0, 10), 1),
            'Income': random.randint(20000, 150000)
        }
        customers.append(customer)
    
    return customers

# Generate data
customers = generate_customer_data(10000)

# Save to CSV
with open('customer_data.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['Health', 'Sustainability', 'Brand Loyalty', 'Experimental Food', 'Income'])
    writer.writeheader()
    writer.writerows(customers)

print(f"Generated {len(customers)} customer records")
```

## Data Guidelines

### Attribute Scores (0-10 scale)
- **0-3:** Low interest/preference
- **4-6:** Moderate interest/preference
- **7-8:** High interest/preference
- **9-10:** Very high interest/preference

### Income Distribution
- **Low income:** $20,000 - $40,000
- **Middle income:** $40,000 - $80,000
- **High income:** $80,000 - $120,000
- **Very high income:** $120,000+

### Realistic Distribution Tips
For more realistic data:
- Use normal distribution for most attributes (mean around 5-6)
- Income should have right-skewed distribution (more low/middle income)
- Add some correlation between attributes (e.g., high sustainability → high health)

## Advanced Sample Generator (More Realistic)

```python
import numpy as np
import pandas as pd

def generate_realistic_customer_data(num_customers=10000):
    """Generate more realistic customer data with correlations"""
    
    np.random.seed(42)  # For reproducibility
    
    # Generate base attributes with normal distribution
    health = np.clip(np.random.normal(5.5, 2.0, num_customers), 0, 10)
    sustainability = np.clip(np.random.normal(5.0, 2.2, num_customers), 0, 10)
    brand_loyalty = np.clip(np.random.normal(6.0, 1.8, num_customers), 0, 10)
    experimental = np.clip(np.random.normal(5.5, 2.5, num_customers), 0, 10)
    
    # Add correlation: high health → higher sustainability
    sustainability = np.clip(sustainability + (health - 5) * 0.3, 0, 10)
    
    # Income with log-normal distribution (realistic income distribution)
    income = np.random.lognormal(mean=11, sigma=0.5, size=num_customers)
    income = np.clip(income, 20000, 200000)
    
    # Create DataFrame
    df = pd.DataFrame({
        'Health': np.round(health, 1),
        'Sustainability': np.round(sustainability, 1),
        'Brand Loyalty': np.round(brand_loyalty, 1),
        'Experimental Food': np.round(experimental, 1),
        'Income': np.round(income, 0).astype(int)
    })
    
    # Save to CSV
    df.to_csv('customer_data_realistic.csv', index=False)
    
    print(f"Generated {len(df)} customer records")
    print("\nData Summary:")
    print(df.describe())
    
    return df

# Generate realistic data
df = generate_realistic_customer_data(10000)
```

## Upload Instructions

1. **Prepare CSV File:**
   - Ensure column names match exactly (case-sensitive)
   - No extra columns (system will ignore them)
   - No missing values (use 0 as default if needed)
   - Save with UTF-8 encoding

2. **Upload via Admin Dashboard:**
   - Navigate to Admin Dashboard → Customer Data Management
   - Click "Choose File" button
   - Select your CSV file
   - Click "Upload" button
   - Wait for confirmation message

3. **Activate Dataset:**
   - Find your uploaded file in the history list
   - Click "Use" button to make it active
   - Only one dataset can be active per game
   - Active dataset is used for all probability calculations

## Validation

After upload, the system will:
- ✅ Count total records
- ✅ Parse CSV data into JSON format
- ✅ Store in `customer_data_sets` table
- ✅ Display record count and filename

To verify manually:
```sql
SELECT 
    file_name,
    record_count,
    is_active,
    jsonb_array_length(csv_data) as actual_count
FROM customer_data_sets
WHERE game_id = 'your-game-id';
```

## Common Issues

### Issue: Column not found errors
**Cause:** Column names don't match exactly  
**Fix:** Check spelling and capitalization (must be exact)

### Issue: Invalid values
**Cause:** Non-numeric values in numeric columns  
**Fix:** Ensure all values are numbers (no text, no empty cells)

### Issue: Missing customers
**Cause:** CSV parsing errors (wrong delimiter, encoding issues)  
**Fix:** 
- Use comma (`,`) as delimiter
- Save with UTF-8 encoding
- Remove special characters from data

### Issue: Upload succeeds but probabilities fail
**Cause:** Column names mismatch in PostgreSQL function  
**Fix:** 
- Verify CSV columns match exactly: `Health`, `Sustainability`, `Brand Loyalty`, `Experimental Food`, `Income`
- Check function code in script 20 uses same column names

## Testing Your CSV

Before uploading to production, test with a small sample:

```csv
Health,Sustainability,Brand Loyalty,Experimental Food,Income
5.0,5.0,5.0,5.0,50000
```

Upload this minimal file first to verify the system works, then upload your full dataset.

## Performance Notes

- **Small datasets** (< 1,000 customers): Instant upload and calculation
- **Medium datasets** (1,000 - 10,000): < 5 seconds
- **Large datasets** (10,000 - 50,000): < 30 seconds
- **Very large** (> 50,000): May need optimization

Recommended size: **10,000 - 20,000** customers for balance between realism and performance.
