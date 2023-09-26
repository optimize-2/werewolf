import fs from 'fs'
import { Role, Target } from './game'

export interface ConfigType {
    roles: Record<Role, number>
    target: Target,
    pass: Array<string>
}

export interface TokenConfigType {
    tokens: Record<string, string>
}

export const loadConfig = (): ConfigType => JSON.parse(fs.readFileSync('./cfg.json').toString())

export const getTokens = (): TokenConfigType => JSON.parse(fs.readFileSync('./tokens.json').toString())