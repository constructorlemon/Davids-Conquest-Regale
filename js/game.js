let engine, scene, camera;
let playerSide = 1; // 1 = host (bottom), 2 = client (top)
let units = [];
let towers = [];
let projectiles = [];
let botTimer = 0;
let botElixir = 5;
let botLastElixirTick = 0;
let bridgeX = [-8, 8];
let matchOver = false;
let lastDisplayedElixir = -1;
let elixir = 5;
let cardPage = 0;
let selectedCard = 0;
let lastElixirTick = 0;

const cards = [
    { name: 'Warrior', cost: 1, damage: 12, range: 1.4, health: 100, speed: .05 },
    { name: 'Knight', cost: 3, damage: 26, range: 1.5, health: 220, speed: .035 },
    { name: 'Ranger', cost: 2, damage: 18, range: 5, health: 70, speed: .04 },
    { name: 'Brute', cost: 4, damage: 42, range: 1.5, health: 360, speed: .025 },
    { name: 'Scout', cost: 1, damage: 8, range: 1.2, health: 55, speed: .08 },
    { name: 'Guard', cost: 3, damage: 20, range: 2, health: 180, speed: .04 },
    { name: 'Mage', cost: 4, damage: 35, range: 6, health: 80, speed: .03 },
    { name: 'Champion', cost: 5, damage: 55, range: 1.8, health: 500, speed: .02 }
];

function initGame(host) {
    playerSide = host ? 1 : 2;
    
    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true);
    scene = new BABYLON.Scene(engine);
    
    // Camera - top down view
    camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 50, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 30;
    camera.upperRadiusLimit = 70;
    
    // Lighting
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;
    
    createMap();
    createTowers();
    setupCardBar();
    lastElixirTick = performance.now();
    if (typeof singlePlayerMode !== 'undefined' && singlePlayerMode) botTimer = performance.now();
    botLastElixirTick = performance.now();
    
    engine.runRenderLoop(() => {
        scene.render();
        updateUnits();
        updateProjectiles();
    });
    
    window.addEventListener('resize', () => {
        engine.resize();
    });
}

function createMap() {
    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 30, height: 40}, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3);
    ground.material = groundMat;
    
    // River
    const river = BABYLON.MeshBuilder.CreateGround("river", {width: 30, height: 8}, scene);
    river.position.y = 0.01;
    const riverMat = new BABYLON.StandardMaterial("riverMat", scene);
    riverMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
    river.material = riverMat;
    
    // Bridges (2 bridges)
    createBridge(-8, 0);
    createBridge(8, 0);
    
    // Player 1 area (bottom)
    const p1Area = BABYLON.MeshBuilder.CreateGround("p1Area", {width: 30, height: 16}, scene);
    p1Area.position.z = -12;
    p1Area.position.y = 0.005;
    const p1Mat = new BABYLON.StandardMaterial("p1Mat", scene);
    p1Mat.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.3);
    p1Area.material = p1Mat;
    
    // Player 2 area (top)
    const p2Area = BABYLON.MeshBuilder.CreateGround("p2Area", {width: 30, height: 16}, scene);
    p2Area.position.z = 12;
    p2Area.position.y = 0.005;
    const p2Mat = new BABYLON.StandardMaterial("p2Mat", scene);
    p2Mat.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3);
    p2Area.material = p2Mat;
}

function createBridge(x, z) {
    const bridge = BABYLON.MeshBuilder.CreateBox("bridge", {width: 6, height: 0.5, depth: 8}, scene);
    bridge.position = new BABYLON.Vector3(x, 0.25, z);
    const bridgeMat = new BABYLON.StandardMaterial("bridgeMat", scene);
    bridgeMat.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
    bridge.material = bridgeMat;
}

function createTowers() {
    [-8, 8].forEach(x => createTower(x, -16, 1));
    [-8, 8].forEach(x => createTower(x, 16, 2));
}

function createTower(x, z, side) {
    const tower = new BABYLON.TransformNode('tower', scene);
    tower.position = new BABYLON.Vector3(x, 1.5, z);
    const mat = makeMaterial('towerMat', side === 1 ? new BABYLON.Color3(.1, .25, .8) : new BABYLON.Color3(.8, .15, .15));
    const base = BABYLON.MeshBuilder.CreateCylinder('towerBase', {diameter: 2.7, height: 2.2, tessellation: 6}, scene);
    base.parent = tower;
    base.material = mat;
    const roof = BABYLON.MeshBuilder.CreateCylinder('towerRoof', {diameter: 3.1, height: .55, tessellation: 6}, scene);
    roof.parent = tower;
    roof.position.y = 1.35;
    roof.material = mat;
    tower.side = side;
    tower.health = 500;
    tower.maxHealth = 500;
    tower.healthBar = createHealthBar(tower, 3.25, tower.maxHealth, .95);
    updateHealthBar(tower);
    towers.push(tower);
}

function makeMaterial(name, color) {
    const material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = color;
    return material;
}

function createHealthBar(parent, y, maxHealth, width) {
    const background = BABYLON.MeshBuilder.CreateBox('healthBarBackground', {width, height: .16, depth: .06}, scene);
    background.parent = parent;
    background.position.y = y;
    background.material = makeMaterial('healthBarBackgroundMat', new BABYLON.Color3(.08, .04, .04));
    const foreground = BABYLON.MeshBuilder.CreateBox('healthBar', {width: width - .04, height: .1, depth: .08}, scene);
    foreground.parent = parent;
    foreground.position.y = y;
    foreground.position.z = -.05;
    foreground.material = makeMaterial('healthBarMat', new BABYLON.Color3(.1, .9, .2));
    const label = BABYLON.MeshBuilder.CreatePlane('healthNumber', {width: .75, height: .3}, scene);
    label.parent = parent;
    label.position.y = y + .25;
    label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const texture = new BABYLON.DynamicTexture('healthNumberTexture', {width: 256, height: 96}, scene, false);
    texture.hasAlpha = true;
    const labelMaterial = new BABYLON.StandardMaterial('healthNumberMaterial', scene);
    labelMaterial.diffuseTexture = texture;
    labelMaterial.useAlphaFromDiffuseTexture = true;
    label.material = labelMaterial;
    return { foreground, label, texture, maxHealth, width: width - .04 };
}

function updateHealthBar(entity) {
    if (!entity.healthBar || entity.isDisposed()) return;
    const ratio = Math.max(0, Math.min(1, entity.health / entity.healthBar.maxHealth));
    entity.healthBar.foreground.scaling.x = ratio;
    entity.healthBar.foreground.position.x = -(entity.healthBar.width * (1 - ratio)) / 2;
    entity.healthBar.foreground.material.diffuseColor = ratio < .3 ? new BABYLON.Color3(.9, .1, .08) : new BABYLON.Color3(.1, .9, .2);
    entity.healthBar.texture.clear();
    entity.healthBar.texture.drawText(String(Math.max(0, Math.ceil(entity.health))), null, 68, 'bold 54px Arial', 'white', 'transparent', true);
}

function setupCardBar() {
    document.getElementById('previousCards').onclick = () => { cardPage = Math.max(0, cardPage - 1); renderCards(); };
    document.getElementById('nextCards').onclick = () => { cardPage = Math.min(1, cardPage + 1); renderCards(); };
    renderCards();
}

function renderCards() {
    const hand = document.getElementById('cardHand');
    hand.innerHTML = '';
    cards.slice(cardPage * 4, cardPage * 4 + 4).forEach((card, index) => {
        const cardButton = document.createElement('button');
        cardButton.className = 'card' + (selectedCard === cardPage * 4 + index ? ' selected' : '') + (elixir < card.cost ? ' unaffordable' : '');
        cardButton.innerHTML = `<strong>${card.name}</strong><small>◆ ${card.cost}</small>`;
        cardButton.onclick = () => { selectedCard = cardPage * 4 + index; showCardInfo(card); renderCards(); };
        hand.appendChild(cardButton);
    });
    updateElixirMeter();
}

function updateElixirMeter() {
    document.getElementById('elixirDisplay').textContent = `Elixir: ${Math.floor(elixir)} / 10`;
    document.getElementById('elixirFill').style.width = `${Math.min(100, elixir * 10)}%`;
}

function showCardInfo(card) {
    document.getElementById('cardInfo').textContent = `${card.name} — Damage ${card.damage} | Range ${card.range} | Health ${card.health} | Cost ${card.cost}`;
}

function spawnSelectedCard() {
    const card = cards[selectedCard];
    if (elixir < card.cost) return;
    elixir -= card.cost;
    spawnUnit(card, playerSide, true);
    renderCards();
}

function spawnUnit(card, side, broadcast) {
    const warrior = createCharacter(card, side, card.name);
    if (side === 1) {
        warrior.position = new BABYLON.Vector3((Math.random() - 0.5) * 10, 0.5, -18);
        warrior.side = 1;
    } else {
        warrior.position = new BABYLON.Vector3((Math.random() - 0.5) * 10, 0.5, 18);
        warrior.side = 2;
    }
    units.push(warrior);
    
    // Send to opponent
    if (broadcast && typeof sendNetworkData === 'function') {
        sendNetworkData({
            type: 'spawnUnit',
            unitType: card.name,
            position: {x: warrior.position.x, y: warrior.position.y, z: warrior.position.z},
            side: warrior.side
        });
    }
    return warrior;
}

function spawnUnitFromNetwork(unitType, position, side) {
    const card = cards.find(item => item.name === unitType) || cards[0];
    const warrior = createCharacter(card, side, card.name + '_net');
    warrior.position = new BABYLON.Vector3(position.x, position.y, position.z);
    warrior.side = side;
    units.push(warrior);
}

function createCharacter(card, side, name) {
    const character = new BABYLON.TransformNode(name, scene);
    const teamColor = side === 1 ? new BABYLON.Color3(.08, .25, .95) : new BABYLON.Color3(.95, .12, .1);
    const body = BABYLON.MeshBuilder.CreateCylinder(name + '_body', {diameter: .72, height: .9, tessellation: 8}, scene);
    body.parent = character;
    body.position.y = .65;
    body.material = makeMaterial(name + '_bodyMat', teamColor);
    const head = BABYLON.MeshBuilder.CreateSphere(name + '_head', {diameter: .55, segments: 10}, scene);
    head.parent = character;
    head.position.y = 1.35;
    head.material = makeMaterial(name + '_skinMat', new BABYLON.Color3(1, .72, .5));
    addOutfit(character, card.name, teamColor, name);
    [-.2, .2].forEach(x => {
        const leg = BABYLON.MeshBuilder.CreateBox(name + '_leg', {width: .2, height: .55, depth: .25}, scene);
        leg.parent = character;
        leg.position.set(x, .12, 0);
        leg.material = makeMaterial(name + '_legMat', new BABYLON.Color3(.12, .12, .18));
    });
    const weaponMaterial = makeMaterial(name + '_weaponMat', new BABYLON.Color3(.8, .75, .65));
    let weapon;
    if (card.name === 'Ranger') {
        weapon = BABYLON.MeshBuilder.CreateTorus(name + '_bow', {diameter: .8, thickness: .09, tessellation: 12, arc: .7}, scene);
        weapon.rotation.z = Math.PI / 2;
        weapon.position.set(.52, .85, 0);
        weapon.material = makeMaterial(name + '_bowMat', new BABYLON.Color3(.45, .2, .06));
        const arrow = BABYLON.MeshBuilder.CreateBox(name + '_arrow', {width: .06, height: .8, depth: .06}, scene);
        arrow.parent = character;
        arrow.position.set(.52, .85, -.02);
        arrow.rotation.z = Math.PI / 2;
        arrow.material = weaponMaterial;
    } else if (card.name === 'Mage') {
        weapon = BABYLON.MeshBuilder.CreateCylinder(name + '_staff', {diameter: .1, height: 1.3, tessellation: 8}, scene);
        weapon.position.set(.48, .75, 0);
        weapon.material = makeMaterial(name + '_staffMat', new BABYLON.Color3(.3, .12, .45));
        const crystal = BABYLON.MeshBuilder.CreateSphere(name + '_crystal', {diameter: .3, segments: 8}, scene);
        crystal.parent = character;
        crystal.position.set(.48, 1.45, 0);
        crystal.material = makeMaterial(name + '_crystalMat', new BABYLON.Color3(1, .2, .03));
    } else if (card.name === 'Brute' || card.name === 'Champion') {
        weapon = BABYLON.MeshBuilder.CreateBox(name + '_hammer', {width: .28, height: 1.35, depth: .28}, scene);
        weapon.position.set(.58, .72, 0);
        weapon.rotation.z = -.55;
        weapon.material = makeMaterial(name + '_hammerMat', new BABYLON.Color3(.25, .28, .32));
    } else {
        weapon = BABYLON.MeshBuilder.CreateBox(name + '_sword', {width: .12, height: 1.05, depth: .12}, scene);
        weapon.position.set(.58, .7, 0);
        weapon.rotation.z = -.6;
        weapon.material = weaponMaterial;
        if (card.name === 'Guard' || card.name === 'Knight') {
            const shield = BABYLON.MeshBuilder.CreateCylinder(name + '_shield', {diameter: .58, height: .12, tessellation: 8}, scene);
            shield.parent = character;
            shield.position.set(-.48, .72, 0);
            shield.rotation.x = Math.PI / 2;
            shield.material = makeMaterial(name + '_shieldMat', teamColor);
        }
    }
    weapon.parent = character;
    character.weapon = weapon;
    character.cardName = card.name;
    character.speed = card.speed;
    character.damage = card.damage;
    character.attackRange = card.range;
    character.health = card.health;
    character.maxHealth = card.health;
    character.target = null;
    character.healthBar = createHealthBar(character, 1.85, card.health, .85);
    updateHealthBar(character);
    return character;
}

function addOutfit(character, cardName, teamColor, name) {
    if (cardName === 'Brute') {
        const fur = BABYLON.MeshBuilder.CreateCylinder(name + '_furTunic', {diameterTop: .55, diameterBottom: 1.05, height: 1, tessellation: 8}, scene);
        fur.parent = character;
        fur.position.y = .62;
        fur.material = makeMaterial(name + '_furMat', new BABYLON.Color3(.38, .2, .08));
        const belt = BABYLON.MeshBuilder.CreateTorus(name + '_belt', {diameter: .86, thickness: .1, tessellation: 10}, scene);
        belt.parent = character;
        belt.position.y = .38;
        belt.scaling.y = .45;
        belt.material = makeMaterial(name + '_beltMat', new BABYLON.Color3(.16, .08, .03));
        const hair = BABYLON.MeshBuilder.CreateSphere(name + '_wildHair', {diameter: .7, segments: 7}, scene);
        hair.parent = character;
        hair.position.y = 1.58;
        hair.scaling.y = .7;
        hair.material = makeMaterial(name + '_hairMat', new BABYLON.Color3(.16, .07, .025));
    } else if (cardName === 'Mage') {
        const cloak = BABYLON.MeshBuilder.CreateCylinder(name + '_cloak', {diameterTop: .38, diameterBottom: 1.05, height: 1.25, tessellation: 8}, scene);
        cloak.parent = character;
        cloak.position.y = .62;
        cloak.material = makeMaterial(name + '_cloakMat', new BABYLON.Color3(.2, .06, .38));
        const hat = BABYLON.MeshBuilder.CreateCylinder(name + '_wizardHat', {diameterTop: 0, diameterBottom: .85, height: 1.05, tessellation: 8}, scene);
        hat.parent = character;
        hat.position.y = 1.85;
        hat.material = makeMaterial(name + '_hatMat', new BABYLON.Color3(.16, .03, .3));
        const brim = BABYLON.MeshBuilder.CreateCylinder(name + '_hatBrim', {diameter: 1, height: .12, tessellation: 12}, scene);
        brim.parent = character;
        brim.position.y = 1.48;
        brim.material = hat.material;
    } else if (cardName === 'Ranger' || cardName === 'Scout') {
        const hood = BABYLON.MeshBuilder.CreateCylinder(name + '_hood', {diameterTop: .35, diameterBottom: .8, height: .55, tessellation: 8}, scene);
        hood.parent = character;
        hood.position.y = 1.4;
        hood.material = makeMaterial(name + '_hoodMat', new BABYLON.Color3(.1, .35, .18));
        const sash = BABYLON.MeshBuilder.CreateTorus(name + '_sash', {diameter: .82, thickness: .08, tessellation: 10}, scene);
        sash.parent = character;
        sash.position.y = .65;
        sash.scaling.y = .5;
        sash.material = makeMaterial(name + '_sashMat', new BABYLON.Color3(.75, .55, .12));
    } else if (cardName === 'Knight' || cardName === 'Guard' || cardName === 'Champion') {
        const armor = BABYLON.MeshBuilder.CreateCylinder(name + '_armor', {diameterTop: .65, diameterBottom: .82, height: .95, tessellation: 8}, scene);
        armor.parent = character;
        armor.position.y = .68;
        armor.material = makeMaterial(name + '_armorMat', new BABYLON.Color3(.42, .45, .5));
        const plume = BABYLON.MeshBuilder.CreateCylinder(name + '_plume', {diameterTop: 0, diameterBottom: .28, height: .5, tessellation: 6}, scene);
        plume.parent = character;
        plume.position.y = 1.75;
        plume.material = makeMaterial(name + '_plumeMat', teamColor);
    } else {
        const tunic = BABYLON.MeshBuilder.CreateCylinder(name + '_tunic', {diameterTop: .6, diameterBottom: .85, height: .95, tessellation: 8}, scene);
        tunic.parent = character;
        tunic.position.y = .65;
        tunic.material = makeMaterial(name + '_tunicMat', teamColor);
    }
}

function updateUnits() {
    if (matchOver) return;
    const now = performance.now();
    const elapsed = now - lastElixirTick;
    if (elapsed > 0) {
        elixir = Math.min(10, elixir + elapsed / 2500);
        lastElixirTick = now;
        updateElixirMeter();
        if (Math.floor(elixir) !== lastDisplayedElixir) {
            lastDisplayedElixir = Math.floor(elixir);
            renderCards();
        }
    }
    const botElapsed = now - botLastElixirTick;
    if (botElapsed > 0) {
        botElixir = Math.min(10, botElixir + botElapsed / 2500);
        botLastElixirTick = now;
    }
    if (typeof singlePlayerMode !== 'undefined' && singlePlayerMode && performance.now() - botTimer > 1800) {
        botTimer = performance.now();
        const choices = cards.filter(card => card.cost <= botElixir && (card.name === 'Champion' || card.name === 'Brute' || Math.random() < .2));
        if (choices.length) {
            const botCard = choices[Math.floor(Math.random() * choices.length)];
            botElixir -= botCard.cost;
            const botUnit = spawnUnit(botCard, 2, false);
            botUnit.health *= 1.25;
            botUnit.maxHealth = botUnit.health;
            botUnit.healthBar.maxHealth = botUnit.health;
            updateHealthBar(botUnit);
        }
    }
    for (let i = units.length - 1; i >= 0; i--) {
        const unit = units[i];
        if (unit.health <= 0) {
            unit.dispose();
            units.splice(i, 1);
            continue;
        }
        const nearbyEnemy = units.filter(other => other !== unit && other.side !== unit.side && !other.isDisposed())
            .sort((a, b) => BABYLON.Vector3.Distance(unit.position, a.position) - BABYLON.Vector3.Distance(unit.position, b.position))[0];
        const nearbyEnemyDistance = nearbyEnemy ? BABYLON.Vector3.Distance(unit.position, nearbyEnemy.position) : Infinity;
        // Enemy troops always take priority over towers once they are close enough.
        if (nearbyEnemy && nearbyEnemyDistance < 16) {
            unit.target = nearbyEnemy;
        } else if (!unit.target || unit.target.isDisposed()) {
            const enemyTower = towers.filter(t => !t.isDisposed() && t.side !== unit.side)
                .sort((a, b) => BABYLON.Vector3.Distance(unit.position, a.position) - BABYLON.Vector3.Distance(unit.position, b.position))[0];
            unit.target = enemyTower;
        }
        if (unit.target) {
            const distance = BABYLON.Vector3.Distance(unit.position, unit.target.position);
            if (distance > unit.attackRange + 1) {
                let destination = unit.target.position;
                // Cross the river using the nearest bridge before approaching the tower.
                const crossingRiver = (unit.side === 1 && unit.target.position.z > 0) || (unit.side === 2 && unit.target.position.z < 0);
                if (Math.abs(unit.position.z) < 4 && crossingRiver) {
                    const nearestBridge = bridgeX.reduce((best, x) => Math.abs(x - unit.position.x) < Math.abs(best - unit.position.x) ? x : best, bridgeX[0]);
                    destination = new BABYLON.Vector3(nearestBridge, unit.position.y, unit.side === 1 ? 4 : -4);
                }
                const direction = destination.subtract(unit.position).normalize();
                unit.position.addInPlace(direction.scale(unit.speed));
            } else if (!unit.lastAttack || performance.now() - unit.lastAttack > 700) {
                unit.target.health -= unit.damage;
                unit.lastAttack = performance.now();
                unit.attackStarted = performance.now();
                updateHealthBar(unit.target);
                if (unit.cardName === 'Ranger' || unit.cardName === 'Mage') createProjectile(unit);
                if (unit.target.health <= 0) {
                    const defeated = unit.target;
                    defeated.dispose();
                    if (units.includes(defeated)) units.splice(units.indexOf(defeated), 1);
                    if (towers.includes(defeated)) towers.splice(towers.indexOf(defeated), 1);
                    checkMatchResult();
                }
            }
            if (unit.attackStarted && unit.weapon) {
                const attackProgress = (performance.now() - unit.attackStarted) / 260;
                unit.weapon.rotation.z = -.6 + (attackProgress < 1 ? Math.sin(attackProgress * Math.PI) * 1.5 : 0);
            }
        }
        
        // Remove units that go too far
        if (Math.abs(unit.position.z) > 25) {
            unit.dispose();
            units.splice(i, 1);
        }
    }
    updateTowerAttacks();
}

function updateTowerAttacks() {
    const now = performance.now();
    towers.forEach(tower => {
        if (tower.isDisposed()) return;
        const target = units.filter(unit => unit.side !== tower.side && !unit.isDisposed())
            .sort((a, b) => BABYLON.Vector3.Distance(tower.position, a.position) - BABYLON.Vector3.Distance(tower.position, b.position))[0];
        if (!target || BABYLON.Vector3.Distance(tower.position, target.position) > 5) return;
        if (!tower.lastAttack || now - tower.lastAttack > 800) {
            tower.lastAttack = now;
            target.health -= 18;
            updateHealthBar(target);
            if (target.health <= 0) {
                target.dispose();
                const index = units.indexOf(target);
                if (index >= 0) units.splice(index, 1);
            }
        }
    });
}

function checkMatchResult() {
    if (matchOver) return;
    const playerTowers = towers.filter(tower => !tower.isDisposed() && tower.side === 1);
    const enemyTowers = towers.filter(tower => !tower.isDisposed() && tower.side === 2);
    if (!enemyTowers.length) endMatch(true);
    else if (!playerTowers.length) endMatch(false);
}

function endMatch(playerWon) {
    matchOver = true;
    document.getElementById('resultTitle').textContent = playerWon ? 'Victory!' : 'Defeat';
    document.getElementById('resultMessage').textContent = playerWon ? 'You destroyed every enemy tower.' : 'The opponent overwhelmed your arena.';
    document.getElementById('resultScreen').style.display = 'block';
}

function createProjectile(unit) {
    const isMage = unit.cardName === 'Mage';
    const projectile = isMage
        ? BABYLON.MeshBuilder.CreateSphere('fireball', {diameter: .28, segments: 8}, scene)
        : BABYLON.MeshBuilder.CreateBox('arrowProjectile', {width: .08, height: .55, depth: .08}, scene);
    projectile.position = unit.position.add(new BABYLON.Vector3(.5, 1, 0));
    projectile.material = makeMaterial('projectileMat', isMage ? new BABYLON.Color3(1, .18, .02) : new BABYLON.Color3(.45, .2, .06));
    projectile.projectileTarget = unit.target;
    projectile.projectileStarted = performance.now();
    projectiles.push(projectile);
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        if (!projectile.projectileTarget || projectile.projectileTarget.isDisposed()) {
            projectile.dispose();
            projectiles.splice(i, 1);
            continue;
        }
        const direction = projectile.projectileTarget.position.add(new BABYLON.Vector3(0, 1, 0)).subtract(projectile.position);
        if (direction.length() < .5 || performance.now() - projectile.projectileStarted > 900) {
            projectile.dispose();
            projectiles.splice(i, 1);
        } else {
            projectile.position.addInPlace(direction.normalize().scale(.18));
            if (projectile.name.indexOf('arrow') >= 0) projectile.rotation.z = Math.atan2(direction.y, direction.x);
        }
    }
}

document.getElementById('gameUI').addEventListener('click', event => {
    if (event.target.closest('.card')) spawnSelectedCard();
});

document.getElementById('playAgain').addEventListener('click', () => window.location.reload());
