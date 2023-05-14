import { createClient } from 'redis';
import { randomBytes } from 'crypto';

async function getRoomId() {
    const client = createClient();

    client.on('error', err => { 
        console.log('Redis Client Error', err)
        throw new Error("redis");
    });

    await client.connect();

    let id: string = randomBytes(4).toString('hex');
    let exists: string | null = await client.set(id, "1", {NX: true, EX: 60 * 60 * 24});
    
    while (exists === null) {
        id = randomBytes(4).toString('hex');
        exists = await client.set(id, "1", {NX: true, EX: 60 * 60 * 24});
    }
    
    return id;
}

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let id: string = await getRoomId();
    res.redirect(302, "/sala/" + id); 
}
