#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { PlainBudget } from './index.js'

const budgetsDir = resolve('./viewer/budget.pb')
const outputDir = resolve('/budgets')

// Create output directory if it doesn't exist
import { mkdirSync } from 'node:fs'
try {
    mkdirSync(outputDir, { recursive: true })
} catch (err) {
    // Directory already exists
}

console.log('📊 Processing all budget files...\n')

// Get all .pb files in budgets directory
const budgetFiles = readdirSync(budgetsDir).filter(file => file.endsWith('.pb'))

for (const file of budgetFiles) {
    const inputPath = resolve(budgetsDir, file)
    const outputPath = resolve(outputDir, `${basename(file, '.pb')}.pb`)

    try {
        console.log(`Processing ${file}...`)

        const budget = readFileSync(inputPath, 'utf8')
        const pbudget = new PlainBudget(budget)
        pbudget.process()
        const output = pbudget.renderWithPadding()

        writeFileSync(outputPath, output)
        console.log(`✅ Output written to ${basename(outputPath)}`)

        // Also compute and display stats
        pbudget.computeStats()
        if (pbudget.stats && Object.keys(pbudget.stats).length > 0) {
            console.log(`📈 Stats: ${JSON.stringify(pbudget.stats, null, 2)}`)
        }

    } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message)
    }

    console.log('')
}

console.log('🎉 Done processing all budget files!')
