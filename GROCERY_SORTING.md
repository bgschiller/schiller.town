# Grocery Sorting Feature

This feature uses Anthropic's Claude AI to automatically organize grocery lists by department (Produce, Dairy, Meat, Bakery, etc.) for easier shopping.

## Setup

### 1. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure the API Key

You need to set the `ANTHROPIC_API_KEY` environment variable for PartyKit.

#### For Local Development

Create a `.env` file in the root directory:

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

Then run:

```bash
npm run dev
```

#### For Production (PartyKit Deploy)

Set the environment variable using the PartyKit CLI:

```bash
npx partykit env add ANTHROPIC_API_KEY your-api-key-here
```

Then deploy:

```bash
npm run deploy
```

## How to Use

1. Open a document in the app
2. Create a list of grocery items:
   ```
   - Milk
   - Apples
   - Chicken breast
   - Bread
   - Yogurt
   - Bananas
   - Orange juice
   - Frozen pizza
   ```
3. Select the list items you want to organize
4. Click the "🗂️ Organize List" button that appears in the bubble menu
5. The items will be automatically reorganized by department with headers

Example output:

```
## Produce
- Apples
- Bananas

## Dairy
- Milk
- Yogurt

## Meat
- Chicken breast

## Bakery
- Bread

## Beverages
- Orange juice

## Frozen Foods
- Frozen pizza
```

## Fallback Behavior

If the Anthropic API key is not configured or if there's an error calling the API, the system will fall back to a keyword-based categorization system. This fallback uses a comprehensive database of 2000+ common grocery items organized by department.

The fallback system:

- Matches items using keyword recognition across 15+ departments
- Prioritizes longer, more specific keyword matches (e.g., "orange juice" over "orange")
- Provides good categorization accuracy even without the LLM
- Ensures the feature continues to work reliably without an API key

**Departments supported by the fallback:**

- Produce
- Meat & Seafood
- Dairy & Eggs
- Bakery
- Deli & Prepared Foods
- Frozen Foods
- Beverages
- Canned & Jarred Goods
- Pantry & Dry Goods
- Condiments & Sauces
- Spices & Seasonings
- Health & Wellness
- Baby & Infant
- Household & Cleaning
- Personal Care
- Pet Supplies

## Cost Considerations

The feature uses Claude 3.5 Haiku, which is Anthropic's fastest and most cost-effective model:

- Very low cost per request (fraction of a cent per grocery list)
- Fast response times
- Excellent categorization accuracy

Typical usage for a household should cost less than $1/month.

## Technical Details

- **Model**: `claude-3-5-haiku-20241022`
- **Temperature**: 0.3 (for consistent categorization)
- **Max Tokens**: 2000
- **Implementation**: Unified categorization module (`party/grocery-categorizer.ts`)
  - Automatically chooses between AI and keyword-based categorization
  - AI categorization: Uses Anthropic Claude API when API key is provided
  - Fallback categorization: 2000+ keyword database with smart matching
- **API Integration**: Server-side in PartyKit worker (`party/documents.ts`)
