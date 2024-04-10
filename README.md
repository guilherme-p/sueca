# Sueca
Browser implementation of a popular portuguese card game called Sueca.
You create a room and then share that link with your friends.

## Getting Started
Start a redis server on your machine.

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

There is a test script you can run to simulate other players
(you can customize it through env variables or altering the script itself):
```
npx tsx test/test.ts
```
