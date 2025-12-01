# APIFeatures Class - Complete Usage Guide

## Overview

A powerful, chainable utility class for filtering, sorting, field selection, and pagination of array data with MongoDB-like query syntax.

## Installation & Setup

```typescript
import { APIFeatures } from "./utils/apiFeatures";

// In your controller
const features = new APIFeatures(dataArray, req.query)
  .filter()
  .sort()
  .limitFields()
  .paginate();

const results = features.data;
const pagination = features.getMetadata();
```

## Features & Usage

### 1. **Filtering**

#### Basic String Search (Contains - Case Insensitive)

```
GET /api/rules?name=Elasticsearch
// Returns items where name contains "Elasticsearch" (case-insensitive)
```

#### Multiple Values (OR Logic)

```
GET /api/rules?severity=warning,critical
// Returns items where severity is "warning" OR "critical"

GET /api/rules?name=CPU,Memory
// Returns items where name contains "CPU" OR "Memory"
```

#### Comparison Operators (Numbers)

```
GET /api/rules?duration=gte:5      // Greater than or equal to 5
GET /api/rules?duration=gt:5       // Greater than 5
GET /api/rules?duration=lte:10     // Less than or equal to 10
GET /api/rules?duration=lt:10      // Less than 10
```

#### Comparison Operators (ISO Dates)

```
GET /api/alerts?startsAt=gte:2025-11-07T09:00:00Z
// After or equal to this timestamp

GET /api/alerts?endsAt=lt:2025-11-07T17:00:00Z
// Before this timestamp
```

#### Range Queries (AND Logic)

```
GET /api/rules?duration=gte:5&duration=lte:10
// Between 5 and 10 (inclusive)

GET /api/alerts?startsAt=gte:2025-11-07T09:00:00Z&startsAt=lte:2025-11-07T17:00:00Z
// Within date range
```

#### Combining Multiple Filters (AND Logic)

```
GET /api/rules?severity=critical&state=firing&duration=gte:5
// severity=critical AND state=firing AND duration>=5
```

### 2. **Sorting**

#### Single Field

```
GET /api/rules?sort=name            // Ascending
GET /api/rules?sort=-name           // Descending (prefix with -)
```

#### Multiple Fields

```
GET /api/rules?sort=-severity,name
// Sort by severity DESC, then name ASC
```

### 3. **Field Selection**

```
GET /api/rules?fields=name,severity,state
// Only return specified fields
```

### 4. **Pagination**

```
GET /api/rules?page=2&limit=10
// Page 2, 10 items per page
```

**Default values:**

- `page`: 1
- `limit`: 100

### 5. **Metadata Response**

```typescript
{
  page: 2,              // Current page
  limit: 10,            // Items per page
  total: 45,            // Total filtered items
  totalPages: 5,        // Total pages
  hasNextPage: true,    // Has next page?
  hasPrevPage: true     // Has previous page?
}
```

## Complete Examples

### Example 1: Complex Query

```
GET /api/rules?severity=warning,critical&state=firing&duration=gte:5&duration=lte:60&sort=-severity&fields=name,severity,state&page=1&limit=20
```

This returns:

- Items with severity "warning" OR "critical"
- AND state is "firing"
- AND duration between 5 and 60
- Sorted by severity descending
- Only name, severity, and state fields
- First page with 20 items

### Example 2: Date Range

```
GET /api/alerts?startsAt=gte:2025-11-07T00:00:00Z&startsAt=lte:2025-11-07T23:59:59Z&sort=-startsAt&page=1&limit=50
```

Returns alerts that started within Nov 7, 2025, sorted newest first.

### Example 3: Partial Text Search with Pagination

```
GET /api/rules?name=Elastic&sort=name&page=1&limit=25
```

Returns first 25 rules where name contains "Elastic", sorted alphabetically.

## Controller Implementation

```typescript
import { APIFeatures } from "../utils/apiFeatures";

export const getItems = asyncHandler(async (req: Request, res: Response) => {
  // Get all data from service
  const allData = await service.getAllItems();

  // Apply features
  const features = new APIFeatures(allData, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const data = features.data;
  const metadata = features.getMetadata();

  return res.json({
    success: true,
    data,
    pagination: metadata,
  });
});
```

## Query Parameter Reference

| Parameter | Type   | Description                                        | Example                          |
| --------- | ------ | -------------------------------------------------- | -------------------------------- |
| `page`    | number | Page number (default: 1)                           | `page=2`                         |
| `limit`   | number | Items per page (default: 100)                      | `limit=20`                       |
| `sort`    | string | Sort fields (comma-separated, prefix `-` for DESC) | `sort=-name,severity`            |
| `fields`  | string | Fields to include (comma-separated)                | `fields=name,state`              |
| `{field}` | string | Filter by field (contains for strings)             | `name=CPU`                       |
| `{field}` | string | Multiple values (OR logic)                         | `severity=warning,critical`      |
| `{field}` | string | Comparison operators                               | `duration=gte:5`                 |
| `{field}` | array  | Range queries (AND logic)                          | `duration=gte:5&duration=lte:10` |

## Comparison Operators

| Operator | Description           | Example         | Matches      |
| -------- | --------------------- | --------------- | ------------ |
| `gte`    | Greater than or equal | `value=gte:10`  | value >= 10  |
| `gt`     | Greater than          | `value=gt:10`   | value > 10   |
| `lte`    | Less than or equal    | `value=lte:100` | value <= 100 |
| `lt`     | Less than             | `value=lt:100`  | value < 100  |

**Supported Types:**

- Numbers: Direct numeric comparison
- ISO Date Strings: Automatic timestamp comparison

## Logic Rules

### AND Logic (Between Different Fields)

```
?severity=critical&state=firing
// severity IS critical AND state IS firing
```

### OR Logic (Within Same Field - Comma Separated)

```
?severity=warning,critical
// severity IS warning OR critical
```

### AND Logic (Range on Same Field - Multiple Params)

```
?duration=gte:5&duration=lte:10
// duration >= 5 AND duration <= 10
```

### Combined Example

```
?severity=warning,critical&state=firing&duration=gte:5&duration=lte:60
// (severity=warning OR critical) AND state=firing AND (duration>=5 AND duration<=10)
```

## Key Features

✅ **Partial string matching** - Case-insensitive contains  
✅ **OR filtering** - Comma-separated values  
✅ **AND filtering** - Multiple query params  
✅ **Range queries** - Multiple operators on same field  
✅ **Date comparison** - ISO string support  
✅ **Number comparison** - gte, gt, lte, lt operators  
✅ **Multi-field sorting** - Ascending/descending  
✅ **Field selection** - Return only needed fields  
✅ **Pagination** - With metadata  
✅ **Chainable API** - Clean, readable code

## Best Practices

### 1. Always Chain in Order

```typescript
// ✅ Correct order
new APIFeatures(data, query)
  .filter() // 1. Filter first
  .sort() // 2. Sort filtered data
  .limitFields() // 3. Select fields
  .paginate(); // 4. Paginate last

// ❌ Wrong - pagination before filtering
new APIFeatures(data, query).paginate().filter();
```

### 2. Use Metadata for UI

```typescript
const { page, limit, total, totalPages, hasNextPage, hasPrevPage } =
  features.getMetadata();

// Frontend pagination UI
if (hasNextPage) {
  // Show "Next" button
}

// Display: "Showing 10 of 45 results"
```

### 3. Set Reasonable Defaults

```typescript
// In your controller, set max limits
const limit = Math.min(Number(req.query.limit) || 20, 100);
const sanitizedQuery = { ...req.query, limit };

const features = new APIFeatures(data, sanitizedQuery)
  .filter()
  .sort()
  .limitFields()
  .paginate();
```

### 4. Document Your API Endpoints

```typescript
/**
 * GET /api/rules
 *
 * Query Params:
 * - name: string (partial match)
 * - severity: string (warning, critical, info)
 * - state: string (firing, pending, inactive)
 * - duration: number (use gte:, gt:, lte:, lt:)
 * - sort: string (fields: name, severity, -duration)
 * - fields: string (available: name, severity, state, duration)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
```

## Common Use Cases

### Use Case 1: Search with Filters

```
GET /api/products?name=laptop&category=electronics,computers&price=gte:500&price=lte:2000&sort=-rating&page=1&limit=20
```

### Use Case 2: Time-Based Queries

```
GET /api/events?type=alert&createdAt=gte:2025-11-01T00:00:00Z&createdAt=lte:2025-11-30T23:59:59Z&sort=-createdAt
```

### Use Case 3: Dashboard Metrics

```
GET /api/metrics?status=active&value=gte:100&fields=name,value,status&sort=-value&limit=10
```

### Use Case 4: Admin List Views

```
GET /api/users?role=admin,moderator&status=active&sort=name&page=1&limit=50
```

## Notes

- All filters use **AND** logic between different fields
- Comma-separated values use **OR** logic within the same field
- Multiple query params with the same key use **AND** logic (for ranges)
- Pagination metadata reflects **filtered** count, not original count
- String filters are case-insensitive and use partial matching
- Date comparisons work with ISO 8601 format strings
- The `fields` parameter only returns specified fields from objects

## Troubleshooting

### Issue: No results returned

**Check:**

- Are your filter values correct?
- Is the field name spelled correctly?
- For strings, remember it uses partial matching (contains)

### Issue: Wrong sort order

**Solution:**

- Use `-` prefix for descending order
- Check field names are correct
- Example: `sort=-createdAt,name` (createdAt DESC, name ASC)

### Issue: Pagination shows wrong total

**Cause:** The `total` count reflects filtered data, not all data.  
**Solution:** This is by design - it shows how many items match your filters.

### Issue: Range query not working

**Solution:** Use the same parameter name twice:

```
✅ ?value=gte:5&value=lte:10
❌ ?value=gte:5,lte:10
```

## Migration from MongoDB Queries

If you're migrating from MongoDB:

| MongoDB                            | APIFeatures                 |
| ---------------------------------- | --------------------------- |
| `{ name: /pattern/i }`             | `?name=pattern`             |
| `{ value: { $gte: 5 } }`           | `?value=gte:5`              |
| `{ status: { $in: ['a', 'b'] } }`  | `?status=a,b`               |
| `{ value: { $gte: 5, $lte: 10 } }` | `?value=gte:5&value=lte:10` |
| `.sort({ name: 1, date: -1 })`     | `?sort=name,-date`          |
| `.select('name status')`           | `?fields=name,status`       |
| `.skip(10).limit(20)`              | `?page=2&limit=20`          |

---

**Version:** 1.0.0  
**Last Updated:** November 12, 2025
