import './style.css'
import { PlainBudget } from './plainbudget.js'
import {
    DollarSign,
    Briefcase,
    Home,
    Users,
    ShoppingCart,
    Utensils,
    Car,
    Phone,
    Wifi,
    Zap,
    Droplets,
    Shield,
    Heart,
    PawPrint,
    Scissors,
    Coffee,
    Calculator,
    Trash2,
    Package,
    CircleDollarSign,
    Beer,
    createIcons
} from 'lucide'

// Tauri imports (check if we're running in Tauri)
let tauriAPI = null;
let isInTauri = false;
if (window.__TAURI__) {
    tauriAPI = window.__TAURI__;
    isInTauri = true;
}

// Remove sampleBudget definition, always load local budget by default

class BudgetViewer {
    constructor() {
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            configButton: document.getElementById('configButton'),
            configModal: document.getElementById('configModal'),
            closeModal: document.getElementById('closeModal'),
            defaultPath: document.getElementById('defaultPath'),
            loadFromPath: document.getElementById('loadFromPath'),
            pathStatus: document.getElementById('pathStatus'),
            budgetOutput: document.getElementById('budgetOutput'),
            statsContainer: document.getElementById('statsContainer'),
            statsOutput: document.getElementById('statsOutput')
        }

        this.currentBudget = null
        this.statsVisible = true // Show stats by default

        // Default budget file path - can be configured
        this.defaultBudgetPath = './sample-budget.pb'

        // Load saved path from localStorage if available
        this.loadSavedConfiguration()

        // Icon mapping system - store icon names instead of components
        this.iconMap = new Map([
            // Income/Money related
            ['income', 'DollarSign'],
            ['salary', 'DollarSign'],
            ['wage', 'DollarSign'],
            ['money', 'CircleDollarSign'],
            ['royalties', 'Music'],
            ['spotify', 'Music'],
            ['patreon', 'Heart'],
            ['kofi', 'Coffee'],
            ['bandcamp', 'Music'],

            // Personal names/people
            ['people', 'Users'],

            // Business
            ['business', 'Briefcase'],
            ['office', 'Briefcase'],
            ['work', 'Briefcase'],
            ['pension', 'Briefcase'],
            ['capital', 'Briefcase'],

            // Housing & Utilities
            ['rent', 'Home'],
            ['bills', 'Home'],
            ['household', 'Home'],
            ['electricity', 'Zap'],
            ['electric', 'Zap'],
            ['power', 'Zap'],
            ['water', 'Droplets'],
            ['internet', 'Wifi'],
            ['wifi', 'Wifi'],
            ['broadband', 'Wifi'],
            ['insurance', 'Shield'],
            ['council', 'Home'],
            ['ground', 'Home'],
            ['building', 'Home'],
            ['cloud', 'Wifi'],
            ['netflix', 'Tv'],
            ['streaming', 'Tv'],
            ['beer', 'beer'],
            ['Pub', 'beer'],

            // Food & Groceries
            ['food', 'Utensils'],
            ['groceries', 'ShoppingCart'],
            ['sundries', 'ShoppingCart'],
            ['meals', 'Package'],
            ['milk', 'Package'],
            ['shop', 'ShoppingCart'],

            // Personal Care
            ['personal', 'Heart'],
            ['haircuts', 'Scissors'],
            ['haircut', 'Scissors'],
            ['barber', 'Scissors'],
            ['toothpaste', 'Package'],

            // Pets
            ['cat', 'PawPrint'],
            ['pet', 'PawPrint'],
            ['dog', 'PawPrint'],
            ['litter', 'PawPrint'],

            // Transport
            ['car', 'Car'],
            ['transport', 'Car'],
            ['fuel', 'Car'],
            ['petrol', 'Car'],
            ['diesel', 'Car'],

            // Technology & Communication
            ['phone', 'Phone'],
            ['mobile', 'Phone'],
            ['smartphone', 'Phone'],
            ['cell', 'Phone'],

            // Utilities/Household items
            ['bin', 'Trash2'],
            ['waste', 'Trash2'],
            ['garden', 'Trash2'],
            ['rubbish', 'Trash2'],
            ['washing', 'Package'],
            ['toilet', 'Package'],
            ['laundy', 'Package'], // keeping typo from budget
            ['laundry', 'Package'],
            ['dishwasher', 'Package'],
            ['cleaning', 'Package'],
            ['detergent', 'Package'],
            ['tablets', 'Package'],
            ['roll', 'Package'],
            ['bio', 'Package'],

            // Food & Drinks
            ['beer', 'Beer'],
            ['wine', 'Wine'],
            ['alcohol', 'Beer'],
            ['drinks', 'Coffee'],
        ])

        this.init()
    }

    loadSavedConfiguration() {
        // Try to load saved path from localStorage
        const savedPath = localStorage.getItem('plainbudget-default-path')
        if (savedPath) {
            this.defaultBudgetPath = savedPath
            this.elements.defaultPath.value = savedPath
        } else {
            this.elements.defaultPath.value = this.defaultBudgetPath
        }
    }

    openModal() {
        this.elements.configModal.classList.remove('hidden')
        // Focus on the input field
        setTimeout(() => {
            this.elements.defaultPath.focus()
        }, 100)
    }

    closeModal() {
        this.elements.configModal.classList.add('hidden')
    }

    saveConfiguration() {
        const newPath = this.elements.defaultPath.value.trim()
        if (newPath) {
            this.defaultBudgetPath = newPath
            localStorage.setItem('plainbudget-default-path', newPath)
        }
    }

    init() {
        this.elements.fileInput.addEventListener('change', this.handleFileLoad.bind(this))
        this.elements.loadFromPath.addEventListener('click', this.loadFromCustomPath.bind(this))

        // Modal controls
        this.elements.configButton.addEventListener('click', this.openModal.bind(this))
        this.elements.closeModal.addEventListener('click', this.closeModal.bind(this))
        this.elements.configModal.addEventListener('click', (e) => {
            if (e.target === this.elements.configModal) {
                this.closeModal()
            }
        })

        // Auto-save configuration when path changes
        this.elements.defaultPath.addEventListener('change', this.saveConfiguration.bind(this))
        this.elements.defaultPath.addEventListener('blur', this.saveConfiguration.bind(this))

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.configModal.classList.contains('hidden')) {
                this.closeModal()
            }
        })

        // Always try to load the default budget file on startup
        this.loadDefaultBudget()

        // Show stats section by default
        this.elements.statsContainer.classList.remove('hidden')
        this.elements.statsContainer.classList.add('xl:block')
    }

    showPathStatus(success, message = '') {
        const statusEl = this.elements.pathStatus
        if (success) {
            statusEl.innerHTML = `
                <span class="inline-flex items-center px-3 py-1 rounded-full text-green-800 bg-green-100">
                    ✓ Loaded successfully
                </span>
            `
            statusEl.classList.remove('hidden')
            // Hide after 3 seconds
            setTimeout(() => {
                statusEl.classList.add('hidden')
            }, 3000)
        } else {
            statusEl.innerHTML = `
                <span class="inline-flex items-center px-3 py-1 rounded-full text-red-800 bg-red-100">
                    ✗ Failed to load
                </span>
            `
            statusEl.classList.remove('hidden')
            // Hide after 5 seconds for errors
            setTimeout(() => {
                statusEl.classList.add('hidden')
            }, 5000)
        }
    }

    async loadFromCustomPath() {
        // Save the current configuration first
        this.saveConfiguration()

        // Then try to load from the configured path
        await this.loadDefaultBudget()

        // Close modal on successful load (status will be shown briefly)
        setTimeout(() => {
            this.closeModal()
        }, 1500)
    }

    async loadDefaultBudget() {
        try {
            let content;

            if (isInTauri) {
                // Use Tauri filesystem API
                const { readTextFile } = tauriAPI.fs;
                content = await readTextFile(this.defaultBudgetPath);
            } else {
                // In web mode, we can only fetch files from the web server
                // If the path looks like a web path, try to fetch it
                let fetchPath = this.defaultBudgetPath;
                if (!fetchPath.startsWith('/') && !fetchPath.startsWith('http')) {
                    // Convert relative paths to web paths
                    fetchPath = '/' + fetchPath.replace('./', '');
                }

                const response = await fetch(fetchPath)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                content = await response.text()
            }

            this.processBudget(content)
            this.showPathStatus(true)
        } catch (error) {
            console.error('Could not load default budget file:', error)
            this.showPathStatus(false)
            this.showError(`Could not load budget file: "${this.defaultBudgetPath}". ${isInTauri ? 'Please check the file path exists.' : 'In web mode, only files served by the web server can be loaded.'} You can use the file picker to load any budget file.`)
        }
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
            this.showError('Could not load budget.pb file. Please use the file picker to load a budget.')
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

    processBudget(source) {
        try {
            this.currentBudget = new PlainBudget(source)
            const result = this.currentBudget.process()
            this.renderBudgetTable(this.currentBudget.blocks)

            // Compute stats and always render them
            this.currentBudget.computeStats()
            this.renderStats()
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
                        const iconName = this.getIconForLabel(cleanLabel)

                        // Check if this is an Income group for special styling
                        const isIncomeGroup = cleanLabel && cleanLabel.toLowerCase().includes('income')
                        const textColorClass = isIncomeGroup ? 'text-emerald-700' : 'text-gray-900'
                        const badgeColorClass = isIncomeGroup ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'

                        row.innerHTML = `
              <td class="px-6 py-5 text-left">
                <div class="flex items-center">
                  <div class="w-6 h-6 mr-3 ${isIncomeGroup ? 'text-emerald-500' : 'text-blue-500'}">${this.createIconElement(iconName, 24)}</div>
                  <span class="text-lg font-bold ${textColorClass}">${cleanLabel || ''}</span>
                </div>
              </td>
              <td class="px-6 py-5 text-right">
                <span class="inline-flex items-center px-4 py-2 rounded-xl ${badgeColorClass} text-lg font-mono font-bold">
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
                            const itemIconName = this.getIconForLabel(cleanLabel)

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
                <td class="px-6 py-3 text-left text-gray-700 font-medium">
                  <div class="flex items-center">
                    <div class="w-4 h-4 mr-3 text-gray-500">${this.createIconElement(itemIconName, 16)}</div>
                    <span>${displayLabel}</span>
                  </div>
                </td>
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

    getIconForLabel(label) {
        if (!label) return 'Circle' // simple fallback icon

        const normalizedLabel = label.toLowerCase()

        // Check for exact matches or partial matches
        for (const [keyword, iconName] of this.iconMap) {
            if (normalizedLabel.includes(keyword)) {
                return iconName
            }
        }

        // Smart fallbacks based on common patterns
        if (normalizedLabel.includes('tax') || normalizedLabel.includes('council') || normalizedLabel.includes('rates')) {
            return 'Home'
        }

        if (normalizedLabel.includes('subscription') || normalizedLabel.includes('membership') || normalizedLabel.includes('premium')) {
            return 'CreditCard'
        }

        if (normalizedLabel.includes('health') || normalizedLabel.includes('medical') || normalizedLabel.includes('doctor') || normalizedLabel.includes('pharmacy')) {
            return 'Heart'
        }

        if (normalizedLabel.includes('gym') || normalizedLabel.includes('fitness') || normalizedLabel.includes('sport')) {
            return 'Activity'
        }

        if (normalizedLabel.includes('entertainment') || normalizedLabel.includes('cinema') || normalizedLabel.includes('movie') || normalizedLabel.includes('theatre')) {
            return 'Film'
        }

        if (normalizedLabel.includes('book') || normalizedLabel.includes('magazine') || normalizedLabel.includes('newspaper') || normalizedLabel.includes('education')) {
            return 'BookOpen'
        }

        if (normalizedLabel.includes('gift') || normalizedLabel.includes('present') || normalizedLabel.includes('birthday')) {
            return 'Gift'
        }

        if (normalizedLabel.includes('repair') || normalizedLabel.includes('maintenance') || normalizedLabel.includes('service')) {
            return 'Wrench'
        }

        // Default fallback for anything we don't recognize
        return 'Circle'
    }

    createIconElement(iconName, size = 24) {
        // Create SVG element manually for Lucide icons
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', size.toString())
        svg.setAttribute('height', size.toString())
        svg.setAttribute('viewBox', '0 0 24 24')
        svg.setAttribute('fill', 'none')
        svg.setAttribute('stroke', 'currentColor')
        svg.setAttribute('stroke-width', '2')
        svg.setAttribute('stroke-linecap', 'round')
        svg.setAttribute('stroke-linejoin', 'round')

        // Get the icon's path data
        const iconPaths = this.getIconPath(iconName)
        if (iconPaths) {
            svg.innerHTML = iconPaths
        }

        return svg.outerHTML
    }

    getIconPath(iconName) {
        const paths = {
            'DollarSign': '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
            'Briefcase': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
            'Home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline>',
            'Users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
            'ShoppingCart': '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>',
            'Utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"></path>',
            'Car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10V6l-2-4H8L6 6v4l-2.5 1.1c-.8.2-1.5 1-1.5 1.9v3c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle>',
            'Phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>',
            'Wifi': '<path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>',
            'Zap': '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon>',
            'Droplets': '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2.04 4.6 4.14 6.09A5.11 5.11 0 0 1 20 14c0 .75-.22 1.46-.61 2.06"></path>',
            'Shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
            'Heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
            'PawPrint': '<circle cx="11" cy="4" r="2"></circle><circle cx="18" cy="8" r="2"></circle><circle cx="20" cy="16" r="2"></circle><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"></path>',
            'Scissors': '<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line>',
            'Coffee': '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>',
            'Calculator': '<rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="16" y2="14"></line><line x1="8" y1="18" x2="16" y2="18"></line>',
            'Trash2': '<polyline points="3,6 5,6 21,6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
            'Package': '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
            'CircleDollarSign': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="18"></line><path d="M16 10a4 4 0 0 0-8 0c0 1 0 2 1 3h6c1-1 1-2 1-3z"></path><path d="M8 14a4 4 0 0 0 8 0"></path>',
            'Tv': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
            'Circle': '<circle cx="12" cy="12" r="10"></circle>',
            'CreditCard': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
            'Activity': '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>',
            'Film': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><circle cx="12" cy="10" r="3"></circle>',
            'BookOpen': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
            'Gift': '<polyline points="20,12 20,22 4,22 4,12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>',
            'Wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
            'Music': '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>',
            'Beer': '<path d="M17 11h1a3 3 0 0 1 0 6h-1M5 9v10a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V9M5 9l1-6h12l1 6M5 9h12"></path>',
            'Wine': '<path d="M12 8V1l4 4H8l4-4v7M8 8l2 14h4l2-14M5 8h14"></path>'
        }

        return paths[iconName] || paths['Circle'] // Default fallback is a simple circle
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

        // Check if the value is a whole number (calculated total)
        if (Number.isInteger(value)) {
            return new Intl.NumberFormat('en-GB', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value)
        }

        // For non-whole numbers (individual items), show up to 2 decimal places
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
