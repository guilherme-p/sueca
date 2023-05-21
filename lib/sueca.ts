import assert from 'node:assert';

export class SuecaServer {
    deck: string[] = ['2c', '2d', '2h', '2s', '3c', '3d', '3h', '3s', '4c', '4d', '4h', '4s',
                      '5c', '5d', '5h', '5s', '6c', '6d', '6h', '6s', '7c', '7d', '7h', '7s',
                      'Ac', 'Ad', 'Ah', 'As', 'Jc', 'Jd', 'Jh', 'Js', 'Kc', 'Kd', 'Kh', 'Ks',
                      'Qc', 'Qd', 'Qh', 'Qs'];

    values = {'2': 0, '3': 0, '4': 0, '5': 0, '6': 0, 'Q': 2, 'J': 3, 'K': 4, '7': 10, 'A': 11};
    order = ['2', '3', '4', '5', '6', 'Q', 'J', 'K', '7', 'A'];
    round: [number, string][] = [];
    turn = 0;
    trump: string;
    cards: [string[], string[], string[], string[]];
    points = [0, 0];

    constructor() {
        this.cards = this.deal();
        this.trump = this.deck[0];
    }

    sum(arr: number[]): number {
       return arr.reduce((currentSum, el) => currentSum + el, 0); 
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    deal(): [string[], string[], string[], string[]] {
        this.shuffleDeck();

        return [this.deck.slice(0, 10),
                this.deck.slice(10, 20),
                this.deck.slice(20, 30),
                this.deck.slice(30, 40)];
    }

    getRoundWinner(): [number, number] {
        let winner: [number, string] = [-1, ""]; 
        let points = 0;

        for (let [p, c] of this.round) {
            let [wp, wc] = winner;

            if (wp == -1) {
                winner = [p, c];
                continue;
            }

            if (c[1] === this.trump[1]) {
               if (wc !== this.trump[1] || this.order.indexOf(c[0]) >= this.order.indexOf(wc[0])) {
                    winner = [p, c];
                } 
            }

            else {
                if (wc !== this.trump[1] && this.order.indexOf(c[0]) > this.order.indexOf(wc[0])) {
                    winner = [p, c];
                }
            }

            points += this.values[c[0] as keyof typeof this.values];
        }

        return [winner[0], points];
    }

    play(player: number, card: string): boolean {
        if (this.round.length === 4) {
            this.round = [];
        }

        assert(player === this.turn);
        assert(this.cards[player].includes(card));
        assert(this.round.length == 0 || card[1] == this.round[0][1][1]);

        this.round.push([player, card]);

        let i = this.cards[player].indexOf(card);
        this.cards[player].splice(i, 1);

        if (this.round.length === 4) {
            let [winner, points] = this.getRoundWinner(); 
            this.points[winner % 2] += points;
            this.turn = winner;
        }

        else {
            this.turn = (this.turn + 1) % 4;
        }

        return this.sum(this.points) === 120;                    // game over
    }
}
