import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // WebSocketリクエストの場合
  if (request.headers.get('upgrade') === 'websocket') {
    // WebSocketアップグレード要求を許可
    return NextResponse.next();
  }

  // 通常のHTTPリクエストの場合は標準の処理を続行
  return NextResponse.next();
}

// 特定のパスに対してのみミドルウェアを実行
export const config = {
  matcher: '/api/socket',
}