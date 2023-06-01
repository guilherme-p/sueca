import { createClient } from 'redis';
import { randomBytes } from 'crypto';

const client = createClient();

client.on('error', err => { 
    console.log('Redis Client Error', err)
    throw new Error("redis");
});

let _ = await client.connect();

async function getRoomId() {
    let id: string = randomBytes(4).toString('hex');
    let exists: number = await client.sAdd("rooms", id);
    
    while (exists === 0) {
        id = randomBytes(4).toString('hex');
        exists = await client.sAdd("rooms", id);
    }

    await client.hSet(id, "created_ts", Date.now());
    
    return id;
}

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let id: string = await getRoomId();
    res.redirect(302, "/sala/" + id); 
}
