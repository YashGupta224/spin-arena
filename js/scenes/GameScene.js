class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    this.ended = false;
    this.fighters = [];
    this.bullets = [];
    this.player = null;
    this.pendingRemoves = [];

    this.drawArena();
    this.buildWalls();
    this.bumper = this.matter.add.circle(W / 2, H / 2, 34, {
      isStatic: true,
      restitution: 1,
      friction: 0,
      frictionStatic: 0,
      label: 'bumper',
    });
    this.bumperGfx = this.add.graphics().setDepth(2);

    this.bulletGfx = this.add.graphics().setDepth(4);
    this.spawnRoster();
    const MatterLib = Phaser.Physics.Matter.Matter;
    if (MatterLib.Resolver) MatterLib.Resolver._restingThresh = 0.05;

    this.matter.world.on('collisionstart', this.onCollide, this);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      f: Phaser.Input.Keyboard.KeyCodes.F,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.input.on('pointerdown', (ptr) => this.dashToward(ptr));
    this.input.keyboard.on('keydown-R', () => {
      if (!this.ended) this.scene.restart();
    });

    this.hudAlive = this.add.text(W / 2, 18, '', {
      fontSize: '18px',
      fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
      color: '#f4f7ff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    this.hudKills = this.add.text(W - 24, 18, '', {
      fontSize: '16px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#ffe08a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(10);

    this.hudHelp = this.add.text(16, H - 8, 'WASD push   ·   Click dash   ·   F flip spin   ·   R restart', {
      fontSize: '14px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#d5dbe6',
    }).setOrigin(0, 1).setDepth(10);

    this.countdown = 3;
    this.frozen = true;
    this.countText = this.add.text(W / 2, H / 2, '3', {
      fontSize: '96px',
      fontFamily: 'Arial Black, Trebuchet MS, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20);

    this.matter.world.pause();
    this.time.addEvent({
      delay: 700,
      repeat: 2,
      callback: () => {
        this.countdown -= 1;
        if (this.countdown > 0) {
          this.countText.setText(String(this.countdown));
        } else {
          this.countText.setText('FIGHT');
          this.frozen = false;
          this.graceUntil = this.time.now + 700;
          this.matter.world.resume();
          this.time.delayedCall(500, () => this.countText.destroy());
        }
      },
    });

    this.exposeTestAPI();
  }

  exposeTestAPI() {
    if (!GAME_CONFIG.debug && !GAME_CONFIG.testMode) return;
    window.__GAME__ = {
      scene: this,
      alive: () => this.fighters.filter((f) => f.alive).length,
      playerHp: () => (this.player && this.player.alive ? this.player.hp : 0),
      bulletCount: () => this.bullets.length,
      isEnded: () => this.ended,
      playerSpeed: () => {
        if (!this.player || !this.player.alive) return 0;
        const v = this.player.body.velocity;
        return Math.hypot(v.x, v.y);
      },
    };
  }

  drawArena() {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const wall = GAME_CONFIG.wall;
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x07080f, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1, 0x182033, 0.9);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);
    g.fillStyle(0x10151f, 1);
    g.fillRoundedRect(wall, wall, W - wall * 2, H - wall * 2, 18);
    g.lineStyle(4, 0x355dff, 0.9);
    g.strokeRoundedRect(wall, wall, W - wall * 2, H - wall * 2, 18);
    g.lineStyle(2, 0xffb703, 0.35);
    g.strokeCircle(W / 2, H / 2, 150);
  }

  buildWalls() {
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const t = GAME_CONFIG.wall;
    const opts = {
      isStatic: true,
      restitution: 1,
      friction: 0,
      frictionStatic: 0,
      label: 'wall',
    };
    this.matter.add.rectangle(W / 2, t / 2, W, t, opts);
    this.matter.add.rectangle(W / 2, H - t / 2, W, t, opts);
    this.matter.add.rectangle(t / 2, H / 2, t, H, opts);
    this.matter.add.rectangle(W - t / 2, H / 2, t, H, opts);
  }

  spawnRoster() {
    const youType = BALL_TYPES[this.game.registry.get('youBall')] || BALL_TYPES.sword;
    const rivalType = BALL_TYPES[this.game.registry.get('rivalBall')] || BALL_TYPES.gun;
    const sameLook = youType.color === rivalType.color;
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    const pair = [
      {
        name: 'YOU',
        weapon: youType.weapon,
        isPlayer: true,
        color: youType.color,
        spin: youType.spin,
        x: W * 0.3,
        y: H * 0.42,
        vx: 2.4,
        vy: 3.1,
        orbit: 1,
      },
      {
        name: 'RIVAL',
        weapon: rivalType.weapon,
        isPlayer: false,
        color: sameLook ? rivalType.alt : rivalType.color,
        spin: -rivalType.spin,
        x: W * 0.7,
        y: H * 0.58,
        vx: -2.6,
        vy: -2.4,
        orbit: -1,
      },
    ];

    pair.forEach((entry) => {
      const fighter = new Fighter(this, entry.x, entry.y, entry);
      this.fighters.push(fighter);
      if (fighter.isPlayer) this.player = fighter;
    });
  }

  dashToward(ptr) {
    SFX.unlock();
    if (this.frozen || this.ended || !this.player || !this.player.alive) return;
    const angle = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
    this.player.dash(Math.cos(angle), Math.sin(angle));
  }

  onCollide(event) {
    for (const pair of event.pairs) {
      this.handlePair(pair.bodyA, pair.bodyB);
    }
  }

  handlePair(a, b) {
    const bullet = a.label === 'bullet' ? a : b.label === 'bullet' ? b : null;
    if (bullet) {
      if (bullet.dead) return;
      const other = bullet === a ? b : a;
      if (other.label === 'wall' || other.label === 'bumper') {
        bullet.bounces = (bullet.bounces || 0) + 1;
        if (bullet.bounces > 3) this.removeBullet(bullet);
      }
      return;
    }

    if (a.label === 'fighter' && b.label === 'fighter') {
      this.slam(a.fighter, b.fighter);
    }
  }

  slam(a, b) {
    if (!a || !b || !a.alive || !b.alive) return;
    const now = this.time.now;
    if (now < a.slamReadyAt || now < b.slamReadyAt) return;
    const rv = Math.hypot(a.body.velocity.x - b.body.velocity.x, a.body.velocity.y - b.body.velocity.y);
    if (rv < 6) return;
    a.slamReadyAt = now + 500;
    b.slamReadyAt = now + 500;
    const dmg = Math.min(10, (rv - 4) * 1.2);
    a.damage(dmg, b);
    b.damage(dmg, a);
    this.bursts((a.x + b.x) / 2, (a.y + b.y) / 2, 0xffffff, 8);
  }

  queueRemove(body) {
    if (!body || body._queued) return;
    body._queued = true;
    this.pendingRemoves.push(body);
  }

  flushRemoves() {
    if (!this.pendingRemoves.length) return;
    const batch = this.pendingRemoves;
    this.pendingRemoves = [];
    for (const body of batch) this.matter.world.remove(body);
  }

  removeBullet(body) {
    if (!body || body.dead) return;
    body.dead = true;
    this.bullets = this.bullets.filter((b) => b !== body);
    this.queueRemove(body);
  }

  bursts(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color).setDepth(8);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(-70, 70),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(220, 420),
        onComplete: () => dot.destroy(),
      });
    }
  }

  onFighterDown() {
    this.checkEnd();
  }

  steerPlayer() {
    const p = this.player;
    if (!p || !p.alive) return;
    let x = 0;
    let y = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) x -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) x += 1;
    if (this.keys.up.isDown || this.keys.w.isDown) y -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown) y += 1;
    if (x || y) {
      const len = Math.hypot(x, y);
      p.thrust(x / len, y / len, 0.012);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      const v = p.body.velocity;
      const speed = Math.hypot(v.x, v.y) || 1;
      p.dash(v.x / speed, v.y / speed);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) p.flipSpin();
  }

  checkEnd() {
    if (this.ended) return;
    const playerAlive = this.player && this.player.alive;
    const alive = this.fighters.filter((f) => f.alive);
    if (!playerAlive || alive.length <= 1) {
      this.ended = true;
      const won = playerAlive && alive.length === 1;
      const kills = this.player ? this.player.kills : 0;
      this.time.delayedCall(800, () => {
        this.scene.start('GameOverScene', { won, kills });
      });
    }
  }

  updateHud() {
    const you = this.player;
    const rival = this.fighters.find((f) => f && !f.isPlayer);
    const youHp = you && you.alive ? Math.ceil(you.hp) : 0;
    const rivalHp = rival && rival.alive ? Math.ceil(rival.hp) : 0;
    const youName = you ? you.weapon.toUpperCase() : 'YOU';
    const rivalName = rival ? rival.weapon.toUpperCase() : 'RIVAL';
    this.hudAlive.setText(`YOU ${youName}  ${youHp}`);
    this.hudKills.setText(`${rivalName}  ${rivalHp}`);
  }

  drawBumper() {
    const g = this.bumperGfx;
    const x = this.bumper.position.x;
    const y = this.bumper.position.y;
    const pulse = 34 + Math.sin(this.time.now / 200) * 2;
    g.clear();
    g.fillStyle(0xffb703, 0.18);
    g.fillCircle(x, y, pulse + 10);
    g.fillStyle(0xffb703, 1);
    g.fillCircle(x, y, 34);
    g.lineStyle(3, 0xfff6df, 0.9);
    g.strokeCircle(x, y, 34);
  }

  updateBullets(now) {
    const g = this.bulletGfx;
    g.clear();
    for (const bullet of [...this.bullets]) {
      if (bullet.dead) continue;
      if (now - bullet.born > 1600) {
        this.removeBullet(bullet);
        continue;
      }
      const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y);
      if (speed < 0.35) {
        this.removeBullet(bullet);
        continue;
      }
      for (const fighter of this.fighters) {
        if (!fighter.alive || fighter === bullet.owner) continue;
        const dist = Phaser.Math.Distance.Between(bullet.position.x, bullet.position.y, fighter.x, fighter.y);
        if (dist <= fighter.radius + 5) {
          fighter.damage(GAME_CONFIG.bulletDamage, bullet.owner);
          this.bursts(bullet.position.x, bullet.position.y, 0xfff3bf, 4);
          this.removeBullet(bullet);
          break;
        }
      }
      if (bullet.dead) continue;
      g.fillStyle(bullet.owner.color, 0.35);
      g.fillCircle(bullet.position.x, bullet.position.y, 9);
      g.fillStyle(0xfff3bf, 1);
      g.fillCircle(bullet.position.x, bullet.position.y, 4);
    }
  }

  update() {
    const now = this.time.now;
    this.flushRemoves();
    this.drawBumper();
    this.updateHud();

    if (!this.frozen && !this.ended) {
      this.steerPlayer();
      for (const fighter of this.fighters) {
        fighter.maintain();
        fighter.updateAI(this.fighters, now);
        fighter.attack(this.fighters, now);
      }
      this.updateBullets(now);
    } else {
      this.bulletGfx.clear();
    }

    for (const fighter of this.fighters) fighter.draw();
  }
}
