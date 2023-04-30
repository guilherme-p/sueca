import Link from 'next/link';

export default function Home() {
    return (
        <div className="h-screen">
            <div className="flex flex-col items-center">
                <h1 className="my-auto mx-auto text-8xl font-extrabold">
                    Sueca
                </h1>
                <Link href="/api/createroom" className="text-center align-middle w-40 h-10 my-10 mx-auto px-6 py-2 bg-blue-700 text-white hover:bg-blue-800 font-semibold rounded-lg border-solid">
                    Criar sala
                </Link>
            </div>
        </div>
    )
}
