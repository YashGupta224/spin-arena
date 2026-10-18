/**
 * Arena settings. Add ?debug or ?test to the URL for hitboxes and window.__GAME__.
 */
const GAME_CONFIG = {
  width: 960,
  height: 640,
  wall: 40,
  fighterRadius: 20,
  fighterHp: 140,
  swordDamage: 9,
  swordReach: 42,
  swordCooldown: 700,
  bulletDamage: 8,
  bulletSpeed: 8,
  gunCooldown: 900,
  maxSpeed: 6.2,
  testMode: new URLSearchParams(window.location.search).has('test'),
  debug: new URLSearchParams(window.location.search).has('debug'),
};

/** The only two ball types. The menu lets you pick one of each role. */
const BALL_TYPES = {
  sword: {
    id: 'sword',
    weapon: 'sword',
    name: 'SWORD',
    blurb: 'Blade spins with the ball',
    color: 0xff4d6d,
    alt: 0xc77dff,
    spin: 0.034,
  },
  gun: {
    id: 'gun',
    weapon: 'gun',
    name: 'GUN',
    blurb: 'Shots bounce off the walls',
    color: 0x3ee0ff,
    alt: 0xffe066,
    spin: 0.016,
  },
};
