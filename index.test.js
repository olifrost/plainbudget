import { ok, deepEqual } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PlainBudget } from './index.js'

const root = import.meta.dirname

test('basic', () => {
  const { input, output } = loadFixture('basic')
  const pb = new PlainBudget(input)
  pb.parse()
  ok(output === pb.render())
})

test('computing', () => {
  const { input, output } = loadFixture('computing')
  const pb = new PlainBudget(input)
  pb.process()
  pb.computeStats()
  deepEqual(pb.stats.distribution, [
    ['Car payment', 0.34014],
    ['House payment', 0.22676],
    ['Rent', 0.11338],
    ['Bar', 0.05669],
    ['Utilities', 0.05669],
    ['Internet', 0.02268]
  ])
  deepEqual(pb.stats.projections, {
    savings: 1620,
    sixmonths: 11340,
    oneyear: 21060,
    threeyears: 59940,
    fiveyears: 98820,
    tenyears: 196020
  })
  ok(output === pb.renderWithPadding())
})

test('double', () => {
  const { input, output } = loadFixture('double')
  const pb = new PlainBudget(input)
  pb.process()
  ok(output === pb.render())
})

test('empty', () => {
  const { input, output } = loadFixture('empty')
  const pb = new PlainBudget(input)
  pb.process()
  ok(output === pb.render())
})

test('incomplete', () => {
  const { input, output } = loadFixture('incomplete')
  const pb = new PlainBudget(input)
  pb.process()
  ok(output === pb.render())
})

test('missing', () => {
  processingTest('missing')
})

test('negative', () => {
  const { input, output } = loadFixture('negative')
  const pb = new PlainBudget(input)
  pb.process()
  ok(output === pb.render())
})

test('multiplier', () => {
  const { input, output } = loadFixture('multiplier')
  const pb = new PlainBudget(input)
  pb.process()
  pb.computeStats()
  deepEqual(pb.stats.distribution, [
    ['Rent', 0.33333],
    ['Coffee', 0.24],
    ['Milk', 0.24],
    ['Utilities', 0.16667],
    ['Cereal', 0.12],
    ['Leisure', 0.08333],
    ['Foobar', 0.03333]
  ])
  deepEqual(pb.stats.projections, {
    savings: -1300,
    sixmonths: -9100,
    oneyear: -16900,
    threeyears: -48100,
    fiveyears: -79300,
    tenyears: -157300
  })
  ok(output === pb.renderWithPadding())
})

test('padding', () => {
  processingTest('padding', true)
})

test('references', () => {
  const { input } = loadFixture('references')
  const pb = new PlainBudget(input)
  pb.parse()
  const { order, invalid } = pb.validate()
  deepEqual(order, [
    'Expenses Group 1',
    'Expenses Group 2',
    'Expenses Group 6',
    'Expenses Group 5',
    'Income group'
  ])
  deepEqual(invalid, [
    'Expenses Group 4',
    'Expenses Group 3',
    'Codependent 2',
    'Codependent 1',
  ])
})

test('result', () => {
  const { input, output } = loadFixture('result')
  const pb = new PlainBudget(input)
  pb.process()
  ok(output === pb.render())
})

test('single', () => {
  const { input, output } = loadFixture('single')
  const pb = new PlainBudget(input)
  pb.process()
  ok(output === pb.render())
})

test('dedupe', () => {
  processingTest('dedupe', true)
})

test('division', () => {
  processingTest('division', true)
})

test('decimals', () => {
  processingTest('decimals', true)
})

function loadFixture(...fixtureInput) {
  const fixtureRoot = join(root, 'fixtures')
  const fixture = join(fixtureRoot, ...fixtureInput)
  const input = readFileSync(`${fixture}.input`, 'utf8')
  const output = readFileSync(`${fixture}.output`, 'utf8')
  return { input, output }
}

function processingTest(fixture, padding = false) {
  const { input, output } = loadFixture(fixture)
  const pb = new PlainBudget(input)
  pb.process()
  const rendered = padding
    ? pb.renderWithPadding()
    : pb.render()
  ok(output === rendered)
}
