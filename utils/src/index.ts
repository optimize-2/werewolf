export function entries<K extends string | number | symbol, V>(o: Record<K, V>): [K, V][] {
    return Object.entries(o) as [unknown, V][] as [K, V][]
}

const _ = {
    entries,
}

export default _