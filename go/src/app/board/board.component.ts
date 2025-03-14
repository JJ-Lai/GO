import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GameService, Board, Stone } from '../services/game.service';
import { AIService } from '../services/ai.service';
@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css'],
  imports:[CommonModule]
})
export class BoardComponent {
  isAIEnabled = false;
  constructor(private gameService: GameService,private aiService: AIService) {}

  pass(): void {
    this.gameService.pass();
  }

  resign(): void {
    const currentPlayer = this.gameService.getCurrentPlayer();
    this.gameService.resign(currentPlayer);
  }

  undo(): void {
    this.gameService.undoMove();
  }

  isGameOver(): boolean {
    return this.gameService.isGameOver();
  }

  getScore(): { black: number, white: number } {
    return this.gameService.getScore();
  }

  getGameResult(): string {
    const state = this.gameService.getGameState();
    if (state.winner === 1) {
      return '黑棋胜利！';
    } else if (state.winner === 2) {
      return '白棋胜利！';
    }
    return '游戏结束！';
  }
  
  getBoard(): Board {
    return this.gameService.getBoard();
  }

  getCurrentPlayerText(): string {
    return this.gameService.getCurrentPlayer() === 1 ? '黑棋' : '白棋';
  }

  // makeMove(row: number, col: number): void {
  //   this.gameService.makeMove(row, col);
  // }

  async makeMove(row: number, col: number) {
    if (this.gameService.makeMove(row, col)) {
      if (this.isAIEnabled && !this.isGameOver()) {
        // 添加短暂延迟使AI走棋更自然
        await new Promise(resolve => setTimeout(resolve, 500));
        const aiMove = this.aiService.makeMove();
        if (aiMove) {
          this.gameService.makeMove(aiMove.row, aiMove.col);
        } else {
          this.gameService.pass();
        }
      }
    }
  }

  toggleAI(): void {
    this.isAIEnabled = !this.isAIEnabled;
  }

  isStarPoint(row: number, col: number): boolean {
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ];
    return starPoints.some(point => point[0] === row && point[1] === col);
  }
}