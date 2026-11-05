import { cacheLife } from 'next/cache'

export async function getApps(userID: string) {
    'use cache'
    cacheLife('default')
    
}