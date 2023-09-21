# werewolf

## server -> client:

`username` 和 `player` 都指用户名，游戏相关的我叫 `player`。


### `recieveMessage`（`server` 做完了）

参数：`{username: string, message: string}`

### `updateUsers`（`server` 做完了）

参数：`users: Record<string, PlayerState>`

### `gameStart`（`server` 做完了）

参数：`{ role: Role, users: Record<string, PlayerState>}`

如果你在 `users` 里不是 `alive`（那么通常是 `spec`），那么说明你没参与这局游戏，`role` 无意义。

### `loginResult`（`server` 做完了）

参数：`state: PlayerState`

## client -> server:

### `login`（`server` 做完了）

参数：`username: string`

### `sendMessage`（`server` 做完了）

参数：`message: string`

### `disconnect`（`server` 做完了）

### `ready`（`server` 做完了）

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
```