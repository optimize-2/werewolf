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

export const stateMessage = {
    idle: '等待开始',
    morning: '天亮了',
    werewolf: '狼人请睁眼',
    witch: '女巫请睁眼',
    seer: '预言家请睁眼',
    guard: '守卫请睁眼',
    discuss: '等待发言',
    vote: '等待投票',
    voteend: '投票结束',
}

export const roleInfo = {
    villager: '平民',
    werewolf: '狼人',
    seer: '预言家',
    witch: '女巫',
    hunter: '猎人',
    guard: '守卫',
    spec: '旁观者',
}
