import Image from 'next/image';
import { ReactElement } from 'react';

import image2c from '../images/2_of_clubs.svg';
import image2d from '../images/2_of_diamonds.svg';
import image2h from '../images/2_of_hearts.svg';
import image2s from '../images/2_of_spades.svg';
import image3c from '../images/3_of_clubs.svg';
import image3d from '../images/3_of_diamonds.svg';
import image3h from '../images/3_of_hearts.svg';
import image3s from '../images/3_of_spades.svg';
import image4c from '../images/4_of_clubs.svg';
import image4d from '../images/4_of_diamonds.svg';
import image4h from '../images/4_of_hearts.svg';
import image4s from '../images/4_of_spades.svg';
import image5c from '../images/5_of_clubs.svg';
import image5d from '../images/5_of_diamonds.svg';
import image5h from '../images/5_of_hearts.svg';
import image5s from '../images/5_of_spades.svg';
import image6c from '../images/6_of_clubs.svg';
import image6d from '../images/6_of_diamonds.svg';
import image6h from '../images/6_of_hearts.svg';
import image6s from '../images/6_of_spades.svg';
import image7c from '../images/7_of_clubs.svg';
import image7d from '../images/7_of_diamonds.svg';
import image7h from '../images/7_of_hearts.svg';
import image7s from '../images/7_of_spades.svg';
import imageAc from '../images/ace_of_clubs.svg';
import imageAd from '../images/ace_of_diamonds.svg';
import imageAh from '../images/ace_of_hearts.svg';
import imageAs from '../images/ace_of_spades.svg';
import imageJc from '../images/jack_of_clubs.svg';
import imageJd from '../images/jack_of_diamonds.svg';
import imageJh from '../images/jack_of_hearts.svg';
import imageJs from '../images/jack_of_spades.svg';
import imageKc from '../images/king_of_clubs.svg';
import imageKd from '../images/king_of_diamonds.svg';
import imageKh from '../images/king_of_hearts.svg';
import imageKs from '../images/king_of_spades.svg';
import imageQc from '../images/queen_of_clubs.svg';
import imageQd from '../images/queen_of_diamonds.svg';
import imageQh from '../images/queen_of_hearts.svg';
import imageQs from '../images/queen_of_spades.svg';

let cardImages: Record<string, ReactElement> = 
{
    '2c': <Image src={image2c} alt={'2 of clubs'} key={'2c'}/* width={222} height={322} */ fill={false} />,
    '2d': <Image src={image2d} alt={'2 of diamonds'} key={'2d'}/* width={222} height={322} */ fill={false} />,
    '2h': <Image src={image2h} alt={'2 of hearts'} key={'2h'}/* /* width={222} height={322} */ fill={false} />,
    '2s': <Image src={image2s} alt={'2 of spades'} key={'2s'}/* width={222} height={322} */ fill={false} />,
    '3c': <Image src={image3c} alt={'3 of clubs'} key={'3c'}/* width={222} height={322} */ fill={false} />,
    '3d': <Image src={image3d} alt={'3 of diamonds'} key={'3d'}/* width={222} height={322} */ fill={false} />,
    '3h': <Image src={image3h} alt={'3 of hearts'} key={'3h'}/* width={222} height={322} */ fill={false} />,
    '3s': <Image src={image3s} alt={'3 of spades'} key={'3s'}/* width={222} height={322} */ fill={false} />,
    '4c': <Image src={image4c} alt={'4 of clubs'} key={'4c'}/* width={222} height={322} */ fill={false} />,
    '4d': <Image src={image4d} alt={'4 of diamonds'} key={'4d'}/* width={222} height={322} */ fill={false} />,
    '4h': <Image src={image4h} alt={'4 of hearts'} key={'4h'}/* width={222} height={322} */ fill={false} />,
    '4s': <Image src={image4s} alt={'4 of spades'} key={'4s'}/* width={222} height={322} */ fill={false} />,
    '5c': <Image src={image5c} alt={'5 of clubs'} key={'5c'}/* width={222} height={322} */ fill={false} />,
    '5d': <Image src={image5d} alt={'5 of diamonds'} key={'5d'}/* width={222} height={322} */ fill={false} />,
    '5h': <Image src={image5h} alt={'5 of hearts'} key={'5h'}/* width={222} height={322} */ fill={false} />,
    '5s': <Image src={image5s} alt={'5 of spades'} key={'5s'}/* width={222} height={322} */ fill={false} />,
    '6c': <Image src={image6c} alt={'6 of clubs'} key={'6c'}/* width={222} height={322} */ fill={false} />,
    '6d': <Image src={image6d} alt={'6 of diamonds'} key={'6d'}/* width={222} height={322} */ fill={false} />,
    '6h': <Image src={image6h} alt={'6 of hearts'} key={'6h'}/* width={222} height={322} */ fill={false} />,
    '6s': <Image src={image6s} alt={'6 of spades'} key={'6s'}/* width={222} height={322} */ fill={false} />,
    '7c': <Image src={image7c} alt={'7 of clubs'} key={'7c'}/* width={222} height={322} */ fill={false} />,
    '7d': <Image src={image7d} alt={'7 of diamonds'} key={'7d'}/* width={222} height={322} */ fill={false} />,
    '7h': <Image src={image7h} alt={'7 of hearts'} key={'7h'}/* width={222} height={322} */ fill={false} />,
    '7s': <Image src={image7s} alt={'7 of spades'} key={'7s'}/* width={222} height={322} */ fill={false} />,
    'Ac': <Image src={imageAc} alt={'ace of clubs'} key={'Ac'}/* width={222} height={322} */ fill={false} />,
    'Ad': <Image src={imageAd} alt={'ace of diamonds'} key={'Ad'}/* width={222} height={322} */ fill={false} />,
    'Ah': <Image src={imageAh} alt={'ace of hearts'} key={'Ah'}/* width={222} height={322} */ fill={false} />,
    'As': <Image src={imageAs} alt={'ace of spades'} key={'As'}/* width={222} height={322} */ fill={false} />,
    'Jc': <Image src={imageJc} alt={'jack of clubs'} key={'Jc'}/* width={222} height={322} */ fill={false} />,
    'Jd': <Image src={imageJd} alt={'jack of diamonds'} key={'Jd'}/* width={222} height={322} */ fill={false} />,
    'Jh': <Image src={imageJh} alt={'jack of hearts'} key={'Jh'}/* width={222} height={322} */ fill={false} />,
    'Js': <Image src={imageJs} alt={'jack of spades'} key={'Js'}/* width={222} height={322} */ fill={false} />,
    'Kc': <Image src={imageKc} alt={'king of clubs'} key={'Kc'}/* width={222} height={322} */ fill={false} />,
    'Kd': <Image src={imageKd} alt={'king of diamonds'} key={'Kd'}/* width={222} height={322} */ fill={false} />,
    'Kh': <Image src={imageKh} alt={'king of hearts'} key={'Kh'}/* width={222} height={322} */ fill={false} />,
    'Ks': <Image src={imageKs} alt={'king of spades'} key={'Ks'}/* width={222} height={322} */ fill={false} />,
    'Qc': <Image src={imageQc} alt={'queen of clubs'} key={'Qc'}/* width={222} height={322} */ fill={false} />,
    'Qd': <Image src={imageQd} alt={'queen of diamonds'} key={'Qd'}/* width={222} height={322} */ fill={false} />,
    'Qh': <Image src={imageQh} alt={'queen of hearts'} key={'Qh'}/* width={222} height={322} */ fill={false} />,
    'Qs': <Image src={imageQs} alt={'queen of spades'} key={'Qs'}/* width={222} height={322} */ fill={false} />,
};

export default cardImages;
