// Copy the PlainBudget class from the parent directory
export class PlainBudget {
    MULTIPLIER_REGEX = /^(.*?)\s+x\s+(\d+(?:\.\d+)?)$/
    DIVIDER_REGEX = /^(.*?)\s+\/\s+(\d+(?:\.\d+)?)$/
    COMPUTABLE_LINE_REGEX = /^[=\-~+x]\s+/
    RESULT_LINE_REGEX = /^=\s+(\d+(?:\.\d+)?)\s*$/
    VALUE_REGEX = /^\s+(\d+(?:\.\d+)?)/
    LABEL_REGEX = /\s+\d+(?:\.\d+)?\s+(.+)/

    constructor(source, padding) {
        this.source = source
        this.padding = padding ?? 3
        this.blocks = null
        this.raw = null
        this.ids = null
        this.modifiers = null
        this.computed = null
        this.index = null
        this.blocks = null
    }

    process() {
        this.parse()
        const { order } = this.validate()
        for (const id of order) {
            const group = this.index.get(id)
            const i = this.blocks.findIndex(_ => _ === group)
            if (i !== -1) {
                this.compute(i)
            }
        }
        const flows = this.blocks.filter(_ => Array.isArray(_) && _[0][0] === '+')
        for (const flow of flows) {
            const i = this.blocks.findIndex(_ => _ === flow)
            this.compute(i)
        }
        return {
            blocks: this.blocks,
            output: this.render(),
        }
    }

    parse() {
        this.raw = new WeakMap
        this.ids = new WeakMap
        this.modifiers = new WeakMap
        this.computed = new Map
        this.index = new Map
        this.blocks = []

        const lines = this.source.split(/\r?\n/g)

        let group = null

        let op
        let line

        let lineCount = lines.length
        let maxIter = lineCount - 1
        for (let i = 0; i < lineCount; i++) {
            line = lines[i].trim()
            op = line[0]
            if ('=+'.includes(op) && group === null) {
                const parsed = this.#parseLine(line, lines[i])
                if (parsed) {
                    group = [parsed]
                } else {
                    this.blocks.push(lines[i])
                }
            } else if (group) {
                if (line.match(/^\s*$/) && group.length > 1) {
                    this.blocks.push(group)
                    this.blocks.push('')
                    group = null
                } else {
                    const parsed = this.#parseLine(line, lines[i])
                    if (!parsed) {
                        this.blocks.push(...group.map(l => this.raw.get(l)))
                        this.blocks.push(lines[i])
                        group = null
                    } else {
                        group.push(parsed)
                    }
                }
            } else {
                this.blocks.push(lines[i])
            }
            if (i === maxIter) {
                if (group) {
                    if (group.length > 1) {
                        this.blocks.push(group)
                    } else {
                        this.blocks.push(lines[i])
                    }
                    group = null
                }
            }
        }
    }

    validate() {
        const dupes = []
        for (const group of this.blocks) {
            if (!Array.isArray(group)) {
                continue
            }
            for (const entry of group) {
                if (entry[0] === '=') {
                    const id = this.ids.get(entry)
                    if (id) {
                        if (this.index.has(id)) {
                            dupes.push(this.index.get(id))
                        }
                        this.index.set(id, group)
                    }
                } else {
                    continue
                }
            }
        }

        for (const group of dupes) {
            const i = this.blocks.findIndex(_ => _ === group)
            this.ids.delete(group)
            this.blocks.splice(i, 1, ...group.map(l => this.raw.get(l)))
        }

        const graph = new Map
        for (const group of this.index.values()) {
            let deps = null
            for (const entry of group) {
                if (entry[0] === '=') {
                    deps = new Map
                    const id = this.ids.get(entry)
                    graph.set(id, deps)
                    continue
                }
                if (entry[1] === null) {
                    if (deps) {
                        const entryId = this.ids.get(entry)
                        deps.set(entryId, 1)
                    }
                }
            }
        }

        const { order, invalid } = this.#resolveDependencies(graph)

        for (const id of invalid) {
            const group = this.index.get(id)
            const i = this.blocks.findIndex(_ => _ === group)
            this.ids.delete(group)
            this.blocks.splice(i, 1, ...group.map(l => this.raw.get(l)))
        }

        for (const group of this.blocks.filter(_ => Array.isArray(_))) {
            for (const line of group) {
                if (line[0] === '-' || line[0] === '+') {
                    const id = this.ids.get(line)
                    if (line[1] === null && !this.index.get(id)) {
                        const i = this.blocks.findIndex(_ => _ === group)
                        this.ids.delete(group)
                        this.blocks.splice(i, 1, ...group.map(l => this.raw.get(l)))
                    }
                }
            }
        }

        return { order, invalid }
    }

    compute(index) {
        if (!Array.isArray(this.blocks[index])) {
            return
        }

        const group = this.blocks[index]

        let value

        if ('='.includes(group[0][0])) {
            if (group[0][2] === '') {
                group[0][2] = '\n'
            }
            value = 0
            for (const topOp of group.slice(1)) {
                if (topOp[0] === 'x') {
                    continue
                }
                const lineValue = this.#processFlowEntry(topOp)
                value += lineValue
                // Update the line's value if it was modified
                if (this.modifiers.get(topOp)) {
                    topOp[1] = lineValue
                }
            }
        } else if (group[0][0] === '+') {
            if (typeof value === 'undefined') {
                value = this.#processFlowEntry(group[0])
            } else {
                value += this.#processFlowEntry(group[0])
            }
            for (const op of group.slice(1)) {
                if (op[0] === '+') {
                    value += this.#processFlowEntry(op)
                } else if (op[0] === '-') {
                    value -= this.#processFlowEntry(op)
                }
                if (value < 0) {
                    this.blocks.splice(index, 1, ...group.map((l) => {
                        return this.raw.get(l)
                    }))
                    return
                }
            }
        }
        if (group[0][0] === '=') {
            // Apply group-level modifier if present
            const modifier = this.modifiers.get(group[0])
            if (modifier) {
                value = modifier.type === 'multiply' ? value * modifier.value : value / modifier.value
            }
            value = this.#round(value)
            group[0][1] = value
            const id = this.ids.get(group[0])
            this.computed.set(id, value)
        } else {
            value = this.#round(value)
            if (group.at(-1)[0] !== '=') {
                group.push(['=', value, ''])
            } else {
                group[group.length - 1][1] = value
            }
        }
    }

    computeStats() {
        this.stats = {}
        let credits = 0
        let debits = 0
        let balance
        const expenses = new Map()
        for (const block of this.blocks) {
            if (!Array.isArray(block) || block[0][0] !== '+') {
                continue
            }
            for (const group of block) {
                let [op, value] = group
                if (op === '+') {
                    credits += value
                } else if (op === '-') {
                    const id = this.ids.get(group)
                    if (this.computed.has(id)) {
                        const subgroup = this.index.get(id)
                        for (const line of subgroup.slice(1)) {
                            const subid = this.ids.get(line)
                            const modifier = this.modifiers.get(line)
                            let value = line[1]
                            if (modifier) {
                                value = modifier.type === 'multiply' ? value * modifier.value : value / modifier.value
                            }
                            if (expenses.has(subid)) {
                                expenses.set(subid, expenses.get(subid) + value)
                            } else {
                                expenses.set(subid, value)
                            }
                            debits += value
                        }
                    } else {
                        const modifier = this.modifiers.get(group)
                        if (modifier) {
                            value = modifier.type === 'multiply' ? value * modifier.value : value / modifier.value
                        }
                        if (expenses.has(id)) {
                            expenses.set(id, expenses.get(id) + value)
                        } else {
                            expenses.set(id, value)
                        }
                        debits += value
                    }
                }
            }
        }

        this.stats.distribution = []
        for (const [expense, amount] of expenses.entries()) {
            this.stats.distribution.push([
                expense,
                parseFloat((amount / credits).toFixed(5))
            ])
        }
        this.stats.distribution.sort(this.#sortDescending)

        balance = credits - debits
        this.stats.projections = {
            savings: balance,
            sixmonths: balance + (balance * 6),
            oneyear: balance + (balance * 12),
            threeyears: balance + (balance * 36),
            fiveyears: balance + (balance * 60),
            tenyears: balance + (balance * 120)
        }
    }

    render(blocksInput) {
        let output = ''
        const blocks = blocksInput ?? this.blocks
        for (const block of blocks.slice(0, -1)) {
            if (typeof block === 'string') {
                output += `${block}\n`
            } else {
                for (const line of block) {
                    const cleanLabel = this.#getCleanLabel(line)
                    const parts = [line[0], line[1], cleanLabel].filter(Boolean)
                    output += `${parts.join(' ')}\n`
                }
            }
        }
        const lastBlock = blocks.at(-1)
        if (typeof lastBlock === 'string') {
            output += `${lastBlock}`
        } else {
            for (const line of lastBlock.slice(0, -1)) {
                const cleanLabel = this.#getCleanLabel(line)
                const parts = [line[0], line[1], cleanLabel].filter(Boolean)
                output += `${parts.join(' ')}\n`
            }
            const lastLine = lastBlock.at(-1)
            const cleanLabel = this.#getCleanLabel(lastLine)
            const parts = [lastLine[0], lastLine[1], cleanLabel].filter(Boolean)
            output += `${parts.join(' ')}`
        }
        return output
    }

    renderWithPadding(blocksInput) {
        const padding = this.padding !== null
            ? Math.max(this.padding, this.#getPadding())
            : 0

        let output = ''
        const blocks = blocksInput ?? this.blocks
        for (const block of blocks.slice(0, -1)) {
            if (typeof block === 'string') {
                output += `${block}\n`
            } else {
                for (const line of block) {
                    const value = line[1] !== null ? line[1].toString().padStart(padding) : ''.padStart(padding)
                    const cleanLabel = this.#getCleanLabel(line)
                    output += `${line[0]} ${value} ${cleanLabel ?? ''}\n`
                }
            }
        }
        const lastBlock = blocks.at(-1)
        if (typeof lastBlock === 'string') {
            output += `${lastBlock}`
        } else {
            for (const line of lastBlock.slice(0, -1)) {
                const value = line[1] !== null ? line[1].toString().padStart(padding) : ''.padStart(padding)
                const cleanLabel = this.#getCleanLabel(line)
                output += `${line[0]} ${value} ${cleanLabel ?? ''}\n`
            }
            const lastLine = lastBlock.at(-1)
            const lastValue = lastLine[1] !== null ? lastLine[1].toString().padStart(padding) : ''.padStart(padding)
            const cleanLabel = this.#getCleanLabel(lastLine)
            output += `${lastLine[0]} ${lastValue} ${cleanLabel ?? ''}\n`
        }
        return output
    }

    #processFlowEntry(op) {
        const modifier = this.modifiers.get(op)
        const id = this.ids.get(op)
        const computed = this.computed.get(id)
        if (modifier) {
            let modifiedValue
            if (computed) {
                modifiedValue = modifier.type === 'multiply' ? computed * modifier.value : computed / modifier.value
                modifiedValue = this.#round(modifiedValue)
                op[1] = modifiedValue
                return op[1]
            } else {
                modifiedValue = modifier.type === 'multiply' ? op[1] * modifier.value : op[1] / modifier.value
                modifiedValue = this.#round(modifiedValue)
                op[1] = modifiedValue
                return modifiedValue
            }
        }
        if (computed) {
            op[1] = computed
        }
        return op[1]
    }

    #parseValue(line) {
        let value = line.slice(1).match(this.VALUE_REGEX) ?? null
        if (value) {
            value = parseFloat(value[1])
            if (isNaN(value)) {
                value = null
            }
        }
        return value
    }

    #parseLine(line, raw) {
        if (!line.match(this.COMPUTABLE_LINE_REGEX)) {
            return
        }
        if (line.match(this.RESULT_LINE_REGEX)) {
            const value = this.#parseValue(line)
            const parsed = ['=', value]
            this.raw.set(parsed, raw)
            return parsed
        }
        const value = this.#parseValue(line)
        let label = line.slice(1).match(this.LABEL_REGEX) ?? null
        if (label === null && value !== null) {
            return
        }
        label = label ? label[1] : line.slice(1).trim()
        const parsed = [line[0], value, label]
        const modifier = this.#parseMultiplier(parsed[2])
        if (modifier) {
            this.ids.set(parsed, modifier[0])
            this.modifiers.set(parsed, modifier[1])
        } else {
            this.ids.set(parsed, label)
        }
        this.raw.set(parsed, raw)
        return parsed
    }

    #parseMultiplier(label) {
        const m = label.trim().match(this.MULTIPLIER_REGEX)
        if (m) {
            return [m[1], { type: 'multiply', value: parseFloat(m[2]) }]
        }
        const d = label.trim().match(this.DIVIDER_REGEX)
        if (d) {
            return [d[1], { type: 'divide', value: parseFloat(d[2]) }]
        }
    }

    #resolveDependencies(dependencies) {
        const order = []
        const invalid = new Set()
        const states = new Map() // [unvisited, visiting, visited]

        for (const node of dependencies.keys()) {
            if (!states.has(node)) {
                this.#visitDependencyNode(node, dependencies, order, invalid, states)
            }
        }

        return { order, invalid: [...invalid] }
    }

    #visitDependencyNode(node, dependencies, order, invalid, states) {
        const state = states.get(node) ?? 0

        if (state === 1) {
            return true
        }

        if (state === 2) {
            return invalid.has(node)
        }

        states.set(node, 1)

        let isInvalid = false
        const deps = dependencies.get(node) || new Map()

        for (const dep of deps.keys()) {
            if (this.#visitDependencyNode(dep, dependencies, order, invalid, states)) {
                isInvalid = true
            }
        }

        states.set(node, 2)

        if (isInvalid) {
            invalid.add(node)
        } else {
            order.push(node)
        }

        return isInvalid
    }


    #getPadding() {
        let p = 3
        for (const block of this.blocks) {
            if (!Array.isArray(block)) {
                continue
            }
            let nlen
            for (const group of block) {
                if (group[1] !== null) {
                    nlen = group[1].toString().length
                    if (nlen > (p + 1)) {
                        p = nlen + 1
                    }
                }
            }
        }
        return p + 1
    }

    #sortDescending(a, b) {
        return b[1] - a[1]
    }

    #round(value) {
        // Round to 2 decimal places and remove trailing zeros
        return Math.round(value * 100) / 100
    }

    #getCleanLabel(line) {
        // If line has a modifier (operation), show just the clean label without the operation
        const modifier = this.modifiers.get(line)
        if (modifier) {
            const id = this.ids.get(line)
            return id
        }
        return line[2]
    }
}
