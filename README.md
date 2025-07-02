
<img src="https://github.com/user-attachments/assets/1fa28cd2-230f-47f2-92bb-8b8b4c70ba4f" width="128px">

# PlainBudget

Minimalist plain text budgeting, forked for additonal features like division and decimals

[**Read the blog post.**](https://hire.jonasgalvez.com.br/2025/may/8/plainbudget)

[**Get the app.**](https://plainbudget.com/)

```
% npm i pbudget -g
% pbudget -s Budget.txt
% pbudget --stats Budget.txt
% cat Budget.txt | pbudget > Budget.txt
```

## Supported Syntax

- **Groups** start with `=` and are used to group values.

- **Flows** start with `+` and are used to express cash flow.

- **Groups** can be referenced in other groups or flows.

- **Multipliers** can be added to any referenced group or value using `x`.

- **Dividers** can be added to any referenced group or value using `/`.

- **Combined Operations** support complex calculations like `/ 13 x 4` (divide by 13, then multiply by 4).

- **Time-based Intervals** use `@` syntax for natural time expressions:
  - `@13weeks` - every 13 weeks 
  - `@6months` - every 6 months
  - `@1year` - annually
  - `@30days` - every 30 days
  - Can be combined with multipliers: `@13weeks x 4`

- **Decimal Values** are fully supported (e.g., `2.50`, `19.20`, `13.5`).

- Blocks of text with invalid syntax will be ignored and remain intact in the source.

- Circular dependencies (group references) will cause both groups to be ignored.

- Padding is automatically added to the value column.

### Syntax Examples

| Expression | Meaning | Example |
|------------|---------|---------|
| `x 4` | Multiply by 4 | `20 Coffee x 4` = 80 |
| `/ 12` | Divide by 12 | `1200 Annual / 12` = 100 |
| `/ 13 x 4` | Divide by 13, then multiply by 4 | `75 Quarterly / 13 x 4` = 23.08 |
| `@13weeks` | Every 13 weeks (quarterly) | `300 Insurance @13weeks` = 69.23/month |
| `@6months x 2` | Every 6 months, twice per year | `200 Service @6months x 2` = 66.67/month |
| `@1year` | Annually | `500 Subscription @1year` = 41.67/month |

<table>
<tr>
<td valign=top>

**Input**

```
= Main
- 2000 Rent / 2
- 1000 Utilities
- 500 Leisure

= Groceries
- 10.50 Coffee x 12
- 3.75 Milk x 12
- 20 Cereal x 6

= Subscriptions / 12
- 120 Netflix
- 60 Spotify
- 200 Software License

= Quarterly Costs / 13 x 4
- 300 Insurance
- 150 Car Service

= Annual Expenses @1year
- 500 Domain
- 1200 Hosting

= Income
- 5000 Salary
- 1000 Side hustle

+ Income
- Main
- Groceries
- Subscriptions
- Quarterly Costs
- Annual Expenses
```

</td>
<td valign=top>

**Output**

```
  = 2500 Main
  - 2000 Rent / 2
  - 1000 Utilities
  -  500 Leisure
  
  =  165 Groceries
  -   10.50 Coffee x 12
  -    3.75 Milk x 12
  -   20 Cereal x 6
  
  =   32 Subscriptions / 12
  -  120 Netflix
  -   60 Spotify
  -  200 Software License
  
  =  138 Quarterly Costs / 13 x 4
  -  300 Insurance
  -  150 Car Service
  
  =  142 Annual Expenses @1year
  -  500 Domain
  - 1200 Hosting
  
  = 6000 Income
  - 5000 Salary
  - 1000 Side hustle
  
  + 6000 Income
  - 2500 Main
  -  165 Groceries
  -   32 Subscriptions
  -  138 Quarterly Costs
  -  142 Annual Expenses
  = 3023 
```

</td>
</tr>
</table>

## Programmatic Usage

```js
import { readFileSync } from 'node:fs'
import { PlainBudget } from 'pbudget'

const budget = readFileSync('Budget.txt', 'utf8')

const pbudget = new PlainBudget(budget)

pbudget.process()

console.log(pbudget.renderWithPadding())

pbudget.computeStats()

console.log(pbudget.stats)
```
