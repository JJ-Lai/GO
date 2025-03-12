import { Injectable } from '@angular/core';

export type Stone = 0 | 1 | 2; // 0: 空, 1: 黑, 2: 白
export type Board = Stone[][];
export interface Position {
  row: number;
  col: number;
}
export interface GameState {
  board: Board;
  currentPlayer: Stone;
  gameOver: boolean;
  winner?: Stone;
  score: {
    black: number;
    white: number;
  };
}
@Injectable({
  providedIn: 'root'
})
export class GameService {
  private boardSize = 19;
  private board: Board = [];
  private currentPlayer: Stone = 1;
  private lastMove?: Position;
  private koPoint?: Position;
  private moveHistory: Position[] = [];
  private capturedStones = { black: 0, white: 0 };
  private gameOver = false;
  private passes = 0;

  private findGroup(row: number, col: number): Position[] {
    const color = this.board[row][col];
    const group: Position[] = [];
    const visited = new Set<string>();
    const explore = (r: number, c: number) => {
      const key = `${r},${c}`;
      if (visited.has(key)) return;
      if (r < 0 || r >= this.boardSize || c < 0 || c >= this.boardSize) return;
      if (this.board[r][c] !== color) return;

      visited.add(key);
      group.push({ row: r, col: c });

      explore(r - 1, c);
      explore(r + 1, c);
      explore(r, c - 1);
      explore(r, c + 1);
    };

    explore(row, col);
    return group;
  }

  private countLiberties(group: Position[]): number {
    const liberties = new Set<string>();

    group.forEach(({ row, col }) => {
      const adjacent = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1]
      ];

      adjacent.forEach(([r, c]) => {
        if (r >= 0 && r < this.boardSize && 
            c >= 0 && c < this.boardSize && 
            this.board[r][c] === 0) {
          liberties.add(`${r},${c}`);
        }
      });
    });

    return liberties.size;
  }

  private findCapturedStones(row: number, col: number): Position[] {
    const captured: Position[] = [];
    const opponent = this.currentPlayer === 1 ? 2 : 1;
    
    // 检查四周的对手棋子
    const adjacent = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ];

    adjacent.forEach(([r, c]) => {
      if (r >= 0 && r < this.boardSize && 
          c >= 0 && c < this.boardSize && 
          this.board[r][c] === opponent) {
        const group = this.findGroup(r, c);
        if (this.countLiberties(group) === 0) {
          captured.push(...group);
        }
      }
    });

    return captured;
  }

  constructor() {
    this.initializeBoard();
  }

  initializeBoard(): void {
    this.board = Array(this.boardSize)
      .fill(0)
      .map(() => Array(this.boardSize).fill(0));
  }
   // 获取游戏状态
  getGameState(): GameState {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      score: {
        black: this.capturedStones.black,
        white: this.capturedStones.white
      }
    };
  }
  getBoard(): Board {
    return this.board;
  }

  getCurrentPlayer(): Stone {
    return this.currentPlayer;
  }

  // 处理玩家落子
  makeMove(row: number, col: number): boolean {
    // 如果游戏结束，不允许继续落子
    if (this.gameOver) {
      return false;
    }

    // 重置连续过的次数
    this.passes = 0;

    if (!this.isValidMove(row, col)) {
      return false;
    }

    // 检查打劫
    if (this.koPoint?.row === row && this.koPoint?.col === col) {
      this.board[row][col] = 0;
      return false;
    }

    // // 保存当前棋盘状态
    // const previousBoard = this.board.map(row => [...row]);
    
    // 临时放置棋子
    this.board[row][col] = this.currentPlayer;
    
    // 计算提子
    const capturedStones = this.findCapturedStones(row, col);
    
    // 检查是否自杀
    if (capturedStones.length === 0) {
      const group = this.findGroup(row, col);
      if (this.countLiberties(group) === 0) {
        this.board[row][col] = 0;
        return false;
      }
    }

    // 更新打劫点
    this.koPoint = undefined;
    if (capturedStones.length === 1) {
      const lastGroup = this.findGroup(row, col);
      if (lastGroup.length === 1 && this.countLiberties(lastGroup) === 0) {
        this.koPoint = capturedStones[0];
      }
    }

    // 移除被提的子并更新计数
    capturedStones.forEach(pos => {
      this.board[pos.row][pos.col] = 0;
      if (this.currentPlayer === 1) {
        this.capturedStones.black += 1;
      } else {
        this.capturedStones.white += 1;
      }
    });

    // 记录移动
    this.lastMove = { row, col };
    this.moveHistory.push({ row, col });
    
    // 切换玩家
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    return true;
  }

  // 处理过手
  pass(): void {
    this.passes += 1;
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    
    // 两次连续过手，游戏结束
    if (this.passes >= 2) {
      this.endGame();
    }
  }

  // 检查是否为有效移动
  private isValidMove(row: number, col: number): boolean {
    // 检查是否在棋盘范围内
    if (!this.isValidPosition(row, col)) {
      return false;
    }

    // 检查位置是否已被占用
    if (this.board[row][col] !== 0) {
      return false;
    }

    // 检查是否为禁入点
    if (this.isSuicideMove(row, col)) {
      return false;
    }

    return true;
  }
  // 检查是否为自杀手
  private isSuicideMove(row: number, col: number): boolean {
  // 临时放置棋子
  this.board[row][col] = this.currentPlayer;
  
  // 检查是否有提子
  const capturedStones = this.findCapturedStones(row, col);
  
  // 如果没有提子，检查是否自杀
  let isSuicide = false;
  if (capturedStones.length === 0) {
    const group = this.findGroup(row, col);
    if (this.countLiberties(group) === 0) {
      isSuicide = true;
    }
  }

  // 恢复棋盘状态
  this.board[row][col] = 0;
  return isSuicide;
}

// 结束游戏并计算得分
private endGame(): void {
  this.gameOver = true;
  const territory = this.calculateTerritory();
  this.capturedStones.black += territory.black;
  this.capturedStones.white += territory.white;
}

// 计算领地
private calculateTerritory(): { black: number, white: number } {
  const territory = { black: 0, white: 0 };
  const visited = new Set<string>();

  for (let row = 0; row < this.boardSize; row++) {
    for (let col = 0; col < this.boardSize; col++) {
      if (this.board[row][col] === 0 && !visited.has(`${row},${col}`)) {
        const region = this.findEmptyRegion(row, col, visited);
        const owner = this.determineRegionOwner(region);
        if (owner === 1) {
          territory.black += region.length;
        } else if (owner === 2) {
          territory.white += region.length;
        }
      }
    }
  }

  return territory;
}

// 找到空白区域
private findEmptyRegion(row: number, col: number, visited: Set<string>): Position[] {
  const region: Position[] = [];
  const queue: Position[] = [{ row, col }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row},${current.col}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    if (this.board[current.row][current.col] === 0) {
      region.push(current);
      
      // 检查相邻位置
      const adjacent = [
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 }
      ];
      
      for (const pos of adjacent) {
        if (this.isValidPosition(pos.row, pos.col) && 
            !visited.has(`${pos.row},${pos.col}`) && 
            this.board[pos.row][pos.col] === 0) {
          queue.push(pos);
        }
      }
    }
  }
  
  return region;
}
// 判断区域归属
private determineRegionOwner(region: Position[]): Stone {
  let blackCount = 0;
  let whiteCount = 0;

  // 检查区域边界的棋子颜色
  region.forEach(pos => {
    const adjacent = [
      { row: pos.row - 1, col: pos.col },
      { row: pos.row + 1, col: pos.col },
      { row: pos.row, col: pos.col - 1 },
      { row: pos.row, col: pos.col + 1 }
    ];

    adjacent.forEach(adj => {
      if (this.isValidPosition(adj.row, adj.col)) {
        if (this.board[adj.row][adj.col] === 1) blackCount++;
        if (this.board[adj.row][adj.col] === 2) whiteCount++;
      }
    });
  });

  // 如果一个颜色完全包围了该区域，则该区域属于该颜色
  if (blackCount > 0 && whiteCount === 0) return 1;
  if (whiteCount > 0 && blackCount === 0) return 2;
  return 0; // 中立区域
  }
  // 检查位置是否有效
  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
  }
  getKoPoint(): Position | undefined {
    return this.koPoint;
  }
  // 获取最后一手棋的位置
  getLastMove(): Position | undefined {
    return this.lastMove;
  }
  // 悔棋
  undoMove(): boolean {
    if (this.moveHistory.length === 0) {
      return false;
    }

    // 实现悔棋逻辑
    this.moveHistory.pop();
    this.resetGame();
    
    // 重放之前的所有移动
    const moves = [...this.moveHistory];
    this.moveHistory = [];
    moves.forEach(move => {
      this.makeMove(move.row, move.col);
    });

    return true;
  }
  resign(player: Stone): void {
    this.gameOver = true;
    // 设置获胜者为对手
    this.currentPlayer = player === 1 ? 2 : 1;
  }
  // 重新开始游戏
  resetGame(): void {
    this.board = Array(this.boardSize).fill(0).map(() => Array(this.boardSize).fill(0));
    this.currentPlayer = 1;
    this.lastMove = undefined;
    this.koPoint = undefined;
    this.moveHistory = [];
    this.capturedStones = { black: 0, white: 0 };
    this.gameOver = false;
    this.passes = 0;
  }
  // 获取比分
  getScore(): { black: number, white: number } {
    return this.capturedStones;
  }

  // 获取游戏是否结束
  isGameOver(): boolean {
    return this.gameOver;
  }
}