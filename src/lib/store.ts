import { Room } from "./types";

// メモリ内でルーム情報を保存
export const rooms = new Map<string, Room>();

// 接続中のソケットとルームのマッピング
export const socketRooms = new Map<string, string>();