class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    this.youBall = this.game.registry.get('youBall') || 'sword';
    this.rivalBall = this.game.registry.get('rivalBall') || 'gun';
    this.spin = 0;
    this.choices = [];

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, W, H);
    bg.lineStyle(1, 0x1a2233, 1);
    for (let x = 0; x < W; x += 40) bg.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) bg.lineBetween(0, y, W, y);

    this.add.text(W / 2, 58, 'SPIN ARENA', {
      fontSize: '52px',
      fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
      color: '#f4f7ff',
    }).setOrigin(0.5);

    this.add.text(W / 2, 112, 'Pick two balls. You control the left one.', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#9aa4b8',
    }).setOrigin(0.5);

    this.addSlot(250, 'YOUR BALL', 'you');
    this.addSlot(710, 'RIVAL BALL', 'rival');

    this.vsText = this.add.text(W / 2, 400, '', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#d5dbe6',
    }).setOrigin(0.5);

    this.fight = this.add.text(W / 2, 470, 'ENTER ARENA', {
      fontSize: '28px',
      fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
      color: '#071018',
      backgroundColor: '#7dffb3',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.fight.on('pointerdown', () => this.startGame());
    this.fight.on('pointerover', () => this.fight.setScale(1.04));
    this.fight.on('pointerout', () => this.fight.setScale(1));

    this.add.text(W / 2, 548, 'WASD push   ·   Click dash   ·   F flip spin', {
      fontSize: '16px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#8b95a8',
    }).setOrigin(0.5);

    this.rings = this.add.graphics().setDepth(4);
    this.refresh();

    this.input.keyboard.on('keydown-ONE', () => this.pick('you', 'sword'));
    this.input.keyboard.on('keydown-TWO', () => this.pick('you', 'gun'));
    this.input.keyboard.on('keydown-THREE', () => this.pick('rival', 'sword'));
    this.input.keyboard.on('keydown-FOUR', () => this.pick('rival', 'gun'));
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
  }

  addSlot(x, title, slot) {
    this.add.text(x, 168, title, {
      fontSize: '20px',
      fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
      color: '#f4f7ff',
    }).setOrigin(0.5);

    ['sword', 'gun'].forEach((id, index) => {
      const type = BALL_TYPES[id];
      const bx = x + (index === 0 ? -78 : 78);
      const by = 268;
      const circle = this.add.circle(bx, by, 42, type.color)
        .setInteractive({ useHandCursor: true })
        .setDepth(3);
      circle.on('pointerdown', () => this.pick(slot, id));
      this.add.text(bx, by + 62, type.name, {
        fontSize: '16px',
        fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
        color: '#f4f7ff',
      }).setOrigin(0.5);
      this.add.text(bx, by + 84, type.blurb, {
        fontSize: '12px',
        fontFamily: 'Trebuchet MS, sans-serif',
        color: '#9aa4b8',
        align: 'center',
        wordWrap: { width: 130 },
      }).setOrigin(0.5);
      this.choices.push({ slot, id, x: bx, y: by });
    });
  }

  pick(slot, id) {
    if (slot === 'you') this.youBall = id;
    else this.rivalBall = id;
    this.refresh();
  }

  refresh() {
    const you = BALL_TYPES[this.youBall];
    const rival = BALL_TYPES[this.rivalBall];
    this.vsText.setText(`YOU  ${you.name}    vs    RIVAL  ${rival.name}`);
  }

  startGame() {
    SFX.unlock();
    this.game.registry.set('youBall', this.youBall);
    this.game.registry.set('rivalBall', this.rivalBall);
    this.scene.start('GameScene');
  }

  update(_time, delta) {
    this.spin += delta * 0.003;
    const g = this.rings;
    g.clear();
    for (const choice of this.choices) {
      const selected = (choice.slot === 'you' ? this.youBall : this.rivalBall) === choice.id;
      if (!selected) continue;
      g.lineStyle(4, 0x7dffb3, 1);
      g.strokeCircle(choice.x, choice.y, 50);
      const type = BALL_TYPES[choice.id];
      const ang = this.spin * (type.weapon === 'sword' ? 1 : 0.45);
      g.lineStyle(4, 0xfff6df, 1);
      g.lineBetween(
        choice.x,
        choice.y,
        choice.x + Math.cos(ang) * 34,
        choice.y + Math.sin(ang) * 34
      );
    }
  }
}
