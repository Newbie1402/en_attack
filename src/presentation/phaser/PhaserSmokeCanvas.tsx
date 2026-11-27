import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

class FoundationScene extends Phaser.Scene {
  public constructor() {
    super('foundation-scene');
  }

  public create(): void {
    const { width, height } = this.scale;
    const boardLeft = Math.max(28, width * 0.08);
    const boardTop = 56;
    const boardWidth = width - boardLeft * 2;
    const boardHeight = Math.min(height - 112, boardWidth * 0.5);
    const cellWidth = boardWidth / 10;
    const cellHeight = boardHeight / 5;
    const graphics = this.add.graphics();

    graphics.fillStyle(0x9ecf82, 1);
    graphics.fillRoundedRect(boardLeft, boardTop, boardWidth, boardHeight, 24);
    graphics.lineStyle(2, 0xd9efc6, 0.8);
    for (let col = 0; col <= 10; col += 1) {
      graphics.lineBetween(
        boardLeft + col * cellWidth,
        boardTop,
        boardLeft + col * cellWidth,
        boardTop + boardHeight,
      );
    }
    for (let row = 0; row <= 5; row += 1) {
      graphics.lineBetween(
        boardLeft,
        boardTop + row * cellHeight,
        boardLeft + boardWidth,
        boardTop + row * cellHeight,
      );
    }

    graphics.fillStyle(0xfff5e5, 1);
    graphics.fillCircle(
      boardLeft + cellWidth * 1.5,
      boardTop + cellHeight * 2.5,
      Math.min(cellWidth, cellHeight) * 0.28,
    );
    graphics.fillStyle(0x26354d, 1);
    graphics.fillTriangle(
      boardLeft + cellWidth * 1.9,
      boardTop + cellHeight * 2.5,
      boardLeft + cellWidth * 1.35,
      boardTop + cellHeight * 2.15,
      boardLeft + cellWidth * 1.35,
      boardTop + cellHeight * 2.85,
    );
    graphics.fillStyle(0xf97316, 1);
    graphics.fillTriangle(
      boardLeft + cellWidth * 1.4,
      boardTop + cellHeight * 2.65,
      boardLeft + cellWidth * 1.05,
      boardTop + cellHeight * 2.2,
      boardLeft + cellWidth * 1.05,
      boardTop + cellHeight * 3.1,
    );
    graphics.fillCircle(boardLeft + cellWidth * 1.65, boardTop + cellHeight * 2.4, 4);

    this.add
      .text(boardLeft + cellWidth * 4.5, boardTop + cellHeight * 1.8, '✦', {
        color: '#fff5e5',
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
      })
      .setOrigin(0.5);
    this.add
      .text(boardLeft + cellWidth * 7.7, boardTop + cellHeight * 2.7, '❄', {
        color: '#dff6ff',
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
      })
      .setOrigin(0.5);
  }
}

export function PhaserSmokeCanvas(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#e9f5da',
      scene: [FoundationScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 900,
        height: 520,
      },
      render: {
        antialias: true,
        roundPixels: true,
      },
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div className="phaser-mount" ref={containerRef} aria-label="Chiến trường SnowGraph" />;
}
