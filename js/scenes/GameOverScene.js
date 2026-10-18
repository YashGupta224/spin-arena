class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.won = !!data.won;
    this.kills = data.kills || 0;
  }

  create() {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, W, H);

    this.add.text(W / 2, 180, this.won ? 'YOU WIN' : 'ELIMINATED', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
      color: this.won ? '#7dffb3' : '#ff5d73',
    }).setOrigin(0.5);

    this.add.text(W / 2, 270, `Kills  ${this.kills}`, {
      fontSize: '28px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#f4f7ff',
    }).setOrigin(0.5);

    this.add.text(W / 2, 360, 'Click or Space — rematch', {
      fontSize: '20px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#d5dbe6',
    }).setOrigin(0.5);

    this.add.text(W / 2, 400, 'M — change weapon', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#8b95a8',
    }).setOrigin(0.5);

    this.time.delayedCall(350, () => {
      this.input.once('pointerdown', () => this.rematch());
      this.input.keyboard.once('keydown-SPACE', () => this.rematch());
      this.input.keyboard.once('keydown-R', () => this.rematch());
      this.input.keyboard.once('keydown-M', () => this.scene.start('MenuScene'));
    });
  }

  rematch() {
    this.scene.start('GameScene');
  }
}
