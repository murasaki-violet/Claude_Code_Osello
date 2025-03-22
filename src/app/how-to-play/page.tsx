import Link from "next/link";

export default function HowToPlayPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">遊び方</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-3">基本ルール</h2>
          <p className="mb-2">通常のオセロ（リバーシ）と同じように、相手の石を挟むことで裏返すことができます。</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>黒（先手）と白（後手）が交互に石を置いていきます</li>
            <li>相手の石を自分の石で挟むと、挟まれた石は全て自分の色に変わります</li>
            <li>少なくとも1つの石を裏返せる場所にしか置けません</li>
            <li>置ける場所がない場合はパスとなります</li>
            <li>両者とも置ける場所がなくなるとゲーム終了です</li>
            <li>より多くの石を獲得した方が勝ちです</li>
          </ul>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-3">特殊要素: ライフゲームゲージ</h2>
          <p className="mb-2">このゲームには通常のオセロに加えて特殊な要素があります：</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>石を裏返すと「ライフゲームゲージ」が溜まります</li>
            <li>ゲージが満タンになると、好きなタイミングで「ライフゲーム」を発動できます</li>
            <li>ライフゲームでは、自分の石だけでコンウェイのライフゲームを実行できます（相手の石と空白は無視されます）</li>
            <li>任意の世代数を選んでシミュレーションを実行できます</li>
            <li>ライフゲーム終了後は相手のターンになります</li>
          </ul>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-3">コンウェイのライフゲームとは</h2>
          <p>コンウェイのライフゲームは以下のルールで進行します：</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>生きているセル（自分の石）の周囲8マスに生きているセルが2つか3つある場合、そのセルは生存します</li>
            <li>生きているセルの周囲8マスに生きているセルが1つ以下、または4つ以上ある場合、そのセルは過疎または過密により死滅します</li>
            <li>死んでいるセル（空白）の周囲8マスに生きているセルがちょうど3つある場合、そのセルに新しい生命が誕生します</li>
          </ul>
          <p className="mt-2">ただし、このゲームでは自分の石だけが「生きているセル」として扱われ、相手の石や空白マスはライフゲームの計算で無視されます。</p>
        </section>
      </div>
      
      <div className="mt-8">
        <Link 
          href="/"
          className="inline-block py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          トップに戻る
        </Link>
      </div>
    </div>
  );
}
