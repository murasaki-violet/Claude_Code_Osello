import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="mb-8 text-4xl font-bold text-center">Osello Game</h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link 
          href="/rooms"
          className="py-3 px-6 text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ルーム一覧へ
        </Link>
        <Link 
          href="/how-to-play"
          className="py-3 px-6 text-center text-blue-600 bg-white rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors"
        >
          遊び方
        </Link>
      </div>
    </div>
  );
}
