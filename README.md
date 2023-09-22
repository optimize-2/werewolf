# werewolf

## server -> client:

`username` 和 `player` 都指用户名，游戏相关的我叫 `player`。


### `recieveMessage`（`server` 做完了）

参数：`{username: string, message: string}`

### `updateUsers`（`server` 做完了）

参数：`users: Record<string, PlayerState>`

### `gameStart`（`server` 做完了）

参数：`{ role: Role, players: Array<string> }`

`players` 是进入游戏的所有玩家，同时也是发言顺序。

如果你不在 `players` 里说明你没准备，`roles` 应该是 `undefined`。

### `loginResult`（`server` 做完了）

参数：`state: GameState`

接下来是游戏相关

游戏开始时，服务器会发送 `gameState`，`state` 是 `werewolf`，代表狼人开始刀人。

### `gameState`

参数：`{ state: GameState, dead: Array<number>, seerResult: boolean, waiting: number, voteResult: Array<number> }`

`dead` 代表在上一轮死亡的人，不会重复发送。

如果上一个 `state` 是 `hunter`，那么这个 `state` 应该有猎人带走人。

如果 `state` 是 `discuss` 那么 `waiting` 有意义。

如果 `waiting` 是你的 `id` 那么到你发言了。

如果上一个 `state` 是 `seer` 并且你是预言家，那么 `seerResult` 代表是不是狼人（`true` 是狼人），不然 `seerResult` 无意义。

如果上一个 `state` 是 `vote` 这次还是 `vote`，说明平票了，重新投票，同时 `voteResult` 有东西。

在如下情况中会有意义：

1. `state === 'morning'` 代表昨晚死的人。
2. `state === 'witch'` 并且你的角色是女巫，代表昨晚被刀的人。
3. `state === 'voteend'` 代表被票的人，同时第 `i` 号人票了 `voteResult[i]` 号人（是 `-1` 代表弃票了）。

猎人刀人单独发送 `hunterKilled`。

### `hunterKilled`

参数：`id: number`

### `discussStart`

参数：`id: number`

是 `players` 的下标。

### `receiveDiscuss`

参数：`{ player: string, message: string }`

遗言什么的都算 `discuss`，前端遗言也发 `sendDiscuss`。

## client -> server:

### `login`（`server` 做完了）

参数：`username: string`

### `sendMessage`（`server` 做完了）

参数：`message: string`

### `disconnect`（`server` 做完了）

### `ready`（`server` 做完了）

### `cancelReady`

### `werewolfSelect`

参数：`id: number`

代表选了这个人。

### `werewolfConfirm`

确定要刀这个人。

### `werewolfCancel`

不确定了。

当所有存活狼人都确定刀人，后端就会执行刀人。

### `seerConfirm`

参数：`id: number`

预言家验人，验完预言家收到的 `witch state` 包里会有 `seerResult: true / false`，`true` 是狼人，`false` 是好人。

### `witchSave`

女巫救人。

### `witchPoison`

参数：`id: number`

女巫毒人。

### `voteConfirm`

参数 `id: number`

投票，不能取消。

前端可以选择很多次，但是点了确定就会发送 `voteConfirm`，前端投票界面应该变灰点不了，锁定状态。上面的三个包也是同样道理。

如果 `id` 不合法视为弃票，前端记得做弃票，发个不合法 `id` 就行，比如 `-1`。

### `sendDiscuss`

参数 `message: string`

发送讨论 / 遗言。如果内容是 `pass` 或者 `过` 就轮到下一个人了。

### `sendHunter`

参数 `id: number`

如果 `id` 不在 `[0, playersCount)` 视为放弃发动猎人技能。


```
export type PlayerState = 
        | 'unready'
        | 'ready'
        | 'alive'
        | 'spec'

export type Role =
        | 'villager'
        | 'werewolf'
        | 'seer'
        | 'witch'
        | 'hunter'

export type GameState = 
        | 'idle'
        | 'morning'
        | 'discuss'
        | 'vote'
        | 'voteend'
        | 'werewolf'
        | 'witch'
        | 'seer'
```

## statemachine

`idle` -> `werewolf` （所有玩家都准备时）

`werewolf` -> `witch`（女巫死亡也会播报此事件并且等待随机时长）

`witch` -> `seer`（预言家死亡也会播报此事件并且等待随机时长）

`seer` -> `morning`（`morning` 用于发送第一晚的遗言以及发动猎人技能）

`morning` -> `discuss`（第一晚且遗言结束 / 猎人技能未发动 / 不是猎人，猎人击杀的会加入 `dead`）

`discuss` -> `vote`（所有玩家发言完毕）

`vote` -> `voteend`（所有玩家投票完毕，同时播报死亡玩家，并且等他说遗言或发动猎人技能）

注意说遗言的时候，名字确实在 `dead` 里但是不等于死了要在事件处理完才算死！！！

`voteend` -> `werewolf`（遗言结束，猎人击杀的会加入 `dead`）

这是一次循环