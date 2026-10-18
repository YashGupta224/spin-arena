/**
 * A bouncing arena ball with a spinning sword or gun.
 * Movement is a Matter.js body. Weapons are drawn from the body's angle.
 */
class Fighter {
  constructor(scene, x, y, opts) {
    this.scene = scene;
    this.name = opts.name;
    this.weapon = opts.weapon;
    this.color = opts.color;
    this.isPlayer = !!opts.isPlayer;
    this.radius = GAME_CONFIG.fighterRadius;
    this.maxHp = GAME_CONFIG.fighterHp;
    this.hp = this.maxHp;
    this.alive = true;
    this.kills = 0;
    this.spin = opts.spin;
    this.orbit = opts.orbit || 1;
    this.flash = 0;
    this.muzzle = 0;
    this.nextShot = 0;
    this.swordHits = new Map();
    this.slamReadyAt = 0;
    this.trail = [];

    this.body = scene.matter.add.circle(x, y, this.radius, {
      restitution: 1,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0.0004,
      density: 0.003,
      label: 'fighter',
      slop: 0.02,
      collisionFilter: { category: 0x0002, mask: 0x0003 },
    });
    this.body.fighter = this;
    scene.matter.body.setVelocity(this.body, { x: opts.vx, y: opts.vy });
    scene.matter.body.setAngle(this.body, Math.random() * Math.PI * 2);
    scene.matter.body.setAngularVelocity(this.body, this.spin);

    this.gfx = scene.add.graphics().setDepth(5);
    this.label = scene.add.text(x, y, this.isPlayer ? 'YOU' : this.name, {
      fontSize: '12px',
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
  }

  get x() {
    return this.body.position.x;
  }

  get y() {
    return this.body.position.y;
  }

  thrust(nx, ny, mag) {
    if (!this.alive) return;
    this.scene.matter.body.applyForce(this.body, this.body.position, {
      x: nx * mag,
      y: ny * mag,
    });
  }

  dash(nx, ny) {
    if (!this.alive) return;
    const v = this.body.velocity;
    this.scene.matter.body.setVelocity(this.body, {
      x: v.x * 0.2 + nx * 5,
      y: v.y * 0.2 + ny * 5,
    });
    this.scene.bursts(this.x, this.y, this.color, 6);
  }

  flipSpin() {
    this.spin *= -1;
  }

  maintain() {
    if (!this.alive) return;
    const current = this.body.angularVelocity;
    const next = current + (this.spin - current) * 0.12;
    this.scene.matter.body.setAngularVelocity(this.body, next);

    const v = this.body.velocity;
    const speed = Math.hypot(v.x, v.y);
    if (speed > GAME_CONFIG.maxSpeed) {
      const s = GAME_CONFIG.maxSpeed / speed;
      this.scene.matter.body.setVelocity(this.body, { x: v.x * s, y: v.y * s });
    }
    this.unstick();
  }

  /** Push a ball back into the floor if it is resting on a wall or corner. */
  unstick() {
    const inset = GAME_CONFIG.wall + this.radius + 4;
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    let x = this.x;
    let y = this.y;
    let vx = this.body.velocity.x;
    let vy = this.body.velocity.y;
    let fix = false;
    const kick = 2.1;

    if (x < inset) {
      x = inset;
      vx = Math.max(vx, kick);
      fix = true;
    } else if (x > W - inset) {
      x = W - inset;
      vx = Math.min(vx, -kick);
      fix = true;
    }
    if (y < inset) {
      y = inset;
      vy = Math.max(vy, kick);
      fix = true;
    } else if (y > H - inset) {
      y = H - inset;
      vy = Math.min(vy, -kick);
      fix = true;
    }
    if (!fix) return;
    this.scene.matter.body.setPosition(this.body, { x, y }, false);
    this.scene.matter.body.setVelocity(this.body, { x: vx, y: vy });
  }

  updateAI(fighters, now) {
    if (!this.alive || this.isPlayer) return;
    let nearest = null;
    let best = Infinity;
    for (const other of fighters) {
      if (!other.alive || other === this) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
      if (d < best) {
        best = d;
        nearest = other;
      }
    }
    if (!nearest) return;

    const inset = GAME_CONFIG.wall + 110;
    const W = GAME_CONFIG.width;
    const H = GAME_CONFIG.height;
    if (this.x < inset || this.x > W - inset || this.y < inset || this.y > H - inset) {
      const cx = W / 2 - this.x;
      const cy = H / 2 - this.y;
      const len = Math.hypot(cx, cy) || 1;
      this.thrust(cx / len, cy / len, 0.0022);
      return;
    }

    let dir = Math.atan2(nearest.y - this.y, nearest.x - this.x);
    if (this.weapon === 'sword') {
      dir += this.orbit * 1.15;
    } else if (best < 200) {
      dir += Math.PI;
    } else if (best < 320) {
      dir += this.orbit * (Math.PI / 2);
    }
    dir += Math.sin(now / 420 + this.orbit * 3) * 0.3;
    this.thrust(Math.cos(dir), Math.sin(dir), 0.0015);
  }

  attack(fighters, now) {
    if (!this.alive) return;
    if (this.weapon === 'sword') this.swing(fighters, now);
    else this.shoot(now);
  }

  swing(fighters, now) {
    const angle = this.body.angle;
    const x1 = this.x + Math.cos(angle) * (this.radius * 0.4);
    const y1 = this.y + Math.sin(angle) * (this.radius * 0.4);
    const reach = this.radius + GAME_CONFIG.swordReach;
    const x2 = this.x + Math.cos(angle) * reach;
    const y2 = this.y + Math.sin(angle) * reach;
    this.trail.push({ x: x2, y: y2 });
    if (this.trail.length > 5) this.trail.shift();

    for (const other of fighters) {
      if (!other.alive || other === this) continue;
      const dist = pointSegmentDistance(other.x, other.y, x1, y1, x2, y2);
      if (dist > other.radius + 2) continue;
      const ready = this.swordHits.get(other) || 0;
      if (now < ready) continue;
      this.swordHits.set(other, now + GAME_CONFIG.swordCooldown);
      other.damage(GAME_CONFIG.swordDamage, this);
      this.scene.bursts(other.x, other.y, 0xfff1c9, 5);
      SFX.slash();
    }
  }

  shoot(now) {
    if (now < this.nextShot) return;
    const active = this.scene.bullets.filter((b) => b.owner === this && !b.dead).length;
    if (active >= 3) return;
    this.nextShot = now + GAME_CONFIG.gunCooldown;
    this.muzzle = 1;
    const angle = this.body.angle;
    const dist = this.radius + 26;
    const x = this.x + Math.cos(angle) * dist;
    const y = this.y + Math.sin(angle) * dist;
    const body = this.scene.matter.add.circle(x, y, 5, {
      restitution: 0.86,
      friction: 0,
      frictionAir: 0,
      density: 0.0004,
      label: 'bullet',
      collisionFilter: { category: 0x0004, mask: 0x0001 },
    });
    body.owner = this;
    body.bounces = 0;
    body.born = now;
    this.scene.matter.body.setVelocity(body, {
      x: Math.cos(angle) * GAME_CONFIG.bulletSpeed,
      y: Math.sin(angle) * GAME_CONFIG.bulletSpeed,
    });
    this.scene.bullets.push(body);
    SFX.shot();
  }

  damage(amount, attacker) {
    if (!this.alive) return;
    if (this.scene.time.now < (this.scene.graceUntil || 0)) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flash = 1;
    SFX.hit();
    if (this.isPlayer) this.scene.cameras.main.shake(90, 0.004);
    if (this.hp <= 0) this.die(attacker);
  }

  die(attacker) {
    if (!this.alive) return;
    this.alive = false;
    if (attacker && attacker.alive !== false) attacker.kills += 1;
    this.scene.bursts(this.x, this.y, this.color, 16);
    this.scene.cameras.main.shake(140, 0.008);
    SFX.boom();
    this.gfx.destroy();
    this.label.destroy();
    this.scene.queueRemove(this.body);
    this.scene.onFighterDown(this);
  }

  draw() {
    if (!this.alive) return;
    const g = this.gfx;
    const x = this.x;
    const y = this.y;
    const angle = this.body.angle;
    g.clear();

    g.fillStyle(this.color, 0.18);
    g.fillCircle(x, y, this.radius + 8);

    if (this.weapon === 'sword') {
      const reach = this.radius + GAME_CONFIG.swordReach;
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        g.lineStyle(4, this.color, 0.12 + i * 0.08);
        g.lineBetween(x, y, p.x, p.y);
      }
      const x2 = x + Math.cos(angle) * reach;
      const y2 = y + Math.sin(angle) * reach;
      g.lineStyle(7, 0xfff6df, 0.95);
      g.lineBetween(x + Math.cos(angle) * this.radius, y + Math.sin(angle) * this.radius, x2, y2);
      g.fillStyle(0xfff6df, 1);
      g.fillCircle(x2, y2, 3);
    } else {
      const bx = x + Math.cos(angle) * (this.radius + 8);
      const by = y + Math.sin(angle) * (this.radius + 8);
      const tx = x + Math.cos(angle) * (this.radius + 24);
      const ty = y + Math.sin(angle) * (this.radius + 24);
      g.lineStyle(8, 0x222222, 1);
      g.lineBetween(bx, by, tx, ty);
      g.lineStyle(3, this.color, 1);
      g.lineBetween(bx, by, tx, ty);
      if (this.muzzle > 0) {
        g.fillStyle(0xfff3bf, this.muzzle);
        g.fillCircle(tx, ty, 7);
        this.muzzle -= 0.15;
      }
    }

    g.fillStyle(this.flash > 0 ? 0xffffff : this.color, 1);
    g.fillCircle(x, y, this.radius);
    g.lineStyle(3, 0xffffff, 0.85);
    g.strokeCircle(x, y, this.radius);

    const nx = Math.cos(angle + Math.PI / 2);
    const ny = Math.sin(angle + Math.PI / 2);
    g.fillStyle(0x111111, 0.55);
    g.fillCircle(x + nx * 7, y + ny * 7, 4);
    g.fillCircle(x - nx * 7, y - ny * 7, 4);

    const hpT = this.hp / this.maxHp;
    g.fillStyle(0x000000, 0.65);
    g.fillRoundedRect(x - 18, y - this.radius - 16, 36, 5, 2);
    g.fillStyle(hpT > 0.4 ? 0x7dffb3 : 0xff5d73, 1);
    g.fillRoundedRect(x - 18, y - this.radius - 16, 36 * hpT, 5, 2);

    this.label.setPosition(x, y + this.radius + 14);
    if (this.flash > 0) this.flash -= 0.08;
  }
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
