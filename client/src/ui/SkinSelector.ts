import { 
  SKIN_COLORS, 
  SKIN_PATTERNS, 
  SnakeSkin, 
  SkinPattern,
  SkinColor 
} from '../../../shared/types';

// 只保留這三個翻譯
const PATTERN_LABELS: Record<string, string> = {
  solid: '純色',
  neon: '故障 (Glitch)',
  rainbow: '彩虹'
};

export class SkinSelector {
  private selectedColorIndex: number = 0;
  private selectedPattern: SkinPattern = 'solid'; // 預設改為純色
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  
  constructor() {
    this.previewCanvas = document.getElementById('skinPreview') as HTMLCanvasElement;
    this.previewCtx = this.previewCanvas.getContext('2d')!;
    
    this.initializeColorPicker();
    this.initializePatternPicker();
    this.updatePreview();
  }
  
  private initializeColorPicker(): void {
    const container = document.getElementById('colorPicker');
    if (!container) return;
    
    container.innerHTML = '';
    
    SKIN_COLORS.forEach((color, index) => {
      const btn = document.createElement('button');
      btn.className = `color-option${index === this.selectedColorIndex ? ' selected' : ''}`;
      btn.style.background = `rgb(${color.primary.r}, ${color.primary.g}, ${color.primary.b})`;
      btn.title = color.name;
      
      btn.addEventListener('click', () => {
        this.selectedColorIndex = index;
        this.updateColorSelection();
        this.updatePreview();
      });
      
      container.appendChild(btn);
    });
  }
  
  private initializePatternPicker(): void {
    const container = document.getElementById('patternPicker');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 【重點】只允許這三個按鈕顯示在畫面上！
    const allowedPatterns = ['solid', 'rainbow', 'neon'];
    
    SKIN_PATTERNS.forEach((pattern) => {
      if (!allowedPatterns.includes(pattern)) return; // 不要的就隱藏
        
      const btn = document.createElement('button');
      btn.className = `pattern-option${pattern === this.selectedPattern ? ' selected' : ''}`;
      btn.textContent = PATTERN_LABELS[pattern];
      btn.dataset.pattern = pattern;
      
      btn.addEventListener('click', () => {
        this.selectedPattern = pattern;
        this.updatePatternSelection();
        this.updatePreview();
      });
      
      container.appendChild(btn);
    });
  }
  
  private updateColorSelection(): void {
    const options = document.querySelectorAll('.color-option');
    options.forEach((opt, index) => {
      opt.classList.toggle('selected', index === this.selectedColorIndex);
    });
  }
  
  private updatePatternSelection(): void {
    const options = document.querySelectorAll('.pattern-option');
    options.forEach((opt) => {
      const optElement = opt as HTMLElement;
      opt.classList.toggle('selected', optElement.dataset.pattern === this.selectedPattern);
    });
  }
  
  private updatePreview(): void {
    const canvas = this.previewCanvas;
    const ctx = this.previewCtx;
    const color = SKIN_COLORS[this.selectedColorIndex];
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const segmentCount = 8;
    const segmentRadius = 12;
    const startX = segmentRadius * 1.5;
    const spacing = (canvas.width - segmentRadius * 3) / (segmentCount - 1);
    const centerY = canvas.height / 2;
    const headX = startX + (segmentCount - 1) * spacing; // 蛇頭永遠在最右端
    
    // 1. 畫出滑順的身體絲帶
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = segmentRadius * 1.8; 
    this.drawSegment(ctx, startX, centerY, spacing, segmentCount, color);
    
    // 2. 畫蛇頭 (強制疊在身體前端，確保形狀完美)
    ctx.beginPath();
    ctx.arc(headX, centerY, segmentRadius * 0.9, 0, Math.PI * 2);
    // 故障風的頭偶爾也會閃白光
    const isGlitching = this.selectedPattern === 'neon' && Math.random() > 0.8;
    ctx.fillStyle = isGlitching ? '#FFFFFF' : `rgb(${color.primary.r}, ${color.primary.g}, ${color.primary.b})`;
    ctx.fill();
    
    // 3. 畫上萌萌的兩顆大眼睛
    this.drawEyes(ctx, headX, centerY, segmentRadius);
  }
  
  private drawSegment(
    ctx: CanvasRenderingContext2D, 
    startX: number, 
    y: number, 
    spacing: number,
    segmentCount: number,
    color: SkinColor
  ): void {
    const { primary } = color;
    const endX = startX + (segmentCount - 1) * spacing;
    
    const drawLine = (style: string | CanvasGradient) => {
        ctx.beginPath();
        ctx.strokeStyle = style;
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    };

    switch (this.selectedPattern) {
      case 'rainbow': {
        const grad = ctx.createLinearGradient(startX, y, endX, y);
        for(let i = 0; i <= 6; i++) {
            grad.addColorStop(i / 6, `hsl(${(i / 6) * 360}, 80%, 60%)`);
        }
        drawLine(grad);
        break;
      }
      case 'neon': {
        // 故障風專屬錯位特效
        const offset = (Math.random() - 0.5) * 8; 
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; // 青色
        ctx.moveTo(startX, y + offset);
        ctx.lineTo(endX, y + offset);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)'; // 洋紅
        ctx.moveTo(startX, y - offset);
        ctx.lineTo(endX, y - offset);
        ctx.stroke();
        
        const isGlitching = Math.random() > 0.7;
        drawLine(isGlitching ? '#FFFFFF' : `rgb(${primary.r}, ${primary.g}, ${primary.b})`);
        break;
      }
      case 'solid':
      default:
        drawLine(`rgb(${primary.r}, ${primary.g}, ${primary.b})`);
        break;
    }
  }
  
  private drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    const eyeOffsetX = radius * 0.2; // 眼睛朝向右邊
    const eyeOffsetY = radius * 0.4; // 兩眼距離
    const eyeRadius = radius * 0.3;  // 眼白大小
    
    // 眼白
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2); ctx.fill();
    
    // 黑瞳孔
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(x + eyeOffsetX + 1, y - eyeOffsetY, eyeRadius * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOffsetX + 1, y + eyeOffsetY, eyeRadius * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  
  getSkin(): SnakeSkin {
    return {
      pattern: this.selectedPattern,
      colorIndex: this.selectedColorIndex
    };
  }
}