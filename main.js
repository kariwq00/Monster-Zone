const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Меню
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const skinsBtn = document.getElementById('skinsBtn');
const arenaBtn = document.getElementById('arenaBtn');

const skinsMenu = document.getElementById('skinsMenu');
const arenaMenu = document.getElementById('arenaMenu');
const backFromSkins = document.getElementById('backFromSkins');
const backFromArena = document.getElementById('backFromArena');
const achievementsBtn = document.getElementById('achievementsBtn');
const questsBtn = document.getElementById('questsBtn');
const achievementsMenu = document.getElementById('achievementsMenu');
const questsMenu = document.getElementById('questsMenu');
const achievementsList = document.getElementById('achievementsList');
const questsList = document.getElementById('questsList');
const backFromAchievements = document.getElementById('backFromAchievements');
const backFromQuests = document.getElementById('backFromQuests');

// Мобильные элементы управления
const mobileControls = document.getElementById('mobileControls');
const moveUpBtn = document.getElementById('moveUp');
const moveDownBtn = document.getElementById('moveDown');
const moveLeftBtn = document.getElementById('moveLeft');
const moveRightBtn = document.getElementById('moveRight');
const btnSword = document.getElementById('btnSword');
const btnFists = document.getElementById('btnFists');
const btnGun = document.getElementById('btnGun');

const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

let currentSkin = 'blue';
let currentArena = 'forest';

let enemies = [];
let killedEnemies = 0;
let coinsOnMap = [];
let bullets = [];

// Управление
let keys = {};
document.addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
document.addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);
// Мышь и атака: ПК — левая = меч/кулаки, правая = выстрел
let mouse = { x: 0, y: 0, leftDown: false, rightDown: false };
let touchAttack = false;
let lastShotTime = 0;
const SHOT_COOLDOWN = 250;

function updateMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
}

canvas.addEventListener('mousedown', e => {
    updateMousePosition(e);
    if (e.button === 0) mouse.leftDown = true;
    if (e.button === 2) {
        e.preventDefault();
        mouse.rightDown = true;
        if (typeof player !== 'undefined') shootBullet();
    }
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.leftDown = false;
    if (e.button === 2) mouse.rightDown = false;
});
canvas.addEventListener('mousemove', updateMousePosition);
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Загрузка изображений
const images = {};
function loadImage(name, src){ const img = new Image(); img.src = src; images[name] = img; }

// Скины игрока
loadImage('player_blue','assets/player_blue.png');
loadImage('player_red','assets/player_red.png');
loadImage('player_green','assets/player_green.png');

// Враги
loadImage('enemy_red','assets/enemy_red.png');
loadImage('enemy_boss','assets/enemy_boss.png');

// Арены
loadImage('arena_forest','assets/arena_forest.png');
loadImage('arena_desert','assets/arena_desert.png');
loadImage('arena_ice','assets/arena_ice.png');

// Монета
loadImage('coin','assets/coin.png');

// Достижения
let achievements = [
    {name:'Собрать 50 монет', goal:50, reward:10, done:false},
    {name:'Убить 5 врагов', goal:5, reward:5, done:false}
];

// Квесты
let quests = [
    {name:'Победить босса', done:false}
];

// Спавн врагов (преследуют игрока, чуть медленнее)
const ENEMY_SPEED = 0.85;
function spawnEnemy(isBoss=false){
    let x = Math.random()*(canvas.width-100);
    let y = -100;
    enemies.push({x, y, width:100, height:100, hp: isBoss ? 200 : 60, isBoss, speed: isBoss ? 0.55 : ENEMY_SPEED});
}

// Спавн монеты
function spawnCoin(x,y){ coinsOnMap.push({x, y, width:20, height:20}); }

// Движение игрока
function movePlayer(){
    if(keys['w']||keys['arrowup']) player.y -= player.speed;
    if(keys['s']||keys['arrowdown']) player.y += player.speed;
    if(keys['a']||keys['arrowleft']) player.x -= player.speed;
    if(keys['d']||keys['arrowright']) player.x += player.speed;

    // Ограничение по экрану
    player.x = Math.max(0, Math.min(canvas.width-player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height-player.height, player.y));
}

// Атака врагов и выстрелы
function shootBullet(){
    if (typeof player === 'undefined') return;
    const now = performance.now();
    if(now - lastShotTime < SHOT_COOLDOWN) return;
    lastShotTime = now;

    const startX = player.x + player.width / 2;
    const startY = player.y + player.height / 2;

    let dirX = 0;
    let dirY = -1;

    const dx = mouse.x - startX;
    const dy = mouse.y - startY;
    const len = Math.hypot(dx, dy);
    if(len > 0){
        dirX = dx / len;
        dirY = dy / len;
    }

    const gunDamage = 15;
    bullets.push({
        x: startX,
        y: startY,
        vx: dirX * 12,
        vy: dirY * 12,
        size: 10,
        damage: gunDamage
    });
}

function attackEnemies() {
    // ПК: левая кнопка — ближний бой (меч/кулаки)
    const meleeActive = mouse.leftDown || (touchAttack && (player.weapon === 'sword' || player.weapon === 'fists'));
    // Мобильный пистолет: удержание кнопки — стрельба с кулдауном
    const gunActive = touchAttack && player.weapon === 'gun';

    if (gunActive) {
        shootBullet();
        return;
    }
    if (!meleeActive) return;

    // Ближний бой (меч и кулаки)
    enemies.forEach((e, index) => {
        if (player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y) {
            e.hp -= player.attackPower;
            if (e.hp <= 0) {
                enemies.splice(index, 1);
                killedEnemies++;
                spawnCoin(e.x, e.y);
            }
        }
    });
}

function updateBullets(){
    for(let i = bullets.length - 1; i >= 0; i--){
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        let removeBullet = false;

        for(let j = enemies.length - 1; j >= 0; j--){
            const e = enemies[j];
            if(b.x < e.x + e.width &&
               b.x + b.size > e.x &&
               b.y < e.y + e.height &&
               b.y + b.size > e.y){
                e.hp -= b.damage;
                removeBullet = true;
                if(e.hp <= 0){
                    enemies.splice(j,1);
                    killedEnemies++;
                    spawnCoin(e.x,e.y);
                }
                break;
            }
        }

        if(removeBullet ||
           b.x + b.size < 0 || b.x > canvas.width ||
           b.y + b.size < 0 || b.y > canvas.height){
            bullets.splice(i,1);
        }
    }

    // Отрисовка пуль
    ctx.fillStyle = 'yellow';
    bullets.forEach(b=> ctx.fillRect(b.x, b.y, b.size, b.size));
}

// Столкновение с врагом (здоровье уходит медленнее — раз в ~0.5 сек)
let lastDamageTime = 0;
const DAMAGE_COOLDOWN = 500;
const DAMAGE_PER_HIT = 2;
function enemyHitsPlayer(){
    const now = performance.now();
    if (now - lastDamageTime < DAMAGE_COOLDOWN) return;
    let hit = false;
    enemies.forEach(e=>{
        if(player.x < e.x + e.width &&
           player.x + player.width > e.x &&
           player.y < e.y + e.height &&
           player.y + player.height > e.y){
            hit = true;
        }
    });
    if (hit) {
        lastDamageTime = now;
        player.hp -= DAMAGE_PER_HIT;
        if(player.hp<0) player.hp=0;
    }
}

// Проверка достижений
function checkAchievements(){
    achievements.forEach(a=>{
        if(!a.done){
            if(a.name.includes('монет') && player.coins>=a.goal){ a.done=true; player.coins+=a.reward; }
            if(a.name.includes('врагов') && killedEnemies>=a.goal){ a.done=true; player.coins+=a.reward; }
        }
    });
}

// Проверка квестов
function checkQuests(){
    quests.forEach(q=>{
        if(!q.done){
            if(q.name.includes('босса')){
                const bossExists = enemies.some(e=>e.isBoss);
                if(!bossExists && killedEnemies>0){ q.done=true; player.coins+=50; }
            }
        }
    });
}

// Цикл игры
function gameLoop(){
    // фон арены
    const arenaImg = images['arena_'+currentArena];
    ctx.drawImage(arenaImg, 0, 0, canvas.width, canvas.height);

    movePlayer();
    attackEnemies();
    enemyHitsPlayer();
    checkAchievements();
    checkQuests();
    updateBullets();

    // спавн врагов
    if(enemies.length<3) spawnEnemy();

    // Враги бегут за игроком
    enemies.forEach(e=>{
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
            e.x += (dx / len) * e.speed;
            e.y += (dy / len) * e.speed;
        }
        const img = e.isBoss ? images['enemy_boss'] : images['enemy_red'];
        ctx.drawImage(img, e.x, e.y, e.width, e.height);
    });

    // рисуем монеты
    coinsOnMap.forEach(c=>{
        ctx.drawImage(images['coin'], c.x, c.y, c.width, c.height);
        if(player.x < c.x + c.width &&
           player.x + player.width > c.x &&
           player.y < c.y + c.height &&
           player.y + player.height > c.y){
               player.coins++;
               c.collected = true;
           }
    });
    coinsOnMap = coinsOnMap.filter(c=>!c.collected);

    // игрок
    const playerImg = images['player_'+currentSkin];
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

    // HUD
    ctx.fillStyle='white';
    ctx.font='18px Arial';
    ctx.fillText(`Монеты: ${player.coins}`, 10, 20);
    ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 10, 50);
    ctx.fillText(`Убийства: ${killedEnemies}`, 10, 80);

    // Достижения и квесты — компактно
    ctx.font='14px Arial';
    achievements.forEach((a,i)=> ctx.fillText(`${a.done?'✅':'⬜'} ${a.name}`, 552, 28 + i*22));
    quests.forEach((q,i)=> ctx.fillText(`${q.done?'✅':'⬜'} ${q.name}`, 552, 118 + i*22));

    // Конец игры — просто сообщение на экране
    if(player.hp>0){ requestAnimationFrame(gameLoop); }
    else {
        ctx.fillStyle='red';
        ctx.font='36px Arial';
        ctx.fillText(`Игра окончена! Монеты: ${player.coins}, Врагов убито: ${killedEnemies}`, 50, 300);
    }
}

// Старт игры
startBtn.onclick=()=>{
    menu.style.display='none';
    canvas.classList.remove('hidden');
    if(isMobile && mobileControls){
        mobileControls.classList.remove('hidden');
    }
    gameLoop();
};

// Меню скинов и арен
skinsBtn.onclick=()=>{ menu.style.display='none'; skinsMenu.classList.remove('hidden'); };
arenaBtn.onclick=()=>{ menu.style.display='none'; arenaMenu.classList.remove('hidden'); };
backFromSkins.onclick=()=>{ skinsMenu.classList.add('hidden'); menu.style.display='block'; };
backFromArena.onclick=()=>{ arenaMenu.classList.add('hidden'); menu.style.display='block'; };

// Достижения и квесты — круглые кнопки справа
if(achievementsBtn && achievementsMenu && achievementsList){
    achievementsBtn.onclick=()=>{
        menu.style.display='none';
        achievementsList.innerHTML = achievements.map(a=>`<li>${a.done?'✅':'⬜'} ${a.name}</li>`).join('');
        achievementsMenu.classList.remove('hidden');
    };
}
if(backFromAchievements){
    backFromAchievements.onclick=()=>{ achievementsMenu.classList.add('hidden'); menu.style.display='block'; };
}
if(questsBtn && questsMenu && questsList){
    questsBtn.onclick=()=>{
        menu.style.display='none';
        questsList.innerHTML = quests.map(q=>`<li>${q.done?'✅':'⬜'} ${q.name}</li>`).join('');
        questsMenu.classList.remove('hidden');
    };
}
if(backFromQuests){
    backFromQuests.onclick=()=>{ questsMenu.classList.add('hidden'); menu.style.display='block'; };
}

document.querySelectorAll('.skinBtn').forEach(btn=> btn.onclick=()=>{ currentSkin=btn.getAttribute('data-skin'); });
document.querySelectorAll('.arenaBtn').forEach(btn=> btn.onclick=()=>{ currentArena=btn.getAttribute('data-arena'); });

// Игрок
let player = {
    x: 400,
    y: 500,
    width: 100,
    height: 100,
    hp: 100,
    maxHp: 100,
    coins: 0,
    speed: 5,
    weapon: 'sword',   // начальное оружие
    attackPower: 20
};

// Управление оружием
document.addEventListener('keydown', e=>{
    const key = e.key.toLowerCase();
    if(key==='q') { player.weapon='sword'; player.attackPower=20; }
    if(key==='e') { player.weapon='gun'; player.attackPower=15; }
    if(key==='r') { player.weapon='fists'; player.attackPower=10; }
});

// Мобильное управление: виртуальные кнопки
function bindMoveButton(element, key){
    if(!element) return;
    const start = e=>{
        e.preventDefault();
        keys[key] = true;
    };
    const end = e=>{
        e.preventDefault();
        keys[key] = false;
    };
    element.addEventListener('touchstart', start);
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', end);
}

function bindAttackButton(element, weapon){
    if(!element) return;
    const start = e=>{
        e.preventDefault();
        player.weapon = weapon;
        if(weapon === 'sword') player.attackPower = 20;
        if(weapon === 'gun') player.attackPower = 15;
        if(weapon === 'fists') player.attackPower = 10;
        touchAttack = true;
    };
    const end = e=>{
        e.preventDefault();
        touchAttack = false;
    };
    element.addEventListener('touchstart', start);
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', end);
}

bindMoveButton(moveUpBtn, 'w');
bindMoveButton(moveDownBtn, 's');
bindMoveButton(moveLeftBtn, 'a');
bindMoveButton(moveRightBtn, 'd');

bindAttackButton(btnSword, 'sword');
bindAttackButton(btnFists, 'fists');
bindAttackButton(btnGun, 'gun');