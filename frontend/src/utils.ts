export function isDead(dead: number[] | undefined, playerID: number): boolean {
    return (
        typeof dead !== 'undefined'
        && dead.findIndex((id) => id === playerID) !== -1
    )
}

export function isWerewolfKilled(
    dead: number[] | undefined,
    wwk: number[] | undefined,
    playerID: number
): boolean {
    return (
        isDead(dead, playerID)
        && typeof wwk !== 'undefined'
        && wwk.findIndex((id) => id === playerID) !== -1
    )
}

export function isWitchKilled(
    dead: number[] | undefined,
    wwk: number[] | undefined,
    playerID: number
): boolean {
    return !isWerewolfKilled(dead, wwk, playerID)
}