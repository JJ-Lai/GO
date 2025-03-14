import { Injectable } from '@angular/core';
import { GameService, Position, Stone } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  constructor(private gameService: GameService) {}

  // 使用简单的启发式算法选择位置
  makeMove(): Position | null {
    const board = this.gameService.getBoard();
    const validMoves = this.getValidMoves();
    
    if (validMoves.length === 0) {
      return null;
    }

    // 评估每个可能的位置
    const scoredMoves = validMoves.map(move => ({
      move,
      score: this.evaluatePosition(move)
    }));

    // 选择得分最高的位置
    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].move;
  }

  private getValidMoves(): Position[] {
    const board = this.gameService.getBoard();
    const validMoves: Position[] = [];
    
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (this.gameService.isValidMove(i, j)) {
          validMoves.push({ row: i, col: j });
        }
      }
    }
    
    return validMoves;
  }

  private evaluatePosition(pos: Position): number {
    let score = 0;
    const board = this.gameService.getBoard();
    
    // 靠近中心的位置得分较高
    const centerDistance = Math.abs(pos.row - 9) + Math.abs(pos.col - 9);
    score += (18 - centerDistance) * 2;

    // 靠近其他棋子的位置得分较高
    const adjacent = [
      [pos.row - 1, pos.col],
      [pos.row + 1, pos.col],
      [pos.row, pos.col - 1],
      [pos.row, pos.col + 1]
    ];

    adjacent.forEach(([r, c]) => {
      if (r >= 0 && r < 19 && c >= 0 && c < 19) {
        if (board[r][c] !== 0) {
          score += 5;
        }
      }
    });

    // 星位点额外得分
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ];
    if (starPoints.some(point => point[0] === pos.row && point[1] === pos.col)) {
      score += 10;
    }

    return score;
  }
}