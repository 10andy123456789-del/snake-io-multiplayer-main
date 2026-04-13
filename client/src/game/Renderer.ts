import { Camera } from './Camera';
import {
  Snake,
  Food,
  PowerUp,
  colorToRgb,
  colorToRgba,
  PowerUpType
} from '../../../shared/types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  constructor(ctx: CanvasRenderingContext2D, camera: Camera) {
    this.ctx = ctx;
    this.camera = camera;
  }

  // Grid settings
  private gridSize: number = 50;
  private gridColor: string = 'rgba(255, 255, 255, 0.03)';

  // Power-up icons
  private powerUpIcons: Record<PowerUpType, string> = {
    shield: '🛡️',
    speed: '⚡',
    magnet: '🧲',
    slow_others: '🐌'
  };

  drawGrid(worldSize: { width: number; height: number }): void {
    const viewport = this.camera.getViewport();
    const ctx = this.ctx;
    
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    // Calculate visible grid lines
    const startX = Math.floor(viewport.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(viewport.y / this.gridSize) * this.gridSize;
    const endX = Math.min(viewport.x + viewport.width + this.gridSize, worldSize.width);
    const endY = Math.min(viewport.y + viewport.height + this.gridSize, worldSize.height);

    ctx.beginPath();
    
    // Vertical lines
    for (let x = startX; x <= endX; x += this.gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY; y += this.gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    
    ctx.stroke();
  }

  drawWorldBorder(worldSize: { width: number; height: number }): void {
    const ctx = this.ctx;
    
    // Draw border with glow
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 20;
    
    ctx.strokeRect(0, 0, worldSize.width, worldSize.height);
    
    ctx.shadowBlur = 0;
  }

  drawSnake(snake: Snake, isCurrentPlayer: boolean): void {
    // 至少需要兩個節點才能畫線
    if (!snake || !snake.segments || snake.segments.length < 2) return;
    if (!snake.color) snake.color = { r: 255, g: 255, b: 255 };
    
    const ctx = this.ctx;
    const segments = snake.segments;
    const head = segments[0];
    const tail = segments[segments.length - 1];
    
    // 1. 設定絲帶畫筆 (這裡直接決定了蛇的粗細與滑順度)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = head.radius * 2;
    
    // 2. 準備一個「描繪蛇身路徑」的小幫手
    const traceBody = (offsetX = 0, offsetY = 0) => {
      ctx.beginPath();
      ctx.moveTo(head.position.x + offsetX, head.position.y + offsetY);
      for (let i = 1; i < segments.length; i++) {
        ctx.lineTo(segments[i].position.x + offsetX, segments[i].position.y + offsetY);
      }
    };

    // 3. 取得這條蛇的皮膚設定 (如果沒有就預設純色)
    const pattern = snake.skin?.pattern || 'solid';
    const primaryRgb = `rgb(${snake.color.r}, ${snake.color.g}, ${snake.color.b})`;

    // 4. 根據皮膚上色
    switch (pattern) {
      case 'rainbow': {
        // 彩虹：頭尾拉一條漸層
        const grad = ctx.createLinearGradient(head.position.x, head.position.y, tail.position.x, tail.position.y);
        for(let i = 0; i <= 6; i++) {
            grad.addColorStop(i / 6, `hsl(${(i / 6) * 360}, 80%, 60%)`);
        }
        traceBody();
        ctx.strokeStyle = grad;
        ctx.stroke();
        break;
      }
      
      case 'neon': {
        // --- 未來已讀專屬：故障風 (Glitch) 靜態色散護眼版 ---
        // 取消每秒 60 次的隨機閃爍，改成固定的位移量
        const offset = head.radius * 0.3; // 根據蛇的大小給定一個固定的錯位距離
        
        // 畫底層：青色殘影 (固定往左上偏移)
        traceBody(-offset, -offset);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.stroke();
        
        // 畫底層：洋紅殘影 (固定往右下偏移)
        traceBody(offset, offset);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
        ctx.stroke();
        
        // 畫主體：拿掉隨機白光，穩穩地顯示主體色
        traceBody();
        ctx.strokeStyle = primaryRgb;
        ctx.stroke();
        break;
      }
      
      case 'solid':
      default: {
        // 純色
        traceBody();
        ctx.strokeStyle = primaryRgb;
        ctx.stroke();
        break;
      }
    }

    // 5. 畫上玩家名稱跟眼睛 (只有頭部在畫面內才畫，節省效能)
    if (this.camera.isVisible(head.position, 50)) {
      this.drawSnakeEyes(snake);
      this.drawSnakeName(snake, isCurrentPlayer);
    }
  }

  drawTouchIndicator(position: { x: number; y: number }): void {
    const ctx = this.ctx;
    
    // Convert screen coordinates to canvas coordinates (since we are drawing on UI layer effectively)
    // But Render.drawGrid uses ApplyCamera, so the context might be transformed.
    // Actually, drawTouchIndicator should be called AFTER camera.reset().
    
    // We assume this is called after camera reset (screen space)
    ctx.beginPath();
    ctx.arc(position.x, position.y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  }

  private drawSnakeEyes(snake: Snake): void {
    const ctx = this.ctx;
    const head = snake.segments[0];
    const direction = snake.direction;
    
    const eyeOffset = head.radius * 0.4;
    const eyeRadius = head.radius * 0.25;
    const pupilRadius = eyeRadius * 0.5;
    
    // Calculate eye positions
    const perpX = Math.cos(direction + Math.PI / 2);
    const perpY = Math.sin(direction + Math.PI / 2);
    const forwardX = Math.cos(direction);
    const forwardY = Math.sin(direction);
    
    const leftEye = {
      x: head.position.x + perpX * eyeOffset + forwardX * eyeOffset,
      y: head.position.y + perpY * eyeOffset + forwardY * eyeOffset
    };
    
    const rightEye = {
      x: head.position.x - perpX * eyeOffset + forwardX * eyeOffset,
      y: head.position.y - perpY * eyeOffset + forwardY * eyeOffset
    };
    
    // Draw eyes (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pupils (black, offset in direction)
    ctx.fillStyle = '#000000';
    const pupilOffsetX = forwardX * eyeRadius * 0.3;
    const pupilOffsetY = forwardY * eyeRadius * 0.3;
    
    ctx.beginPath();
    ctx.arc(leftEye.x + pupilOffsetX, leftEye.y + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEye.x + pupilOffsetX, rightEye.y + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSnakeName(snake: Snake, isCurrentPlayer: boolean): void {
    const ctx = this.ctx;
    const head = snake.segments[0];
    
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Background for better readability
    const name = snake.name;
    const textWidth = ctx.measureText(name).width;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(
      head.position.x - textWidth / 2 - 4,
      head.position.y - head.radius - 24,
      textWidth + 8,
      18
    );
    
    // Text
    ctx.fillStyle = isCurrentPlayer ? '#00d9ff' : '#ffffff';
    ctx.fillText(name, head.position.x, head.position.y - head.radius - 8);
  }

  drawFood(food: Food): void {
    if (!this.camera.isVisible(food.position, food.radius + 10)) return;
    
    const ctx = this.ctx;
    
    // Outer glow
    ctx.shadowColor = colorToRgb(food.color);
    ctx.shadowBlur = food.type === 'snake_remains' ? 15 : 8;
    
    // Create gradient
    const gradient = ctx.createRadialGradient(
      food.position.x, food.position.y, 0,
      food.position.x, food.position.y, food.radius
    );
    
    gradient.addColorStop(0, colorToRgba(food.color, 1));
    gradient.addColorStop(0.7, colorToRgba(food.color, 0.8));
    gradient.addColorStop(1, colorToRgba(food.color, 0.4));
    
    ctx.beginPath();
    ctx.arc(food.position.x, food.position.y, food.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }

  drawPowerUp(powerUp: PowerUp): void {
    if (!this.camera.isVisible(powerUp.position, powerUp.radius + 20)) return;
    
    const ctx = this.ctx;
    
    // Pulsating effect
    const pulse = Math.sin(Date.now() / 200) * 0.2 + 1;
    const radius = powerUp.radius * pulse;
    
    // Background circle with glow
    ctx.shadowColor = this.getPowerUpColor(powerUp.type);
    ctx.shadowBlur = 20;
    
    const gradient = ctx.createRadialGradient(
      powerUp.position.x, powerUp.position.y, 0,
      powerUp.position.x, powerUp.position.y, radius
    );
    
    const color = this.getPowerUpColor(powerUp.type);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + '20');
    
    ctx.beginPath();
    ctx.arc(powerUp.position.x, powerUp.position.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Draw icon
    ctx.font = `${radius}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.powerUpIcons[powerUp.type],
      powerUp.position.x,
      powerUp.position.y
    );
  }

  private getPowerUpColor(type: PowerUpType): string {
    switch (type) {
      case 'shield': return '#00ffff';
      case 'speed': return '#ffff00';
      case 'magnet': return '#ff00ff';
      case 'slow_others': return '#00ff00';
      default: return '#ffffff';
    }
  }
}
