import './style.css'
import { PlainBudget } from './plainbudget.js'

// Remove sampleBudget definition, always load local budget by default

class BudgetViewer {
    constructor() {
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            loadBudget: document.getElementById('loadBudget'),
            loadSample: document.getElementById('loadSample'),
            toggleStats: document.getElementById('toggleStats'),
            budgetOutput: document.getElementById('budgetOutput'),
            statsContainer: document.getElementById('statsContainer'),
            statsOutput: document.getElementById('statsOutput')
        }

        this.currentBudget = null
        this.statsVisible = true // Show stats by default

        this.init()
    }

    init() {
        this.elements.fileInput.addEventListener('change', this.handleFileLoad.bind(this))
        this.elements.loadBudget.addEventListener('click', this.loadLocalBudget.bind(this))
        this.elements.loadSample.addEventListener('click', this.loadSample.bind(this))
        this.elements.toggleStats.addEventListener('click', this.toggleStats.bind(this))

        // Always load local budget.pb on startup
        this.loadLocalBudget()
        // Show stats section by default
        this.elements.statsContainer.classList.remove('hidden')
        this.elements.statsContainer.classList.add('xl:block')
        this.elements.toggleStats.textContent = 'Hide Stats'
    }

    async loadLocalBudget() {
        try {
            const response = await fetch('/budget.pb')
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const content = await response.text()
            this.processBudget(content)
        } catch (error) {
            console.error('Could not load local budget file:', error)
            this.showError('Could not load budget.pb file. Using sample data instead.')
            this.loadSample()
        }
    }

    async handleFileLoad(event) {
        const file = event.target.files[0]
        if (!file) return

        try {
            const content = await file.text()
            this.processBudget(content)
        } catch (error) {
            this.showError('Error reading file: ' + error.message)
        }
    }

    loadSample() {
        // Use a generic, non-sensitive sample budget
        const sampleBudget = `= Income x 1.0
- 1000 Main Job
- 500 Side Hustle
- 100 Other

= Savings
- 200 Emergency Fund
- 100 Retirement

= Expenses / 2
- 100 Utilities
- 50 Water
- 200 Rent
- 20 Insurance
- 50 Groceries
- 30 Internet
- 10 Streaming

= Personal
- 100 Hobbies
- 20 Haircuts

= Joint / 2
- 50 Pet
- 40 Food
- 60 Misc

= Business x 0.8
- 30 Office
- 10 Phone
- 100 Salary
- 40 Pension

+ Totals
+ Income
+ Savings
- Expenses
- Joint
- Business
- Personal`
        this.processBudget(sampleBudget)
    }

    processBudget(source) {
        try {
            this.currentBudget = new PlainBudget(source)
            const result = this.currentBudget.process()
            this.renderBudgetTable(this.currentBudget.blocks)

            // Compute stats for later use
            this.currentBudget.computeStats()

            if (this.statsVisible) {
                this.renderStats()
            }
        } catch (error) {
            this.showError('Error processing budget: ' + error.message)
        }
    }

    renderBudgetTable(blocks) {
        const container = this.elements.budgetOutput
        container.innerHTML = ''

        const table = document.createElement('table')
        table.className = 'w-full max-w-xl mx-auto' // Reduce width and center table

        blocks.forEach(block => {
            if (typeof block === 'string') {
                // Skip empty lines
                if (block.trim()) {
                    const row = document.createElement('tr')
                    row.className = 'budget-row'
                    row.innerHTML = `
            <td class="px-6 py-4 text-left text-gray-900 font-medium">${this.escapeHtml(block)}</td>
            <td class="px-6 py-4 text-right"></td>
          `
                    table.appendChild(row)
                }
            } else if (Array.isArray(block)) {
                // Create a group
                const groupDiv = document.createElement('tbody')
                groupDiv.className = 'budget-group'

                block.forEach((line, index) => {
                    const [type, value, label] = line
                    const row = document.createElement('tr')

                    // Insert a blank separator/header before cashflow summary lines if they are the first in the group and not a group header
                    if (index === 0 && (type === '+' || type === '-')) {
                        const separatorRow = document.createElement('tr')
                        separatorRow.className = 'budget-group-header'
                        separatorRow.innerHTML = `
                          <td colspan="2" class="px-6 py-5 font-bold">Cashflow</td>
                        `
                        groupDiv.appendChild(separatorRow)
                    }

                    // Only treat lines starting with '=' as group headers
                    if (index === 0 && type === '=') {
                        // Group header - more prominent styling
                        row.className = 'budget-group-header'
                        const cleanLabel = this.getCleanLabel(line)
                        row.innerHTML = `
              <td class="px-6 py-5 text-left">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span class="text-lg font-bold text-gray-900">${cleanLabel || ''}</span>
                </div>
              </td>
              <td class="px-6 py-5 text-right">
                <span class="inline-flex items-center px-4 py-2 rounded-xl bg-blue-100 text-blue-800 text-lg font-mono font-bold">
                  ${this.formatNumber(value)}
                </span>
              </td>
            `
                    } else {
                        // Regular row with clean styling
                        row.className = 'budget-row'

                        // Add flow classes for + and - operations
                        if (type === '+') {
                            row.classList.add('flow-positive')
                        } else if (type === '-') {
                            row.classList.add('flow-negative')
                        }

                        // Check if this is a result line (= with just a number)
                        if (type === '=' && (!label || label.trim() === '')) {
                            row.classList.add('flow-result')
                            row.innerHTML = `
                <td class="px-6 py-4 text-left">
                  <div class="flex items-center">
                    <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span class="text-base font-semibold text-blue-700">Total</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="inline-flex items-center px-3 py-1 rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-lg">
                    ${this.formatNumber(value)}
                  </span>
                </td>
              `
                        } else {
                            const cleanLabel = this.getCleanLabel(line)
                            // Remove the type symbol from display - we'll use colors and styling instead
                            let displayLabel = cleanLabel || ''
                            if (type === '+') {
                                displayLabel = displayLabel || 'Income'
                            } else if (type === '-') {
                                displayLabel = displayLabel || 'Expense'
                            }

                            let valueClass = 'text-emerald-600 font-semibold font-mono'
                            if (type === '-') {
                                valueClass = 'text-blue-600 font-semibold font-mono'
                            } else if (type === '+') {
                                valueClass = 'text-emerald-600 font-bold font-mono'
                            }

                            row.innerHTML = `
                <td class="px-6 py-3 text-left text-gray-700 font-medium">${displayLabel}</td>
                <td class="px-6 py-3 text-right ${valueClass}">${this.formatNumber(value)}</td>
              `
                        }
                    }

                    groupDiv.appendChild(row)
                })

                table.appendChild(groupDiv)
            }
        })

        container.appendChild(table)
    }

    getCleanLabel(line) {
        if (!this.currentBudget) return line[2] || ''

        // Use the budget's method to get clean labels
        const modifier = this.currentBudget.modifiers?.get(line)
        if (modifier) {
            const id = this.currentBudget.ids?.get(line)
            return id || line[2] || ''
        }
        return line[2] || ''
    }

    formatNumber(value) {
        if (value === null || value === undefined) return ''
        return new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value)
    }

    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    renderStats() {
        if (!this.currentBudget || !this.currentBudget.stats) return

        const stats = this.currentBudget.stats
        const container = this.elements.statsOutput
        container.innerHTML = ''

        // Projections with beautiful cards
        const projectionsSection = document.createElement('div')
        projectionsSection.className = 'mb-8'
        projectionsSection.innerHTML = '<h3 class="text-lg font-bold text-gray-900 mb-4">Financial Projections</h3>'

        const projections = [
            ['Monthly Savings', stats.projections.savings],
            ['6 Months', stats.projections.sixmonths],
            ['1 Year', stats.projections.oneyear],
            ['3 Years', stats.projections.threeyears],
            ['5 Years', stats.projections.fiveyears],
            ['10 Years', stats.projections.tenyears]
        ]

        projections.forEach(([label, value]) => {
            const item = document.createElement('div')
            item.className = 'projection-item'
            item.innerHTML = `
        <span class="text-sm font-medium text-gray-600">${label}</span>
        <span class="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-mono font-bold">
          ${this.formatCurrency(value)}
        </span>
      `
            projectionsSection.appendChild(item)
        })

        container.appendChild(projectionsSection)

        // Expense Distribution with modern progress bars
        if (stats.distribution && stats.distribution.length > 0) {
            const distributionSection = document.createElement('div')
            distributionSection.className = 'space-y-4'
            distributionSection.innerHTML = '<h3 class="text-lg font-bold text-gray-900 mb-4">Expense Breakdown</h3>'

            stats.distribution.slice(0, 8).forEach(([expense, percentage]) => {
                const item = document.createElement('div')
                item.className = 'space-y-2'

                item.innerHTML = `
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700">${expense}</span>
            <span class="text-sm font-mono font-semibold text-blue-600">${(percentage * 100).toFixed(1)}%</span>
          </div>
          <div class="distribution-bar w-full">
            <div class="distribution-fill" style="width: ${percentage * 100}%"></div>
          </div>
        `

                distributionSection.appendChild(item)
            })

            container.appendChild(distributionSection)
        }
    }

    toggleStats() {
        this.statsVisible = !this.statsVisible
        const container = this.elements.statsContainer

        if (this.statsVisible) {
            container.classList.remove('hidden')
            container.classList.add('xl:block')
            this.elements.toggleStats.textContent = 'Hide Stats'
        } else {
            container.classList.add('hidden')
            this.elements.toggleStats.textContent = 'Show Stats'
        }

        if (this.statsVisible && this.currentBudget) {
            this.renderStats()
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value)
    }

    showError(message) {
        const container = this.elements.budgetOutput
        container.innerHTML = `
      <div class="p-6 text-center">
        <div class="bg-red-50 border border-red-200 rounded-xl p-6">
          <div class="flex items-center justify-center mb-4">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-red-800">Error Loading Budget</h3>
            </div>
          </div>
          <p class="text-red-700">${message}</p>
        </div>
      </div>
    `
    }
}

// Initialize the app
new BudgetViewer()
